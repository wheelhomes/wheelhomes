import { Timestamp } from 'firebase/firestore';

export enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PARTIALLY_COMPLETED = 'partially_completed',
    CANCELLED = 'cancelled',
    AWAITING_CONFIRMATION = 'awaiting_confirmation'
}

export interface Attachment {
    id: string;
    url: string;
    name: string;
    type: string;
}

export interface RequestHistoryItem {
    status: RequestStatus | string;
    changedBy: string;
    timestamp: Date | Timestamp;
    note: string;
}

export interface ServiceRequest {
    id: string;
    userId: string;
    serviceType: string;
    description: string;
    location: Record<string, unknown>; // Define usage specific location type if possible
    price?: number;
    currency?: string;
    status: RequestStatus;

    // Lifecycle
    createdAt: Date | Timestamp;
    updatedAt: Date | Timestamp;
    actualCompletionTime?: Date | Timestamp;
    estimatedCompletionTime?: Date | Timestamp;

    history: RequestHistoryItem[];
    attachments: Attachment[];

    providerId?: string;

    // Legacy mapping or extended fields
    completionDetails?: Record<string, unknown>;
    cancellationReason?: string;
}

export interface AuditLog {
    id?: string;
    action: string;
    entityType: 'request' | 'user' | 'chat' | 'system';
    entityId: string;
    performedBy: string;
    details?: Record<string, unknown>;
    timestamp: Date | Timestamp;
}
