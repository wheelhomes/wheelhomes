import React from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { RequestStatus } from '@/lib/types/core';

interface TimelineStep {
    id: string;
    label: string;
    date?: string;
    completed: boolean;
    current: boolean;
}

interface TimelineProps {
    status: string | any;
    dates: {
        created: string;
        accepted?: string;
        providerDone?: string; // New: when provider finishes
        completed?: string;
    };
}

export const Timeline: React.FC<TimelineProps> = ({ status, dates }) => {
    // Logic to determine steps based on status
    const steps: TimelineStep[] = [
        {
            id: 'requested',
            label: 'Request Sent',
            date: dates.created,
            completed: true,
            current: status === 'pending',
        },
        {
            id: 'accepted',
            label: 'In Progress',
            date: dates.accepted,
            completed: ['in_progress', 'partially_completed', 'awaiting_confirmation', 'fully_completed', 'completed'].includes(status),
            current: status === 'in_progress' || status === 'partially_completed',
        },
        {
            id: 'awaiting',
            label: 'Provider Done',
            date: dates.providerDone,
            completed: ['awaiting_confirmation', 'fully_completed', 'completed'].includes(status),
            current: status === 'awaiting_confirmation',
        },
        {
            id: 'completed',
            label: 'Job Closed',
            date: dates.completed,
            completed: status === 'fully_completed' || status === 'completed',
            current: false,
        },
    ];

    return (
        <div className="relative">
            {/* Mobile Vertical Timeline */}
            <div className="md:hidden space-y-6 pl-4 border-l-2 border-gray-100 ml-2">
                {steps.map((step) => (
                    <div key={step.id} className="relative pl-6">
                        {/* Dot */}
                        <div
                            className={`absolute -left-[1.35rem] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${step.completed
                                ? 'border-primary text-primary'
                                : step.current
                                    ? 'border-primary animate-pulse text-primary'
                                    : 'border-gray-200 text-gray-300'
                                }`}
                        >
                            {step.completed ? (
                                <Check className="w-3 h-3" />
                            ) : step.current ? (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                            ) : (
                                <Circle className="w-3 h-3" />
                            )}
                        </div>

                        {/* Content */}
                        <div>
                            <p className={`text-sm font-medium ${step.completed || step.current ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step.label}
                            </p>
                            {step.date && <p className="text-xs text-gray-500 mt-0.5">{new Date(step.date).toLocaleString()}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Horizontal Timeline */}
            <div className="hidden md:flex items-center justify-between w-full relative">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />

                {steps.map((step, index) => (
                    <div key={step.id} className="relative z-10 flex flex-col items-center bg-white px-2">
                        <div
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-colors duration-300 ${step.completed
                                ? 'border-primary bg-primary text-white'
                                : step.current
                                    ? 'border-primary bg-white text-primary'
                                    : 'border-gray-200 bg-white text-gray-300'
                                }`}
                        >
                            {step.completed ? (
                                <Check className="w-4 h-4" />
                            ) : step.current ? (
                                <Clock className="w-4 h-4" />
                            ) : (
                                <Circle className="w-4 h-4" />
                            )}
                        </div>
                        <p className={`text-sm font-medium text-center ${step.completed || step.current ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                        </p>
                        {step.date && <p className="text-xs text-gray-500 mt-1">{new Date(step.date).toLocaleDateString()}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};
