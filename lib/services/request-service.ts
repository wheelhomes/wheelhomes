import { db } from "../firebase";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";

// Local types matching Dashboard's "JobRequest"
export interface Request {
    id?: string;
    clientId: string;
    providerId?: string;
    serviceType: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'fully_completed' | 'partially_completed' | 'cancelled' | 'rejected' | 'awaiting_confirmation';
    description: string;
    budget: number;
    location: string;
    createdAt: any;
    updatedAt: any;
    chatLocked?: boolean;
    // ... other fields
}

export interface CreateRequestDTO {
    userId: string; // client ID
    serviceId?: string;
}

// UPDATED to match Dashboard schema
const COLLECTION_NAME = "job_requests";

export const RequestServices = {
    async createRequest(data: CreateRequestDTO): Promise<string> {
        const now = new Date().toISOString();
        const requestData = {
            clientId: data.userId, // Dashboard uses clientId
            serviceType: "General Service", // Default for test
            description: "Test Request via Lifecycle Page",
            budget: 1000,
            location: "Test Location",
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            chatLocked: false,
            // providerId is undefined initially
        };

        const docRef = await addDoc(collection(db, COLLECTION_NAME), requestData);
        return docRef.id;
    },

    async getRequest(requestId: string): Promise<any | null> {
        const docRef = doc(db, COLLECTION_NAME, requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    },

    async assignRequest(requestId: string, providerId: string): Promise<void> {
        // Matches Provider Dashboard logic (accepted = assigned/accepted)
        const updateData = {
            status: 'accepted',
            providerId,
            assignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
    },

    async startJob(requestId: string, durationMinutes: number): Promise<void> {
        const now = new Date().toISOString();

        const updateData = {
            status: 'in_progress',
            startTime: now,
            estimatedDuration: `${durationMinutes} mins`,
            updatedAt: now,
        };

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
    },

    async completeJob(requestId: string, isPartial: boolean, notes?: string, photos?: string[]): Promise<void> {
        // Updated Flow:
        // Partial -> partially_completed (Chat Open)
        // Full -> awaiting_confirmation (Chat Open) -> User confirms manually later
        const status = isPartial ? 'partially_completed' : 'awaiting_confirmation';
        const now = new Date().toISOString();

        const updateData: any = {
            status,
            actualEndTime: now,
            chatLocked: false, // Chat remains open for both states
            updatedAt: now,
        };

        if (isPartial) {
            updateData.completionDetails = {
                reason: notes || "Partial completion test",
                photoProof: "https://placehold.co/600x400", // detailed photo not implemented in this test service yet
                timestamp: now
            };
        }

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
    },

    async cancelRequest(requestId: string, reason: string): Promise<void> {
        const updateData = {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            chatLocked: true,
            updatedAt: new Date().toISOString(),
        };

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
    },

    async confirmJobCompletion(requestId: string, rating: number, review?: string): Promise<void> {
        const now = new Date().toISOString();

        const updateData: any = {
            status: 'fully_completed',
            completedAt: now,
            chatLocked: true, // Only locked after user confirms
            updatedAt: now,

            // Add review data if needed, or handle in a separate collection
            clientRating: rating,
            clientReview: review
        };

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
    }
};
