export interface JobRequest {
    id: string;
    clientId: string;
    clientName?: string;
    providerId: string | null; // Nullable for Open jobs
    serviceType: string;
    category?: string; // New: For simpler filtering (e.g. "plumbing")
    status: 'open' | 'pending' | 'accepted' | 'in_progress' | 'fully_completed' | 'partially_completed' | 'cancelled' | 'rejected';
    description: string;
    urgency?: 'low' | 'medium' | 'high' | 'emergency'; // New: For urgency flag
    budget: number;
    location: string;
    createdAt: any;

    // Optional legacy fields
    date?: string;
    time?: string;

    // HOD Smart-Routing & Dispatched Assistant Fields
    hodId?: string;
    hodName?: string;
    hodPhone?: string;
    clientState?: string;
    routingMode?: string;
    assignedAssistant?: {
        name: string;
        phone: string;
        area?: string;
        linkedUserUid?: string | null;
        dispatchedByHodUid?: string;
        dispatchedByHodName?: string;
        dispatchedAt?: string;
        note?: string;
    };
    assistantName?: string;
    assistantPhone?: string;
    assistantArea?: string;

    // Completion Flow Fields
    startTime?: any;
    estimatedDuration?: string;
    startNote?: string;
    actualEndTime?: any;
    completionDetails?: {
        reason: string;
        photoProof: string;
        timestamp: any;
    };
}
