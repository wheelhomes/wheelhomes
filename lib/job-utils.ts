/**
 * Universal Job & Request Utilities
 * Handles data discrepancies between Flutter Mobile and Next.js Web:
 * - Mobile stores location as a Map {address, city, state} while Web often expects a string
 * - Mobile stores userId and clientId, while Web sometimes queries clientId only
 * - Mobile stores price and budget interchangeably
 * - Safely parses Firestore Timestamps, ISO strings, and raw milliseconds
 */

export function formatJobLocation(location: any): string {
    if (!location) return "No location provided";
    if (typeof location === "string") return location.trim() || "No location provided";
    if (typeof location === "object") {
        const parts = [location.address, location.city, location.state].filter(Boolean);
        if (parts.length > 0) return parts.join(", ");
        if (location.formatted) return String(location.formatted);
        if (location.name) return String(location.name);
        try {
            return Object.values(location).filter(v => typeof v === 'string').join(", ") || "Location Details Provided";
        } catch {
            return "Location Details Provided";
        }
    }
    return String(location);
}

export function getJobTimestamp(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (val?.seconds) return val.seconds * 1000;
    if (typeof val?.toDate === 'function') return val.toDate().getTime();
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

export function formatJobBudget(budget?: number | null, price?: number | null): string {
    const val = budget ?? price;
    if (val === undefined || val === null || isNaN(Number(val))) return "Flexible / Negotiable";
    return `₦${Number(val).toLocaleString()}`;
}

/**
 * Generates a fresh 6-digit human-readable Request ID (`WOC-XXXXXX`) at request creation time.
 */
export function generateRequestCode(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `WOC-${num}`;
}

/**
 * Resolves the canonical human-readable Request ID (`WOC-XXXXXX`) for any job/request.
 * Uses stored `requestCode` / `trackingId` if present, or deterministically derives the exact
 * same 6-digit `WOC-XXXXXX` code from the Firestore document ID (matching Flutter Mobile 100%).
 */
export function formatRequestCode(jobOrId: any): string {
    if (!jobOrId) return "WOC-000000";
    if (typeof jobOrId === "object") {
        const explicit = String(jobOrId.requestCode || jobOrId.trackingId || "").trim();
        if (explicit) {
            return explicit.toUpperCase().startsWith("WOC-")
                ? explicit.toUpperCase()
                : `WOC-${explicit.toUpperCase()}`;
        }
        const docId = String(jobOrId.id || "").trim();
        if (!docId) return "WOC-000000";
        return deriveRequestCodeFromId(docId);
    }
    const raw = String(jobOrId).trim();
    if (!raw) return "WOC-000000";
    if (raw.toUpperCase().startsWith("WOC-")) return raw.toUpperCase();
    return deriveRequestCodeFromId(raw);
}

export function deriveRequestCodeFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) % 900000;
    }
    const sixDigits = String((hash % 900000) + 100000).padStart(6, "0");
    return `WOC-${sixDigits}`;
}
