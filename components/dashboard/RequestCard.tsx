import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Clock, DollarSign, MessageCircle, User, AlertCircle } from "lucide-react";
import { StatusBadge, RequestStatus } from "./StatusBadge";

export interface TimelineEvent {
    id: string;
    status: string;
    description: string;
    timestamp: string;
    icon?: string;
}

export interface Provider {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
}

export interface Request {
    id: string;
    title: string;
    status: RequestStatus;
    date: string;
    location?: string;
    category: string;
    provider?: Provider;
    eta?: string;
    completedAt?: string;
    cost?: {
        amount: number;
        currency: string;
        isFinal: boolean;
    };
    timeline?: TimelineEvent[];
    unreadMessages?: number;
    actionRequired?: boolean;
    isOverdue?: boolean;
}

interface RequestCardProps {
    request: Request;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
    const hasProvider = !!request.provider;
    const recentTimeline = request.timeline?.slice(0, 3) || [];

    // Determine border color based on status and urgency
    const getBorderColor = () => {
        if (request.actionRequired) return "border-l-red-500";
        if (request.isOverdue) return "border-l-orange-500";
        if (request.status === "In Progress") return "border-l-blue-500";
        if (request.status === "Completed") return "border-l-green-500";
        return "border-l-gray-300";
    };

    return (
        <Link
            href={`/dashboard/my-requests/details?id=${request.id}`}
            className={`block bg-white rounded-xl border-l-4 border-r border-t border-b border-gray-200 ${getBorderColor()} p-5 hover:shadow-lg hover:border-orange-200 transition-all duration-200 group cursor-pointer relative`}
        >
            {/* Smart Indicators */}
            <div className="absolute top-3 right-3 flex gap-2">
                {request.actionRequired && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Action Required" />
                )}
                {request.unreadMessages && request.unreadMessages > 0 && (
                    <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <MessageCircle className="w-3 h-3" />
                        {request.unreadMessages}
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="mb-4 pr-16">
                <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{getCategoryIcon(request.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-400 mb-1 block">
                            #{request.id} • {request.category}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                            {request.title}
                        </h3>
                    </div>
                </div>
                <StatusBadge status={request.status} />
            </div>

            {/* Provider Info */}
            {hasProvider && request.provider && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {request.provider.avatar ? (
                                <img src={request.provider.avatar} alt={request.provider.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{request.provider.name}</p>
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                <span className="text-xs text-gray-600">{request.provider.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mini Timeline */}
            {recentTimeline.length > 0 && (
                <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Activity</p>
                    {recentTimeline.map((event, index) => (
                        <div key={event.id} className="flex items-start gap-2 text-sm">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${index === 0 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-700 text-xs line-clamp-1">{event.description}</p>
                                <p className="text-gray-400 text-xs">{formatTimeAgo(event.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-xs">{new Date(request.date).toLocaleDateString()}</span>
                </div>

                {request.location && (
                    <div className="flex items-center gap-2 text-gray-600" title={request.location}>
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-xs">{request.location}</span>
                    </div>
                )}

                {request.eta && request.status !== "Completed" && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-xs">
                            {request.isOverdue ? (
                                <span className="text-orange-600 font-medium">Overdue</span>
                            ) : (
                                `ETA: ${new Date(request.eta).toLocaleDateString()}`
                            )}
                        </span>
                    </div>
                )}

                {request.completedAt && request.status === "Completed" && (
                    <div className="flex items-center gap-2 text-green-600">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-xs">Done {formatTimeAgo(request.completedAt)}</span>
                    </div>
                )}

                {request.cost && (
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-xs">
                            {request.cost.currency} {request.cost.amount.toLocaleString()}
                            {!request.cost.isFinal && <span className="text-gray-400 font-normal ml-1">(est.)</span>}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        // Handle message action
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
                >
                    <MessageCircle className="w-4 h-4" />
                    Message
                </button>

                <div className="flex items-center text-sm font-medium text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                </div>
            </div>
        </Link>
    );
};

// Helper Functions
function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        "Maintenance": "🔧",
        "Concierge": "🛎️",
        "Service": "⚙️",
        "Quotes": "📋",
        "Plumbing": "🚰",
        "Electrical": "⚡",
        "Cleaning": "🧹",
        "Repairs": "🔨",
    };
    return icons[category] || "📦";
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
