"use client";

import { useState, useEffect } from 'react';
import { RequestCard, UserJobRequest } from '@/components/requests/RequestCard';
import { Search, Plus, Wrench } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<UserJobRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                const q = query(
                    collection(db, "job_requests"),
                    where("clientId", "==", user.uid)
                );

                unsubscribeDoc = onSnapshot(q, (snapshot) => {
                    const loaded: UserJobRequest[] = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as UserJobRequest));

                    loaded.sort((a, b) => {
                        const timeA = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0).getTime();
                        const timeB = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0).getTime();
                        return timeB - timeA;
                    });

                    setRequests(loaded);
                    setIsLoading(false);
                }, (error) => {
                    console.warn("My requests query notice:", error);
                    setIsLoading(false);
                });
            } else {
                setRequests([]);
                setIsLoading(false);
            }
        });

        return () => {
            if (unsubscribeDoc) unsubscribeDoc();
            unsubscribeAuth();
        };
    }, []);

    const filteredRequests = requests.filter(req => {
        const matchesSearch = searchTerm.trim() === "" ||
            req.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "all" || req.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Service Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Track artisan dispatches, active work orders, and completion settlements.</p>
                </div>
                <Link
                    href="/dashboard/user/request-service"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Book New Artisan</span>
                </Link>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by trade or description..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'open', label: 'Open' },
                        { id: 'in_progress', label: 'In Progress' },
                        { id: 'fully_completed', label: 'Completed' },
                    ].map(st => (
                        <button
                            key={st.id}
                            onClick={() => setSelectedStatus(st.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                selectedStatus === st.id
                                    ? 'bg-gray-900 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {st.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Requests Grid */}
            {isLoading ? (
                <div className="py-20 text-center text-gray-400 font-medium">Loading your service requests...</div>
            ) : filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map((request) => (
                        <RequestCard key={request.id} request={request} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-4">
                        <Wrench className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No requests found</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                        {searchTerm ? "No requests match your current search terms." : "You haven't requested any artisan services yet. Book a verified specialist today."}
                    </p>
                    <Link
                        href="/dashboard/user/request-service"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Book an Artisan Now</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
