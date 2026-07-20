import { db } from '../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    arrayUnion,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { ServiceRequest, RequestStatus, RequestHistoryItem, ChatMessage, Attachment } from '../types';
import { logAction } from './audit';

const REQUESTS_COLLECTION = 'requests';
const CHATS_COLLECTION = 'messages'; // Sub-collection usually, but for simplicity top-level with requestId index or sub-collection? 
// Let's go with sub-collection: requests/{requestId}/messages

/**
 * Creates a new service request.
 */
export async function createRequest(
    userId: string,
    data: Pick<ServiceRequest, 'serviceType' | 'description' | 'location' | 'attachments' | 'price' | 'currency'>
): Promise<string> {
    const requestData: Omit<ServiceRequest, 'id'> = {
        ...data,
        userId,
        status: RequestStatus.PENDING,
        createdAt: serverTimestamp() as unknown as Timestamp,
        updatedAt: serverTimestamp() as unknown as Timestamp,
        history: [{
            status: RequestStatus.PENDING,
            changedBy: userId,
            timestamp: new Date(), // Client side approx, serverTimestamp is better but arrayUnion doesn't support serverTimestamp inside objects easily in all SDK versions, but we'll try standard Date or serverTimestamp if separate.
            note: 'Request created'
        }],
        attachments: data.attachments || []
    };

    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), requestData);

    await logAction('REQUEST_CREATED', 'request', docRef.id, userId, {
        serviceType: data.serviceType
    });

    return docRef.id;
}

/**
 * Updates the status of a request and logs the change.
 */
export async function updateRequestStatus(
    requestId: string,
    newStatus: RequestStatus,
    userId: string,
    note?: string
) {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
        throw new Error('Request not found');
    }

    const oldStatus = snapshot.data()?.status;

    const historyItem: RequestHistoryItem = {
        status: newStatus,
        changedBy: userId,
        timestamp: new Date(),
        note: note || `Status changed from ${oldStatus} to ${newStatus}`
    };

    const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: serverTimestamp() as unknown as Timestamp,
        history: arrayUnion(historyItem)
    };

    if (newStatus === RequestStatus.COMPLETED) {
        updates.actualCompletionTime = serverTimestamp() as unknown as Timestamp;
    }

    await updateDoc(requestRef, updates);

    await logAction('STATUS_UPDATED', 'request', requestId, userId, {
        oldStatus,
        newStatus,
        note
    });
}

/**
 * Updates the Estimated Completion Time (ETA).
 */
export async function updateETA(
    requestId: string,
    eta: Date,
    userId: string
) {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    await updateDoc(requestRef, {
        estimatedCompletionTime: eta,
        updatedAt: serverTimestamp() as unknown as Timestamp
    });

    await logAction('ETA_UPDATED', 'request', requestId, userId, {
        eta: eta.toISOString()
    });
}

/**
 * Adds a chat message to a request.
 */
export async function addRequestMessage(
    requestId: string,
    userId: string,
    text: string,
    attachments: Attachment[] = []
) {
    const messagesRef = collection(db, REQUESTS_COLLECTION, requestId, 'messages');

    const messageData: Omit<ChatMessage, 'id'> = {
        chatId: requestId,
        senderId: userId,
        text,
        // attachments, // Type definition doesn't support attachments yet
        createdAt: serverTimestamp() as unknown as Timestamp,
        readBy: [userId]
    };

    const docRef = await addDoc(messagesRef, messageData);

    // Optionally update request "updatedAt" to bump it in lists
    await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
        updatedAt: serverTimestamp() as unknown as Timestamp
    });

    // No heavy audit log defined for every chat message, but could request it if critical.
    return docRef.id;
}
