import React from 'react';
import { RequestCard } from '@/components/requests/RequestCard';
import { mockRequests } from '@/lib/mock-requests-data';
import { Search, Filter } from 'lucide-react';

export default function MyRequestsPage() {
    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                </div>

                <button className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                </button>
            </div>

            {/* Requests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                ))}
            </div>

            {/* Empty State (Hidden when data exists) */}
            {mockRequests.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100 border-dashed">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                    <p className="text-gray-500">You haven't made any service requests yet.</p>
                </div>
            )}
        </div>
    );
}
