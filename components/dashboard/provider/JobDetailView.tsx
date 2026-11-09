import { useState } from "react";
import { JobRequest } from "./types";
import {
    User, MapPin, MessageSquare, Phone, ArrowLeft,
    Briefcase, CheckCircle, Clock, Calendar, Check, Shield, Users, Copy
} from "lucide-react";
import { formatJobLocation, formatRequestCode } from "@/lib/job-utils";

interface JobDetailViewProps {
    job: JobRequest | null;
    onBack?: () => void;
    onStatusUpdate: (id: string, action: 'accepted' | 'rejected') => void;
    onStartJob: (job: JobRequest) => void;
    onCompleteJob: (job: JobRequest) => void;
    onAssignAssistant?: (job: JobRequest) => void;
    onChat: (job: JobRequest) => void;
    className?: string; // To allow parent to control width/position
}

export const JobDetailView = ({
    job,
    onBack,
    onStatusUpdate,
    onStartJob,
    onCompleteJob,
    onAssignAssistant,
    onChat,
    className = ""
}: JobDetailViewProps) => {
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedSlip, setCopiedSlip] = useState(false);

    if (!job) {
        return (
            <div className={`flex flex-col items-center justify-center h-full text-gray-400 p-8 ${className}`}>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium">Select a job to view details</p>
                <p className="text-sm mt-2 text-center">Click on any request from the list to manage it.</p>
            </div>
        );
    }

    const requestCode = formatRequestCode(job);
    const assistantName = job.assistantName || job.assignedAssistant?.name;
    const assistantPhone = job.assistantPhone || job.assignedAssistant?.phone;
    const assistantArea = job.assistantArea || job.assignedAssistant?.area;

    const handleCopyCode = () => {
        navigator.clipboard?.writeText(requestCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyDispatchSlip = () => {
        const slip = [
            `Wheel of Comfort Dispatch Slip`,
            `Request ID (Quote at Client Door): #${requestCode}`,
            `Service: ${job.serviceType}`,
            `Client: ${displayClientName}`,
            `Location: ${formatJobLocation(job.location)}`,
            assistantName ? `Assigned Technician: ${assistantName} (${assistantPhone || ""})` : "",
            `Issue: ${job.description || "Inspection & service"}`
        ].filter(Boolean).join("\n");
        navigator.clipboard?.writeText(slip);
        setCopiedSlip(true);
        setTimeout(() => setCopiedSlip(false), 2500);
    };

    const getStatusBadge = (status: string) => {
        const baseClass = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5";
        switch (status) {
            case 'pending':
            case 'open':
                return <span className={`${baseClass} bg-yellow-100 text-yellow-700`}>Pending Review</span>;
            case 'accepted': return <span className={`${baseClass} bg-blue-100 text-blue-700`}>Accepted</span>;
            case 'in_progress': return <span className={`${baseClass} bg-purple-100 text-purple-700 animate-pulse`}>In Progress</span>;
            case 'awaiting_confirmation': return <span className={`${baseClass} bg-indigo-100 text-indigo-700`}>Awaiting Client Approval</span>;
            case 'fully_completed':
            case 'completed':
                return <span className={`${baseClass} bg-green-100 text-green-700`}>Approved & Done</span>;
            case 'partially_completed': return <span className={`${baseClass} bg-orange-100 text-orange-700`}>Partial</span>;
            case 'rejected': return <span className={`${baseClass} bg-red-100 text-red-700`}>Rejected</span>;
            case 'cancelled': return <span className={`${baseClass} bg-gray-100 text-gray-700`}>Cancelled</span>;
            default: return <span className={`${baseClass} bg-gray-100 text-gray-700`}>{status}</span>;
        }
    };

    const displayClientName =
        job.clientName && job.clientName !== "Unknown Client" && job.clientName !== "Client"
            ? job.clientName
            : `Client #${(job.clientId || "").slice(0, 6).toUpperCase() || "NEW"}`;

    return (
        <div className={`flex flex-col h-full bg-gray-50/40 overflow-y-auto ${className}`}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 lg:hidden"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-extrabold text-gray-900 leading-tight truncate">
                                    {job.serviceType}
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    title="Click to copy Request ID"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-mono font-extrabold hover:bg-purple-100 transition-colors cursor-pointer"
                                >
                                    <span>#{requestCode}</span>
                                    <Copy className="w-3 h-3 text-purple-600" />
                                    {copiedCode && <span className="text-[10px] font-sans text-emerald-700">Copied!</span>}
                                </button>
                            </div>
                            <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 mt-0.5">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                {job.clientState ? `${job.clientState} State HOD Dispatch` : 'Department Service Request'}
                            </p>
                        </div>
                        {getStatusBadge(job.status)}
                    </div>
                </div>
            </div>

            {/* Content + Immediate Action Panel (No huge empty gap) */}
            <div className="p-6 space-y-5 max-w-3xl">

                {/* Top Summary Card: Client + Meta Grid + Location */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-base truncate">{displayClientName}</h3>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md">
                                        ID: {(job.clientId || "").slice(0, 6)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    <span className="truncate font-medium text-gray-700">{formatJobLocation(job.location)}</span>
                                </div>
                            </div>
                        </div>

                        {['accepted', 'assigned', 'in_progress', 'awaiting_confirmation', 'partially_completed'].includes(job.status) && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => onChat(job)}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
                                    title="Message Client"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="hidden sm:inline">Chat</span>
                                </button>
                                {(job as any).clientPhone && (
                                    <a
                                        href={`tel:${(job as any).clientPhone}`}
                                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                                        title="Call Client"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Requested Date & Budget Strip */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                        <div className="bg-gray-50/80 border border-gray-100 px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5 text-gray-400 mb-0.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Requested</span>
                                </div>
                                <p className="text-sm font-bold text-gray-900">
                                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Today'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-100 px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5 text-emerald-600/80 mb-0.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {(job as any).finalAgreedPrice ? "Final Agreed Bill" : "Client Budget"}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-base font-extrabold text-emerald-700">
                                        ₦{Number((job as any).finalAgreedPrice ?? job.budget ?? 0).toLocaleString()}
                                    </p>
                                    {(job as any).initialBudget && (job as any).finalAgreedPrice && (job as any).initialBudget !== (job as any).finalAgreedPrice ? (
                                        <span className="text-xs text-gray-400 line-through">
                                            ₦{Number((job as any).initialBudget).toLocaleString()}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Issue / Job Description inside the same card */}
                    <div className="pt-2">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Issue / Service Details
                        </h4>
                        <div className="bg-gray-50 px-4 py-3.5 rounded-xl border border-gray-100 text-sm text-gray-800 font-medium leading-relaxed">
                            {job.description || "No additional description provided."}
                        </div>
                    </div>

                    {/* Technician Work Summary (if submitted) */}
                    {(job as any).completionSummary && (
                        <div className="bg-indigo-50/60 border border-indigo-100 px-4 py-3 rounded-xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                                Submitted Work & Parts Summary
                            </p>
                            <p className="text-xs text-gray-800 leading-relaxed font-medium">
                                {(job as any).completionSummary}
                            </p>
                        </div>
                    )}

                    {/* Doorstep Security Verification & Dispatch Slip */}
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider">
                                    Doorstep Security Verification ID: <span className="font-mono">#{requestCode}</span>
                                </p>
                                <p className="text-xs text-purple-800/90 mt-0.5 leading-relaxed">
                                    The client will ask the arriving technician to quote Request ID <strong>#{requestCode}</strong> before granting entry.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyDispatchSlip}
                            className="px-3 py-2 text-xs font-bold text-purple-900 bg-white border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedSlip ? "Dispatch Slip Copied!" : "Copy Slip for Technician"}
                        </button>
                    </div>

                    {/* Dispatched Assistant Banner (if assigned) */}
                    {assistantName && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Dispatched Field Assistant</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {assistantName}
                                        {assistantArea ? <span className="text-xs font-normal text-gray-600"> • {assistantArea}</span> : null}
                                    </p>
                                    {assistantPhone && (
                                        <p className="text-xs font-semibold text-emerald-800 mt-0.5">{assistantPhone}</p>
                                    )}
                                </div>
                            </div>
                            {onAssignAssistant && !['fully_completed', 'cancelled', 'rejected'].includes(job.status) && (
                                <button
                                    onClick={() => onAssignAssistant(job)}
                                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
                                >
                                    Reassign
                                </button>
                            )}
                        </div>
                    )}

                    {/* Action Bar Directly Inside Card — Right Under Details! */}
                    <div className="pt-3 border-t border-gray-100 space-y-2.5">
                        {(job.status === 'pending' || (job.status as string) === 'open') && (
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                        onClick={() => onStatusUpdate(job.id, 'accepted')}
                                        className="py-2.5 px-4 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <Check className="w-4 h-4" /> Accept Myself
                                    </button>
                                    {onAssignAssistant && (
                                        <button
                                            onClick={() => onAssignAssistant(job)}
                                            className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                        >
                                            <Users className="w-4 h-4" /> Dispatch Assistant
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => onStatusUpdate(job.id, 'rejected')}
                                    className="w-full py-2 px-4 rounded-xl border border-red-200 text-red-600 font-semibold text-xs hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                    Decline Request
                                </button>
                            </div>
                        )}

                        {job.status === 'accepted' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                    onClick={() => onStartJob(job)}
                                    className="py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                >
                                    <Briefcase className="w-4 h-4" /> Start Job
                                </button>
                                {onAssignAssistant && !assistantName && (
                                    <button
                                        onClick={() => onAssignAssistant(job)}
                                        className="py-3 px-4 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Users className="w-4 h-4" /> Dispatch Assistant
                                    </button>
                                )}
                            </div>
                        )}

                        {job.status === 'in_progress' && (
                            <button
                                onClick={() => onCompleteJob(job)}
                                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <CheckCircle className="w-4 h-4" /> Submit Work for Client Approval
                            </button>
                        )}

                        {(job.status as string) === 'awaiting_confirmation' && (
                            <div className="w-full py-3 px-4 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 text-center flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4 shrink-0" />
                                Waiting for Client to inspect and approve that the job is well done
                            </div>
                        )}

                        {['fully_completed', 'completed', 'partially_completed', 'cancelled', 'rejected'].includes(job.status) && (
                            <div className="w-full py-2.5 bg-gray-50 text-gray-500 font-medium text-xs rounded-xl border border-gray-200 text-center flex items-center justify-center gap-2">
                                {job.status === 'fully_completed' ? <Check className="w-4 h-4 text-green-600" /> : null}
                                Job status: <span className="font-bold uppercase">{job.status.replace('_', ' ')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
