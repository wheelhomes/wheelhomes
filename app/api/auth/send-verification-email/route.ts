import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendEmail } from '@/lib/mail';
import { verificationCodeEmailTemplate, verificationCodeEmailText, getAppBaseUrl } from '@/lib/email-templates';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, rateLimit, tooManyRequests } from '@/lib/api-auth';
import { getDeterministicOtp } from '@/lib/otp';

function formatNameFromEmail(email: string): string {
    if (!email) return 'there';
    const local = email.split('@')[0] || '';
    const parts = local.split(/[._\s-]+/).filter(Boolean);
    if (parts.length === 0) return 'there';
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

export async function POST(req: Request) {
    try {
        // Caller must be signed in with a valid Firebase ID token
        const caller = await requireAuth(req);
        if (caller instanceof NextResponse) return caller;

        // Rate limit: max 5 requests per 10 minutes per UID
        if (!rateLimit(`send-verify:${caller.uid}`, 5, 10 * 60 * 1000)) {
            return tooManyRequests();
        }

        const body = await req.json().catch(() => ({}));
        let cleanEmail = (caller.email || body?.email || '').trim();

        // If email not in token or body, resolve from user document
        let userDocData: Record<string, any> | undefined;
        try {
            const userDoc = await adminDb().collection('users').doc(caller.uid).get();
            if (userDoc.exists) {
                userDocData = userDoc.data();
                if (!cleanEmail) {
                    cleanEmail = String(userDocData?.email || '').trim();
                }
            }
        } catch (docErr) {
            console.warn('[API send-verification-email] Warning resolving user doc:', docErr);
        }

        if (!cleanEmail) {
            return NextResponse.json({ success: false, error: 'Account has no email address' }, { status: 400 });
        }

        // Generate cryptographically secure 6-digit OTP code bound to caller UID
        const cleanCode = getDeterministicOtp(caller.uid);
        const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

        // Store hashed code in a private subcollection strictly inaccessible to client SDKs (if Firestore available)
        try {
            await adminDb()
                .collection('users')
                .doc(caller.uid)
                .collection('private_auth')
                .doc('otp')
                .set({
                    codeHash,
                    expiresAt,
                    attempts: 0,
                    createdAt: new Date().toISOString(),
                });
        } catch (dbErr: any) {
            console.warn('[API send-verification-email] Firestore OTP store notice:', dbErr.message || dbErr);
        }

        // Resolve display name for email body
        let cleanName = String(
            userDocData?.fullName || userDocData?.name || userDocData?.displayName || body?.name || ''
        ).trim();
        if (!cleanName) cleanName = formatNameFromEmail(cleanEmail);

        const baseUrl = getAppBaseUrl();
        const verifyUrl = `${baseUrl}/verify-email?code=${encodeURIComponent(cleanCode)}&uid=${encodeURIComponent(caller.uid)}`;

        const html = verificationCodeEmailTemplate(cleanName, cleanCode, verifyUrl);
        const text = verificationCodeEmailText(cleanName, cleanCode, verifyUrl);

        const emailResult = await sendEmail({
            to: cleanEmail,
            subject: `Your Wheel of Comfort Verification Code: ${cleanCode}`,
            html,
            text,
        });

        if (!emailResult.success) {
            return NextResponse.json(
                { success: false, error: 'Failed to send verification email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code dispatched to your email.',
        });
    } catch (error: any) {
        console.error('[API send-verification-email] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
