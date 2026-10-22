import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || 'wheelhomes-secure-otp-v1-salt';

/**
 * Generates a cryptographically signed, time-windowed 6-digit OTP code bound to a specific UID.
 * Valid within 5-minute time windows.
 */
export function getDeterministicOtp(uid: string, windowOffset: number = 0): string {
    const window = Math.floor(Date.now() / (5 * 60 * 1000)) + windowOffset;
    const hmac = crypto.createHmac('sha256', OTP_SECRET).update(`${uid}:${window}`).digest('hex');
    const num = (parseInt(hmac.slice(0, 8), 16) % 900000) + 100000;
    return num.toString();
}

/**
 * Validates whether the given 6-digit code matches the user's OTP within a 15-minute validity window.
 * Returns true if valid, false otherwise.
 */
export function verifyDeterministicOtp(uid: string, code: string): boolean {
    const cleanCode = (code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) return false;

    // Check current window (0), previous window (-1), and window before (-2) -> 15 mins total
    for (let offset = 0; offset >= -2; offset--) {
        const expected = getDeterministicOtp(uid, offset);
        if (cleanCode.length === expected.length && crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
            return true;
        }
    }
    return false;
}
