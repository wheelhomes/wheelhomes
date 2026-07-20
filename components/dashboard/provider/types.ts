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
