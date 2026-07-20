"use client";

import { Clock, MapPin, User, ChevronRight, Check, X, Play, ShieldCheck, AlertTriangle } from "lucide-react";

interface JobCardProps {
    job: any;
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onStart?: (job: any) => void;
    onComplete?: (job: any) => void;
}

export default function JobCard({ job, onAccept, onReject, onStart, onComplete }: JobCardProps) {
    const isPending = job.status === 'pending';
    const isInProgress = job.status === 'in_progress';
    const isAccepted = job.status === 'accepted';
    const isCompleted = job.status === 'fully_completed' || job.status === 'completed';
    const isPartial = job.status === 'partially_completed';
    const isAwaitingConfirmation = job.status === 'awaiting_confirmation';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-orange-50 text-orange-700 ring-orange-200';
            case 'in_progress': return 'bg-orange-100 text-orange-800 ring-orange-200'; // Active = Orange
            case 'accepted': return 'bg-gray-100 text-gray-700 ring-gray-200';
            case 'fully_completed':
            case 'completed': return 'bg-[#21C185]/10 text-[#21C185] ring-[#21C185]/20';
            case 'awaiting_confirmation': return 'bg-yellow-50 text-yellow-700 ring-yellow-200';
            case 'partially_completed': return 'bg-yellow-100 text-yellow-800 ring-yellow-200';
            case 'rejected':
            case 'cancelled': return 'bg-red-50 text-red-700 ring-red-100';
            default: return 'bg-gray-50 text-gray-600 ring-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center font-bold text-gray-400 border border-gray-100 uppercase group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:border-orange-100 transition-colors">
                        {job.serviceType?.slice(0, 2)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{job.serviceType || "Service Request"}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">#{job.id.slice(0, 8)}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide ${getStatusColor(job.status)}`}>
                    {job.status?.replace('_', ' ')}
                </span>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
                {/* Client & Location */}
                <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{job.clientName || "Client"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{job.location || "No location provided"}</span>
                    </div>
                </div>

                {/* Description Preview */}
                <div className="text-sm text-gray-500 leading-relaxed line-clamp-2 pl-1 italic">
                    "{job.description}"
                </div>

                {/* Timing info if available */}
                {job.estimatedDuration && isInProgress && (
                    <div className="flex items-center gap-2 text-xs font-medium text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                        <Clock className="w-3 h-3" />
                        Expected Duration: {job.estimatedDuration}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">

                {/* Pending Actions */}
                {isPending && (
                    <>
                        <button
                            onClick={() => onReject && onReject(job.id)}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => onAccept && onAccept(job.id)}
                            className="px-6 py-2 rounded-xl text-sm font-bold bg-[#21C185] text-white hover:bg-[#1db077] transition-colors shadow-lg shadow-green-100"
                        >
                            Accept Job
                        </button>
                    </>
                )}

                {/* Accepted -> Start */}
                {isAccepted && (
                    <button
                        onClick={() => onStart && onStart(job)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Start Job
                    </button>
                )}

                {/* In Progress -> Complete */}
                {(isInProgress || isPartial) && (
                    <button
                        onClick={() => onComplete && onComplete(job)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#21C185] text-white hover:bg-[#1db077] transition-colors shadow-lg shadow-green-200"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Mark Finished
                    </button>
                )}

                {/* Completed State */}
                {isCompleted && (
                    <div className="w-full text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2 flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Job Closed
                    </div>
                )}

                {isAwaitingConfirmation && (
                    <div className="w-full text-center text-xs font-bold text-orange-600 uppercase tracking-wider py-2 bg-orange-50 rounded-lg border border-orange-100">
                        Waiting for Confirmation
                    </div>
                )}

            </div>
        </div>
    );
}
