import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { pendingReviewEmailTemplate, pendingReviewEmailText } from '@/lib/email-templates';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let { email, name, uid } = body || {};

        if (!email && uid) {
            try {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    email = data.email || data.applicationData?.email;
                    name = name || data.fullName || data.displayName || data.businessName;
                }
            } catch (err) {
                console.warn('[API notify-pending-review] Could not resolve user doc:', err);
            }
        }

        const cleanEmail = email ? email.trim() : '';
        const candidateName = name || 'Service Provider';

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

        // Create an in-app notification for user
        if (uid) {
            try {
                const nowIso = new Date().toISOString();
                await addDoc(collection(db, 'notifications'), {
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
        }

        return NextResponse.json({
            success: true,
            emailResult,
        });
    } catch (error: any) {
        console.error('[API notify-pending-review] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
