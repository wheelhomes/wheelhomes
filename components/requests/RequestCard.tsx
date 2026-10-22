import React from 'react';
import Link from 'next/link';
import { RequestStatusBadge } from './RequestStatusBadge';
import { Calendar, MapPin, ChevronRight, User } from 'lucide-react';
import { formatJobLocation, formatJobBudget } from '@/lib/job-utils';

export interface UserJobRequest {
    id: string;
    serviceType: string;
    description: string;
    status: string;
    createdAt?: any;
    date?: string;
    location?: any;
    address?: string;
    provider?: {
        name: string;
        avatar?: string;
    };
    providerName?: string;
    budget?: number;
    price?: number;
}

interface RequestCardProps {
    request: UserJobRequest;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
    const rawDate = request.createdAt || request.date;
    const formattedDate = rawDate ? new Date(rawDate.seconds ? rawDate.seconds * 1000 : rawDate).toLocaleDateString() : 'Recent';
    const locationStr = formatJobLocation(request.location || request.address);
    const providerName = request.provider?.name || request.providerName;
    const budgetStr = formatJobBudget(request.budget, request.price);

    return (
        <Link href={`/dashboard/user/requests`} className="block group">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-200">
                <div className="flex justify-between items-start mb-3">
                    <div className="pr-2">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors">{request.serviceType}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{request.description}</p>
                    </div>
                    <RequestStatusBadge status={request.status} />
                </div>

                <div className="space-y-2 mb-4 pt-1 text-xs text-gray-600">
                    <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
                        <span className="line-clamp-1">{locationStr}</span>
                    </div>
                    {providerName && (
                        <div className="flex items-center">
                            <User className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
                            <span className="line-clamp-1 font-medium text-gray-700">Artisan: {providerName}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-sm font-extrabold text-emerald-700">
                        {budgetStr}
                    </span>
                    <div className="flex items-center text-primary text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>View Status</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                </div>
            </div>
        </Link>
    );
};
