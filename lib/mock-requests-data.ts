export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Request {
    id: string;
    serviceType: string;
    description: string;
    status: RequestStatus;
    date: string;
    address: string;
    provider?: {
        name: string;
        avatar: string;
    };
    price?: number;
}

// Kept as typed empty list for backward compatibility with tests/imports
export const mockRequests: Request[] = [];
