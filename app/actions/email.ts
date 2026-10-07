'use server';

import { sendEmail } from '@/lib/mail';
import {
    welcomeEmailTemplate,
    welcomeEmailText,
    rejectionEmailTemplate,
    rejectionEmailText,
    approvalEmailTemplate,
    approvalEmailText,
    pendingReviewEmailTemplate,
    pendingReviewEmailText,
} from '@/lib/email-templates';

export async function sendWelcomeEmailAction(email: string, name: string) {
    if (!email || !name) {
        return { success: false, error: 'Email and name are required' };
    }

    try {
        const html = welcomeEmailTemplate(name);
        const text = welcomeEmailText(name);
        const result = await sendEmail({
            to: email,
            subject: 'Welcome to Wheelhomes - Your Account is Ready',
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error };
    }
}

export async function sendRejectionEmailAction(email: string, name: string, reason: string) {
    console.log(`[Rejection Email] Called with → email: "${email}", name: "${name}", reason: "${reason}"`);

    if (!email) {
        console.error('[Rejection Email] ❌ No email provided — skipping.');
        return { success: false, error: 'Recipient email is required' };
    }

    if (!reason || !reason.trim()) {
        console.warn('[Rejection Email] ⚠️ Reason is empty — email will be sent but reason field will be blank.');
    }

    try {
        const html = rejectionEmailTemplate(name || 'Service Provider', reason);
        const text = rejectionEmailText(name || 'Service Provider', reason);
        console.log(`[Rejection Email] 📝 HTML & Text generated. Sending to ${email}...`);
        const result = await sendEmail({
            to: email,
            subject: 'Wheelhomes: Action Required on Your Verification Documents',
            html,
            text,
        });
        console.log(`[Rejection Email] ✅ Send result:`, JSON.stringify(result));
        return result;
    } catch (error) {
        console.error('[Rejection Email] ❌ Failed to send rejection email:', error);
        return { success: false, error };
    }
}

export async function sendApprovalEmailAction(email: string, name: string) {
    console.log(`[Approval Email] Called with → email: "${email}", name: "${name}"`);

    const cleanEmail = email ? email.trim() : '';
    if (!cleanEmail) {
        console.error('[Approval Email] ❌ No recipient email provided — skipping email dispatch.');
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = approvalEmailTemplate(name || 'Service Provider');
        const text = approvalEmailText(name || 'Service Provider');
        console.log(`[Approval Email] 📝 HTML & Text generated. Sending to ${cleanEmail}...`);
        const result = await sendEmail({
            to: cleanEmail,
            subject: 'Wheelhomes: Your Account Verification Has Been Approved',
            html,
            text,
        });
        console.log(`[Approval Email] ✅ Result for ${cleanEmail}:`, JSON.stringify(result));
        return result;
    } catch (error) {
        console.error('[Approval Email] ❌ Failed to send approval email:', error);
        return { success: false, error };
    }
}

export async function sendPendingReviewEmailAction(email: string, name: string) {
    console.log(`[Pending Review Email] Called with → email: "${email}", name: "${name}"`);

    const cleanEmail = email ? email.trim() : '';
    if (!cleanEmail) {
        console.error('[Pending Review Email] ❌ No recipient email provided — skipping.');
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = pendingReviewEmailTemplate(name || 'Service Provider');
        const text = pendingReviewEmailText(name || 'Service Provider');
        console.log(`[Pending Review Email] 📝 Sending under review notification to ${cleanEmail}...`);
        const result = await sendEmail({
            to: cleanEmail,
            subject: 'Wheel of Comfort: Successful Onboarding — Your Account is Under Pending Review',
            html,
            text,
        });
        console.log(`[Pending Review Email] ✅ Result for ${cleanEmail}:`, JSON.stringify(result));
        return result;
    } catch (error) {
        console.error('[Pending Review Email] ❌ Failed to send pending review email:', error);
        return { success: false, error };
    }
}


