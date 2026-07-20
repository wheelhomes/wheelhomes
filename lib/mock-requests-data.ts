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

export const mockRequests: Request[] = [
    {
        id: 'REQ-001',
        serviceType: 'Home Cleaning',
        description: 'Deep cleaning for 2BHK apartment',
        status: 'in_progress',
        date: '2026-01-26',
        address: '123 Main St, New York, NY',
        provider: {
            name: 'Sarah Johnson',
            avatar: 'https://i.pravatar.cc/150?u=sarah',
        },
        price: 150,
    },
    {
        id: 'REQ-002',
        serviceType: 'Plumbing',
        description: 'Fix leaking kitchen sink',
        status: 'pending',
        date: '2026-01-27',
        address: '123 Main St, New York, NY',
    },
    {
        id: 'REQ-003',
        serviceType: 'Electrical',
        description: 'Install new ceiling fan',
        status: 'completed',
        date: '2026-01-20',
        address: '123 Main St, New York, NY',
        provider: {
            name: 'Mike Smith',
            avatar: 'https://i.pravatar.cc/150?u=mike',
        },
        price: 85,
    },
    {
        id: 'REQ-004',
        serviceType: 'Gardening',
        description: 'Lawn mowing and trimming',
        status: 'cancelled',
        date: '2026-01-15',
        address: '123 Main St, New York, NY',
    },
];
