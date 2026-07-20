/**
 * Security Logic for Chat Application
 * 
 * Enforces:
 * 1. PII Redaction/Detection (pre-send)
 * 2. Attachment Validation (type/size)
 * 3. Content Sanitization
 */

// Basic regex for detection. 
// serve side rules should also attempt to catch these, but client-side provides immediate feedback.
const PHONE_REGEX = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Max limits
const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
];

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Checks text for restricted PII (Phone numbers, Emails)
 * Returns true if PII is detected.
 */
export const detectPII = (text: string): boolean => {
    return PHONE_REGEX.test(text) || EMAIL_REGEX.test(text);
};

/**
 * Validates a message before sending.
 * Checks emptiness, length, and PII.
 */
export const validateMessage = (text: string): ValidationResult => {
    if (!text || text.trim().length === 0) {
        return { isValid: false, error: "Message cannot be empty" };
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
        return { isValid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
    }

    if (detectPII(text)) {
        return {
            isValid: false,
            error: "For your safety, sharing phone numbers or emails is not allowed. Please keep conversation in-app."
        };
    }

    return { isValid: true };
};

/**
 * Validates a file attachment before upload.
 */
export const validateAttachment = (file: File): ValidationResult => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            isValid: false,
            error: "Invalid file type. Only Images (JPG, PNG, WebP) and PDFs are allowed."
        };
    }

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > MAX_FILE_SIZE_MB) {
        return {
            isValid: false,
            error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`
        };
    }

    return { isValid: true };
};

export const sanitizeContent = (text: string): string => {
    // Basic trim. React handles XSS escaping by default for rendering.
    return text.trim();
};
