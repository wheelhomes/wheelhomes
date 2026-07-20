import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuditLog } from '../types';

/**
 * Logs an action to the 'audit_logs' collection.
 * 
 * @param action The action type/name (e.g., 'REQUEST_UPDATED').
 * @param entityType The type of entity involved (e.g., 'request').
 * @param entityId The ID of the entity.
 * @param performedBy The ID of the user performing the action.
 * @param details Additional data/metadata about the action.
 */
export async function logAction(
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    performedBy: string,
    details: Record<string, any> = {}
) {
    try {
        const auditData: Omit<AuditLog, 'id'> = {
            action,
            entityType,
            entityId,
            performedBy,
            details,
            timestamp: serverTimestamp() as any,
        };

        await addDoc(collection(db, 'audit_logs'), auditData);
    } catch (error) {
        console.error('Failed to log audit action:', error);
        // Silent fail to not block main flow, but in production we might want a backup log
    }
}
