'use server';

import { sendEmail } from '@/lib/mail';
import { welcomeEmailTemplate } from '@/lib/email-templates';

export async function sendWelcomeEmailAction(email: string, name: string) {
    if (!email || !name) {
        return { success: false, error: 'Email and name are required' };
    }

    try {
        const html = welcomeEmailTemplate(name);
        const result = await sendEmail({
            to: email,
            subject: 'Welcome to Find Home!',
            html,
        });
        return result;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error };
    }
}
