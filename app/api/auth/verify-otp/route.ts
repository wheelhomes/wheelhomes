import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { requireAuth, rateLimit, tooManyRequests } from '@/lib/api-auth';

export async function POST(req: Request) {
    try {
        const caller = await requireAuth(req);
        if (caller instanceof NextResponse) return caller;

        // Brute force protection: Max 6 verify attempts per 10 minutes per UID
        if (!rateLimit(`verify-attempt:${caller.uid}`, 6, 10 * 60 * 1000)) {
            return tooManyRequests();
        }

        const body = await req.json().catch(() => ({}));
        const code = typeof body?.code === 'string' ? body.code.trim() : '';

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, error: 'Please enter a valid 6-digit verification code' },
                { status: 400 }
            );
        }

        const otpDocRef = adminDb()
            .collection('users')
            .doc(caller.uid)
            .collection('private_auth')
            .doc('otp');

        const otpSnap = await otpDocRef.get();

        if (!otpSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'No active verification code found. Please request a new code.' },
                { status: 400 }
            );
        }

        const otpData = otpSnap.data() || {};
        const expiresAt = Number(otpData.expiresAt || 0);
        const attempts = Number(otpData.attempts || 0);

        if (attempts >= 5) {
            await otpDocRef.delete();
            return NextResponse.json(
                { success: false, error: 'Too many failed attempts. This code is invalidated. Please request a new code.' },
                { status: 400 }
            );
        }

        if (Date.now() > expiresAt) {
            await otpDocRef.delete();
            return NextResponse.json(
                { success: false, error: 'Verification code has expired. Please request a new code.' },
                { status: 400 }
            );
        }

        // Compare SHA-256 hash
        const inputHash = crypto.createHash('sha256').update(code).digest('hex');
        const expectedHash = String(otpData.codeHash || '');

        if (!crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(expectedHash))) {
            await otpDocRef.update({ attempts: attempts + 1 });
            return NextResponse.json(
                { success: false, error: 'Incorrect verification code. Please check your email and try again.' },
                { status: 400 }
            );
        }

        // --- SUCCESSFUL VERIFICATION ---
        // 1. Invalidate OTP immediately
        await otpDocRef.delete();

        // 2. Mark Firebase Auth as email verified
        try {
            await adminAuth().updateUser(caller.uid, { emailVerified: true });
        } catch (authErr) {
            console.warn('[API verify-otp] Could not update Firebase Auth user:', authErr);
        }

        // 3. Mark Firestore user document
        const userRef = adminDb().collection('users').doc(caller.uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data() || {};

        const userUpdates: Record<string, any> = {
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
        };

        if (!userData.status || userData.status === 'unverified') {
            if (!userData.role || userData.role === 'pending_role_selection') {
                userUpdates.status = 'verified';
            }
        }

        await userRef.update(userUpdates);

        return NextResponse.json({
            success: true,
            message: 'Email address successfully verified.',
        });

    } catch (error: any) {
        console.error('[API verify-otp] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
