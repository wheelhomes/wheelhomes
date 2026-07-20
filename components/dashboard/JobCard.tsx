import Link from "next/link";
import { Clock, MessageSquare } from "lucide-react";

interface JobRequest {
    id: string;
    clientId: string;
    providerId: string;
    providerName?: string;
    serviceType: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'fully_completed' | 'partially_completed' | 'cancelled' | 'rejected';
    description: string;
    budget: number;
    location: string;
    createdAt: any;
}

interface JobCardProps {
    job: JobRequest;
    onOpenChat: (job: JobRequest) => void;
    statusBadge: React.ReactNode;
}

export function JobCard({ job, onOpenChat, statusBadge }: JobCardProps) {
    return (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 mb-1 truncate">{job.serviceType}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
                </div>
                <div className="ml-2 flex-shrink-0">
                    {statusBadge}
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Clock className="w-3 h-3" />
                <span>{job.createdAt?.seconds ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}</span>
            </div>

            <div className="flex gap-2">
                {['pending', 'in_progress', 'accepted'].includes(job.status) && (
                    <button
                        onClick={() => onOpenChat(job)}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <MessageSquare className="w-3 h-3" /> Message
                    </button>
                )}
                <Link
                    href={`/dashboard/my-requests/details?id=${job.id}`}
                    className="flex-1 flex items-center justify-center text-xs font-medium text-gray-700 hover:text-orange-600 transition-colors"
                >
                    Details →
                </Link>
            </div>
        </div>
    );
}
