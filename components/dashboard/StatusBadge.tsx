import { CheckCircle, Clock, XCircle, AlertCircle, Loader } from "lucide-react";
import React from "react";

export type RequestStatus = "Pending" | "In Progress" | "Action Required" | "Completed" | "Rejected" | "Cancelled";

interface StatusBadgeProps {
    status: RequestStatus;
    className?: string;
}

const statusConfig: Record<RequestStatus, { color: string; icon: React.ReactNode; bg: string; text: string }> = {
    "Pending": {
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        icon: <Clock className="w-3 h-3" />,
    },
    "In Progress": {
        color: "text-blue-600",
        bg: "bg-blue-50",
        text: "text-blue-700",
        icon: <Loader className="w-3 h-3 animate-spin" />,
    },
    "Action Required": {
        color: "text-orange-600",
        bg: "bg-orange-50",
        text: "text-orange-700",
        icon: <AlertCircle className="w-3 h-3" />,
    },
    "Completed": {
        color: "text-green-600",
        bg: "bg-green-50",
        text: "text-green-700",
        icon: <CheckCircle className="w-3 h-3" />,
    },
    "Rejected": {
        color: "text-red-600",
        bg: "bg-red-50",
        text: "text-red-700",
        icon: <XCircle className="w-3 h-3" />,
    },
    "Cancelled": {
        color: "text-gray-600",
        bg: "bg-gray-100",
        text: "text-gray-700",
        icon: <XCircle className="w-3 h-3" />,
    },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
    const config = statusConfig[status] || statusConfig["Pending"]; // Default to Pending if unknown

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${config.bg} ${config.text} ${className}`}
        >
            {config.icon}
            {status}
        </span>
    );
};
