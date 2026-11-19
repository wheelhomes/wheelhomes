import "server-only";
import { adminDb } from "@/lib/firebase-admin";

export interface AdminAuditEntry {
    actorUid: string;
    actorEmail?: string;
    action: string;
    targetType: "user" | "request" | "application" | "system";
    targetId: string;
    details?: Record<string, unknown>;
}

/**
 * Writes an immutable audit log entry to `admin_audit_logs` via Admin SDK.
 * Failures are logged but do not block the primary operation.
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
    try {
        await adminDb().collection("admin_audit_logs").add({
            actorUid: entry.actorUid,
            actorEmail: entry.actorEmail || null,
            action: entry.action,
            targetType: entry.targetType,
            targetId: entry.targetId,
            details: entry.details || {},
            createdAt: new Date().toISOString(),
        });
    } catch (err) {
        console.warn("[AdminAudit] Failed to write audit log:", err);
    }
}
