import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
    id?: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: Timestamp | Date;
    readBy?: string[];
}

export interface ChatConversation {
    id: string;
    participants: string[]; // User IDs
    lastMessage?: {
        text: string;
        senderId: string;
        createdAt: Timestamp | Date;
    };
    updatedAt: Timestamp | Date;
    metadata?: {
        requestId?: string; // Link to a specific service request if applicable
        [key: string]: unknown;
    };
}

export interface TimelineEvent {
    id?: string;
    requestId: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | string;
    description: string;
    createdAt: Timestamp | Date;
    createdBy: string; // User ID or 'system'
    metadata?: unknown;
}

export interface ETANotification {
    requestId: string;
    previousEta?: Timestamp | Date;
    newEta: Timestamp | Date;
    updatedAt: Timestamp | Date;
    updatedBy: string;
}
