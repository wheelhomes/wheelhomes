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
