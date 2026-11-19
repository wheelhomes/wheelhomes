'use server';

import { sendEmail } from '@/lib/mail';
import { adminAuth } from '@/lib/firebase-admin';
import { isCallerAdmin, VerifiedCaller } from '@/lib/api-auth';
import {
    welcomeEmailTemplate,
    welcomeEmailText,
    rejectionEmailTemplate,
    rejectionEmailText,
    approvalEmailTemplate,
    approvalEmailText,
    pendingReviewEmailTemplate,
    pendingReviewEmailText,
    hodAppointmentEmailTemplate,
    hodAppointmentEmailText,
    hodJobDispatchEmailTemplate,
    hodJobDispatchEmailText,
} from '@/lib/email-templates';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function verifyActionAuth(idToken?: string): Promise<VerifiedCaller | null> {
    if (!idToken || typeof idToken !== 'string') return null;
    try {
        const decoded = await adminAuth().verifyIdToken(idToken);
        return { uid: decoded.uid, email: decoded.email, token: decoded };
    } catch {
        return null;
    }
}

async function verifyActionAdmin(idToken?: string): Promise<VerifiedCaller | null> {
    const caller = await verifyActionAuth(idToken);
    if (!caller) return null;
    return (await isCallerAdmin(caller)) ? caller : null;
}

export async function sendWelcomeEmailAction(email: string, name: string, idToken?: string) {
    const caller = await verifyActionAuth(idToken);
    if (!caller) {
        return { success: false, error: 'Unauthorized' };
    }
    if (!email || !name) {
        return { success: false, error: 'Email and name are required' };
    }
    if (caller.email && email.trim().toLowerCase() !== caller.email.toLowerCase() && !(await isCallerAdmin(caller))) {
        return { success: false, error: 'Forbidden' };
    }

    try {
        const html = welcomeEmailTemplate(escapeHtml(name));
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
        return { success: false, error: 'Failed to send email' };
    }
}

export async function sendRejectionEmailAction(email: string, name: string, reason: string, idToken?: string) {
    const adminCaller = await verifyActionAdmin(idToken);
    if (!adminCaller) {
        return { success: false, error: 'Forbidden: Admin access required' };
    }

    if (!email) {
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = rejectionEmailTemplate(escapeHtml(name || 'Service Provider'), escapeHtml(reason || ''));
        const text = rejectionEmailText(name || 'Service Provider', reason);
        const result = await sendEmail({
            to: email,
            subject: 'Wheelhomes: Action Required on Your Verification Documents',
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('[Rejection Email] Failed to send rejection email:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

export async function sendApprovalEmailAction(email: string, name: string, idToken?: string) {
    const adminCaller = await verifyActionAdmin(idToken);
    if (!adminCaller) {
        return { success: false, error: 'Forbidden: Admin access required' };
    }

    const cleanEmail = email ? email.trim() : '';
    if (!cleanEmail) {
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = approvalEmailTemplate(escapeHtml(name || 'Service Provider'));
        const text = approvalEmailText(name || 'Service Provider');
        const result = await sendEmail({
            to: cleanEmail,
            subject: 'Wheelhomes: Your Account Verification Has Been Approved',
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('[Approval Email] Failed to send approval email:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

export async function sendPendingReviewEmailAction(email: string, name: string, idToken?: string) {
    const caller = await verifyActionAuth(idToken);
    if (!caller) {
        return { success: false, error: 'Unauthorized' };
    }

    const cleanEmail = email ? email.trim() : '';
    if (!cleanEmail) {
        return { success: false, error: 'Recipient email is required' };
    }
    if (caller.email && cleanEmail.toLowerCase() !== caller.email.toLowerCase() && !(await isCallerAdmin(caller))) {
        return { success: false, error: 'Forbidden' };
    }

    try {
        const html = pendingReviewEmailTemplate(escapeHtml(name || 'Service Provider'));
        const text = pendingReviewEmailText(name || 'Service Provider');
        const result = await sendEmail({
            to: cleanEmail,
            subject: 'Wheel of Comfort: Successful Onboarding — Your Account is Under Pending Review',
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('[Pending Review Email] Failed to send pending review email:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

export async function sendHodAppointmentEmailAction(params: {
    email: string;
    name: string;
    categoryName: string;
    stateName: string;
    idToken?: string;
}) {
    const adminCaller = await verifyActionAdmin(params.idToken);
    if (!adminCaller) {
        return { success: false, error: 'Forbidden: Admin access required' };
    }

    const cleanEmail = params.email ? params.email.trim() : '';
    if (!cleanEmail) {
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = hodAppointmentEmailTemplate({
            name: escapeHtml(params.name || 'Service Partner'),
            categoryName: escapeHtml(params.categoryName),
            stateName: escapeHtml(params.stateName),
        });
        const text = hodAppointmentEmailText({
            name: params.name || 'Service Partner',
            categoryName: params.categoryName,
            stateName: params.stateName,
        });
        const result = await sendEmail({
            to: cleanEmail,
            subject: `Wheel of Comfort: Appointed as ${params.stateName} State HOD (${params.categoryName})`,
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('[HOD Appointment Email] Failed to send HOD appointment email:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

export async function sendHodJobDispatchEmailAction(params: {
    email: string;
    hodName: string;
    categoryName: string;
    stateName: string;
    clientName: string;
    location: string;
    description: string;
    preferredTime?: string;
    idToken?: string;
}) {
    const caller = await verifyActionAuth(params.idToken);
    if (!caller) {
        return { success: false, error: 'Unauthorized' };
    }

    const cleanEmail = params.email ? params.email.trim() : '';
    if (!cleanEmail) {
        return { success: false, error: 'Recipient email is required' };
    }

    try {
        const html = hodJobDispatchEmailTemplate({
            ...params,
            hodName: escapeHtml(params.hodName),
            categoryName: escapeHtml(params.categoryName),
            stateName: escapeHtml(params.stateName),
            clientName: escapeHtml(params.clientName),
            location: escapeHtml(params.location),
            description: escapeHtml(params.description),
            preferredTime: params.preferredTime ? escapeHtml(params.preferredTime) : undefined,
        });
        const text = hodJobDispatchEmailText(params);
        const result = await sendEmail({
            to: cleanEmail,
            subject: `Wheel of Comfort: New ${params.categoryName} Request in ${params.stateName} (HOD Dispatch)`,
            html,
            text,
        });
        return result;
    } catch (error) {
        console.error('[HOD Job Dispatch Email] Failed to send HOD job dispatch email:', error);
        return { success: false, error: 'Failed to send email' };
    }
}



