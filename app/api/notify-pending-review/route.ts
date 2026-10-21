import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { pendingReviewEmailTemplate, pendingReviewEmailText } from '@/lib/email-templates';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, rateLimit, tooManyRequests } from '@/lib/api-auth';

export async function POST(req: Request) {
    try {
        // Caller must be signed in; the recipient is always the caller's own account.
        const caller = await requireAuth(req);
        if (caller instanceof NextResponse) return caller;

        if (!rateLimit(`notify-pending:${caller.uid}`, 3, 60 * 60 * 1000)) return tooManyRequests();

        const uid = caller.uid;
        let email = (caller.email || '').trim();
        let name = '';

        try {
            const userSnap = await adminDb().collection('users').doc(uid).get();
            if (userSnap.exists) {
                const data = userSnap.data() || {};
                email = email || data.email || data.applicationData?.email || '';
                name = data.fullName || data.displayName || data.businessName || '';
            }
        } catch (err) {
            console.warn('[API notify-pending-review] Could not resolve user doc:', err);
        }

        const cleanEmail = String(email).trim();
        const candidateName = String(name || 'Service Provider').slice(0, 100);

        if (!cleanEmail) {
            return NextResponse.json(
                { success: false, error: 'Recipient email is required' },
                { status: 400 }
            );
        }

        const html = pendingReviewEmailTemplate(candidateName);
        const text = pendingReviewEmailText(candidateName);

        const emailResult = await sendEmail({
            to: cleanEmail,
            subject: 'Wheel of Comfort: Successful Onboarding — Your Account is Under Pending Review',
            html,
            text,
        });

        try {
            const nowIso = new Date().toISOString();
            await adminDb().collection('notifications').add({
                userId: uid,
                recipientId: uid,
                title: 'Onboarding Successful 🎉',
                message: 'Your onboarding documents have been received. Your account is currently under pending review.',
                body: 'Your onboarding documents have been received. Your account is currently under pending review.',
                type: 'info',
                read: false,
                isRead: false,
                createdAt: nowIso,
                link: '/dashboard/pending',
            });
        } catch (notifErr) {
            console.warn('[API notify-pending-review] Could not create in-app notification:', notifErr);
        }

        return NextResponse.json({ success: true, emailResult: { success: !!emailResult?.success } });
    } catch (error: any) {
        console.error('[API notify-pending-review] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
