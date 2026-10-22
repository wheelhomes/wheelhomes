import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { requireAuth, rateLimit, tooManyRequests } from '@/lib/api-auth';
import { verifyDeterministicOtp } from '@/lib/otp';

export async function POST(req: Request) {
    try {
        const caller = await requireAuth(req);
        if (caller instanceof NextResponse) return caller;

        // Brute force protection: Max 6 verify attempts per 10 minutes per UID
        if (!rateLimit(`verify-attempt:${caller.uid}`, 6, 10 * 60 * 1000)) {
            return tooManyRequests();
        }

        const body = await req.json().catch(() => ({}));
        const code = typeof body?.code === 'string' ? body.code.trim().replace(/\s+/g, '') : '';

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, error: 'Please enter a valid 6-digit verification code' },
                { status: 400 }
            );
        }

        let isCodeValid = false;
        let otpDocRef: any = null;

        // Check 1: Cryptographic Stateless HMAC verification (100% resilient across serverless cold starts & database disconnects)
        if (verifyDeterministicOtp(caller.uid, code)) {
            isCodeValid = true;
        }

        // Check 2: Database OTP verification (if Firestore is accessible)
        try {
            otpDocRef = adminDb()
                .collection('users')
                .doc(caller.uid)
                .collection('private_auth')
                .doc('otp');

            const otpSnap = await otpDocRef.get();
            if (otpSnap.exists) {
                const otpData = otpSnap.data() || {};
                const expiresAt = Number(otpData.expiresAt || 0);
                const attempts = Number(otpData.attempts || 0);

                if (attempts < 5 && Date.now() <= expiresAt) {
                    const inputHash = crypto.createHash('sha256').update(code).digest('hex');
                    const expectedHash = String(otpData.codeHash || '');

                    if (
                        expectedHash &&
                        inputHash.length === expectedHash.length &&
                        crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(expectedHash))
                    ) {
                        isCodeValid = true;
                    } else if (!isCodeValid) {
                        await otpDocRef.update({ attempts: attempts + 1 }).catch(() => {});
                    }
                }
            }
        } catch (dbErr: any) {
            console.warn('[API verify-otp] Firestore OTP lookup notice:', dbErr.message || dbErr);
        }

        if (!isCodeValid) {
            return NextResponse.json(
                { success: false, error: 'Incorrect or expired verification code. Please check your email and try again.' },
                { status: 400 }
            );
        }

        // --- SUCCESSFUL VERIFICATION ---
        // 1. Invalidate database OTP immediately if present
        if (otpDocRef) {
            try {
                await otpDocRef.delete();
            } catch (_) {}
        }

        // 2. Mark Firebase Auth user as email verified
        try {
            await adminAuth().updateUser(caller.uid, { emailVerified: true });
        } catch (authErr: any) {
            console.warn('[API verify-otp] Firebase Auth updateUser notice:', authErr.message || authErr);
        }

        // 3. Update Firestore user document with merge to prevent NOT_FOUND errors
        try {
            const userRef = adminDb().collection('users').doc(caller.uid);
            const userSnap = await userRef.get().catch(() => null);
            const userData = userSnap?.data() || {};

            const userUpdates: Record<string, any> = {
                emailVerified: true,
                verifiedAt: new Date().toISOString(),
            };

            if (!userData.status || userData.status === 'unverified') {
                if (!userData.role || userData.role === 'pending_role_selection') {
                    userUpdates.status = 'verified';
                }
            }

            await userRef.set(userUpdates, { merge: true });
        } catch (dbErr: any) {
            console.warn('[API verify-otp] Firestore user document update notice:', dbErr.message || dbErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Email address successfully verified.',
        });

    } catch (error: any) {
        console.error('[API verify-otp] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
