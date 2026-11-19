import "server-only";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export interface VerifiedCaller {
    uid: string;
    email: string | undefined;
    token: Record<string, any>;
}

/**
 * Verifies the Firebase ID token from the `Authorization: Bearer <token>` header.
 * Returns the caller on success, or a ready-made 401 NextResponse on failure.
 */
export async function requireAuth(req: Request): Promise<VerifiedCaller | NextResponse> {
    const header = req.headers.get("authorization") || "";
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const decoded = await adminAuth().verifyIdToken(match[1]);
        return { uid: decoded.uid, email: decoded.email, token: decoded };
    } catch (e: any) {
        console.error('[requireAuth] verifyIdToken failed:', e.message || e);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

/**
 * Checks whether an already-verified caller has Administrator privileges.
 */
export async function isCallerAdmin(caller: VerifiedCaller): Promise<boolean> {
    // 1. Custom token claim
    if (caller.token.admin === true) {
        return true;
    }

    // 2. Designated superadmin emails (must have verified email)
    const superAdmins = ['admin@wheelhomes.com', 'admin@wheelofcomfort.com'];
    if (
        caller.email &&
        caller.token.email_verified === true &&
        superAdmins.includes(caller.email.toLowerCase())
    ) {
        return true;
    }

    // 3. Firestore 'admins' collection
    try {
        const adminDoc = await adminDb().collection('admins').doc(caller.uid).get();
        if (adminDoc.exists) {
            return true;
        }
    } catch (e) {
        console.warn('[requireAdmin] Error checking admins collection:', e);
    }

    // 4. Firestore 'users' collection with role === 'admin'
    try {
        const userDoc = await adminDb().collection('users').doc(caller.uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
            return true;
        }
    } catch (e) {
        console.warn('[requireAdmin] Error checking users collection:', e);
    }

    return false;
}

/**
 * Ensures the authenticated caller has verified Administrator privileges.
 * Checks custom claims, verified superadmin emails, 'admins' collection, and 'users' admin role.
 */
export async function requireAdmin(req: Request): Promise<VerifiedCaller | NextResponse> {
    const caller = await requireAuth(req);
    if (caller instanceof NextResponse) return caller;

    if (await isCallerAdmin(caller)) {
        return caller;
    }

    return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
}

/**
 * Simple in-memory fixed-window rate limiter (per server instance).
 * For multi-instance production use, back this with Redis/Upstash.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.reset < now) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return true;
    }
    b.count += 1;
    return b.count <= limit;
}

export function tooManyRequests() {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
}

/**
 * Firestore-backed distributed fixed-window rate limiter with in-memory fallback.
 * Persists across serverless cold starts and multiple instances.
 */
export async function rateLimitDistributed(key: string, limit: number, windowMs: number): Promise<boolean> {
    if (!rateLimit(key, limit, windowMs)) {
        return false;
    }

    try {
        const safeId = Buffer.from(key).toString("base64url").slice(0, 120);
        const ref = adminDb().collection("_rate_limits").doc(safeId);
        const now = Date.now();

        return await adminDb().runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? snap.data() || {} : null;
            if (!data || Number(data.reset || 0) < now) {
                tx.set(ref, { count: 1, reset: now + windowMs, updatedAt: now });
                return true;
            }
            const nextCount = Number(data.count || 0) + 1;
            tx.update(ref, { count: nextCount, updatedAt: now });
            return nextCount <= limit;
        });
    } catch {
        // Fallback to in-memory result if Firestore is unavailable
        return true;
    }
}
