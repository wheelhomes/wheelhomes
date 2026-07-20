import React from 'react';
import Link from 'next/link';
import { Request } from '@/lib/mock-requests-data';
import { RequestStatusBadge } from './RequestStatusBadge';
import { Calendar, MapPin, ChevronRight, User } from 'lucide-react';

interface RequestCardProps {
    request: Request;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
    return (
        <Link href={`/my-requests/details?id=${request.id}`} className="block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{request.serviceType}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1">{request.description}</p>
                    </div>
                    <RequestStatusBadge status={request.status} />
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(request.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="line-clamp-1">{request.address}</span>
                    </div>
                    {request.provider && (
                        <div className="flex items-center text-sm text-gray-600">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="line-clamp-1">Provider: {request.provider.name}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400 font-mono">#{request.id}</span>
                    <div className="flex items-center text-primary text-sm font-medium">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
            </div>
        </Link>
    );
};
