import { JobRequest } from "./types";
import {
    User, MapPin, MessageSquare, Phone, ArrowLeft,
    Briefcase, CheckCircle, Clock, Calendar, Check
} from "lucide-react";

interface JobDetailViewProps {
    job: JobRequest | null;
    onBack?: () => void;
    onStatusUpdate: (id: string, action: 'accepted' | 'rejected') => void;
    onStartJob: (job: JobRequest) => void;
    onCompleteJob: (job: JobRequest) => void;
    onChat: (job: JobRequest) => void;
    className?: string; // To allow parent to control width/position
}

export const JobDetailView = ({
    job,
    onBack,
    onStatusUpdate,
    onStartJob,
    onCompleteJob,
    onChat,
    className = ""
}: JobDetailViewProps) => {

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

    const getStatusBadge = (status: string) => {
        const baseClass = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5";
        switch (status) {
            case 'pending': return <span className={`${baseClass} bg-yellow-100 text-yellow-700`}>Pending Review</span>;
            case 'accepted': return <span className={`${baseClass} bg-blue-100 text-blue-700`}>Accepted</span>;
            case 'in_progress': return <span className={`${baseClass} bg-purple-100 text-purple-700 animate-pulse`}>In Progress</span>;
            case 'fully_completed': return <span className={`${baseClass} bg-green-100 text-green-700`}>Completed</span>;
            case 'partially_completed': return <span className={`${baseClass} bg-orange-100 text-orange-700`}>Partial</span>;
            case 'rejected': return <span className={`${baseClass} bg-red-100 text-red-700`}>Rejected</span>;
            case 'cancelled': return <span className={`${baseClass} bg-gray-100 text-gray-700`}>Cancelled</span>;
            default: return <span className={`${baseClass} bg-gray-100 text-gray-700`}>{status}</span>;
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 lg:hidden"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight truncate pr-2">
                            {job.serviceType}
                        </h2>
                        {getStatusBadge(job.status)}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Client Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{job.clientName || "Client"}</h3>
                                <p className="text-xs text-gray-500"> Customer ID: {job.clientId.slice(0, 6)}</p>
                            </div>
                        </div>
                        {['accepted', 'in_progress'].includes(job.status) && (
                            <div className="flex gap-2">
                                <button onClick={() => onChat(job)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                                <button className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                                    <Phone className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{job.location}</span>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Details</h4>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed">
                        {job.description}
                    </div>
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-1 text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase">Requested</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase">Budget</span>
                        </div>
                        <p className="text-sm font-semibold text-green-600">
                            ₦{job.budget?.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>

            </div>

            {/* Sticky Actions Footer */}
            <div className="p-4 bg-white border-t border-gray-100 pb-safe">
                {job.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onStatusUpdate(job.id, 'rejected')}
                            className="py-3 px-4 rounded-xl border border-red-100 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => onStatusUpdate(job.id, 'accepted')}
                            className="py-3 px-4 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 shadow-md transition-all active:scale-95"
                        >
                            Accept Request
                        </button>
                    </div>
                )}

                {job.status === 'accepted' && (
                    <button
                        onClick={() => onStartJob(job)}
                        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Briefcase className="w-4 h-4" /> Start Job
                    </button>
                )}

                {job.status === 'in_progress' && (
                    <button
                        onClick={() => onCompleteJob(job)}
                        className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <CheckCircle className="w-4 h-4" /> Complete Job
                    </button>
                )}

                {['fully_completed', 'partially_completed', 'cancelled', 'rejected'].includes(job.status) && (
                    <div className="w-full py-3 bg-gray-50 text-gray-500 font-medium text-sm rounded-xl border border-gray-200 text-center flex items-center justify-center gap-2">
                        {job.status === 'fully_completed' ? <Check className="w-4 h-4" /> : null}
                        Job is {job.status.replace('_', ' ')}
                    </div>
                )}
            </div>
        </div>
    );
};
