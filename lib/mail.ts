import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface SendEmailProps {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// Dynamic Gmail credential resolvers
const getGmailAddress = () => (process.env.GMAIL_USER || 'wheelofcomfort@gmail.com').trim();
const getGmailPass = () => (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

// Gmail SMTP Transporter (preferred: sends directly from wheelofcomfort@gmail.com)
const createGmailTransporter = () => {
    const pass = getGmailPass();
    const user = getGmailAddress();
    if (!pass) return null;

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass,
        },
    });
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailProps) => {
    const targetEmail = to ? to.trim() : '';
    const gmailPass = getGmailPass();
    const gmailAddress = getGmailAddress();

    console.log(`[sendEmail] Initiating email dispatch to "${targetEmail}" with subject: "${subject}"`);

    // Clean plain-text fallback ensures multipart/alternative delivery (crucial for inbox delivery)
    const plainText = text || html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // ── Method 1: Brevo HTTPS REST API (Preferred: Sends from wheelofcomfort@gmail.com via HTTPS 443, immune to ISP port blocks)
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    if (brevoApiKey && !brevoApiKey.includes('demo')) {
        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: 'Wheel of Comfort', email: gmailAddress },
                    replyTo: { name: 'Wheel of Comfort Support', email: gmailAddress },
                    to: [{ email: targetEmail }],
                    subject,
                    htmlContent: html,
                    textContent: plainText,
                }),
            });

            const data = await response.json();
            if (response.ok && data.messageId) {
                console.log(`[Email Sent] ✅ via Brevo (${gmailAddress}) to ${targetEmail}: ${data.messageId}`);
                return { success: true, method: 'brevo', messageId: data.messageId };
            } else {
                console.warn('[Brevo Warning] ⚠️ Brevo response not ok:', JSON.stringify(data));
            }
        } catch (error: any) {
            console.error('[Brevo Error] ❌ Failed to dispatch email via Brevo:', error.message || error);
        }
    }

    // ── Method 2: Direct Gmail SMTP (wheelofcomfort@gmail.com)
    if (gmailPass) {
        try {
            const transporter = createGmailTransporter();
            if (transporter) {
                const info = await transporter.sendMail({
                    from: `"Wheelhomes" <${gmailAddress}>`,
                    replyTo: `"Wheelhomes Support" <${gmailAddress}>`,
                    to: targetEmail,
                    subject,
                    text: plainText,
                    html,
                    headers: {
                        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        'X-Mailer': 'Wheelhomes Platform',
                        'X-Auto-Response-Suppress': 'OOF, AutoReply',
                    },
                });
                console.log(`[Email Sent] ✅ via Gmail (${gmailAddress}) to ${targetEmail}: ${info.messageId}`);
                return { success: true, method: 'gmail', messageId: info.messageId };
            }
        } catch (error: any) {
            console.error('[Gmail SMTP Error] ❌ Failed to send email via Gmail:', error.message || error);
            // Don't throw — continue to check fallback
        }
    } else {
        console.warn('[sendEmail] ⚠️ No GMAIL_APP_PASSWORD found in process.env');
    }

    // ── Method 2: Fallback to Resend (if configured)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_123456789') {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const data = await resend.emails.send({
                from: `Wheelhomes <onboarding@resend.dev>`,
                to: targetEmail,
                subject,
                text: plainText,
                html,
            });
            console.log(`[Email Sent] ✅ via Resend to ${targetEmail}`);
            return { success: true, method: 'resend', data };
        } catch (error) {
            console.error('[Resend Error] ❌ Failed to send email via Resend:', error);
            return { success: false, error };
        }
    }

    // ── If no credentials configured
    console.warn(
        `[Email Notice] ⚠️ Email not sent to ${targetEmail}. To send from wheelofcomfort@gmail.com, verify GMAIL_APP_PASSWORD in .env.local`
    );
    return {
        success: false,
        error: 'Missing GMAIL_APP_PASSWORD in .env.local',
    };
};
