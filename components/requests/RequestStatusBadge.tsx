import React from 'react';
import { RequestStatus } from '@/lib/types/core';

interface RequestStatusBadgeProps {
    status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    pending: {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    assigned: {
        label: 'Assigned',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    in_progress: {
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    awaiting_confirmation: {
        label: 'Waiting Confirmation',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    completed: {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    fully_completed: { // Handle legacy/variant
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    partially_completed: {
        label: 'Partial',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    accepted: {
        label: 'Accepted',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    rejected: {
        label: 'Rejected',
        className: 'bg-red-100 text-red-800 border-red-200',
    }
};

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({ status }) => {
    const config = statusConfig[status];

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
            {config.label}
        </span>
    );
};
