import { JobRequest } from "./types";
import { Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";

// Helper for relative time (since date-fns is not installed)
const timeAgo = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return d.toLocaleDateString();
};

interface JobListItemProps {
    job: JobRequest;
    isSelected: boolean;
    onClick: () => void;
}

export const JobListItem = ({ job, isSelected, onClick }: JobListItemProps) => {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'accepted': return 'bg-blue-500';
            case 'in_progress': return 'bg-purple-500 animate-pulse';
            case 'fully_completed': return 'bg-green-500';
            case 'partially_completed': return 'bg-orange-500';
            case 'rejected': return 'bg-red-500';
            case 'cancelled': return 'bg-gray-500';
            default: return 'bg-gray-300';
        }
    };

    const getStatusText = (status: string) => {
        return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex items-center gap-4 p-4 border-b border-gray-100 cursor-pointer transition-all duration-200
                ${isSelected ? 'bg-orange-50 border-orange-200' : 'bg-white hover:bg-gray-50'}
            `}
        >
            {/* Status Line Indicator (Left) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(job.status)}`} />

            {/* Avatar / Icon */}
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
                ${isSelected ? 'bg-white text-orange-600' : 'bg-gray-100 text-gray-500'}
            `}>
                <Briefcase className="w-5 h-5" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                        {job.clientName || "Unknown Client"}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {timeAgo(job.createdAt)}
                    </span>
                </div>

                <p className="text-xs font-medium text-blue-600 truncate mb-1">
                    {job.serviceType}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {job.location}
                    </span>
                    <span className={`
                        px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                        ${job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${job.status === 'in_progress' ? 'bg-purple-100 text-purple-700' : ''}
                        ${job.status === 'accepted' ? 'bg-blue-100 text-blue-700' : ''}
                        ${job.status === 'fully_completed' ? 'bg-green-100 text-green-700' : ''}
                    `}>
                        {getStatusText(job.status)}
                    </span>
                </div>
            </div>

            {/* Chevron (Desktop/Hover) */}
            <ChevronRight className={`
                w-5 h-5 text-gray-300 transition-transform duration-200
                ${isSelected ? 'text-orange-400 translate-x-1' : 'group-hover:text-gray-400 group-hover:translate-x-1'}
            `} />
        </div>
    );
};
