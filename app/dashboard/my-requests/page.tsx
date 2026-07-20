"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { RequestCard, Request } from "@/components/dashboard/RequestCard";
import { RequestStatus } from "@/components/dashboard/StatusBadge";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";

type FilterType = "All" | "Active" | "History";

export default function MyRequestsPage() {
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState<FilterType>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // Get user ID from localStorage
    useEffect(() => {
        const storedId = localStorage.getItem("tempUserId");
        if (!storedId) {
            router.push("/signin");
        } else {
            setUserId(storedId);
            setIsAuthChecking(false);
        }
    }, [router]);

    // Map Firebase status to display status
    const mapFirebaseStatus = (status: string): RequestStatus => {
        const statusMap: Record<string, RequestStatus> = {
            "pending": "Pending",
            "assigned": "In Progress",
            "accepted": "In Progress",
            "in_progress": "In Progress",
            "completed": "Completed",
            "fully_completed": "Completed",
            "partially_completed": "Action Required",
            "awaiting_confirmation": "Action Required",
            "cancelled": "Rejected",
            "rejected": "Rejected",
        };
        return statusMap[status] || "Pending";
    };

    // Fetch requests from Firebase in real-time
    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, "job_requests"),
            where("clientId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRequests: Request[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.description || data.serviceType || "Service Request",
                    status: mapFirebaseStatus(data.status),
                    date: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    location: data.location || "Location not specified",
                    category: data.serviceType || "General",
                    provider: data.providerId ? {
                        id: data.providerId,
                        name: data.providerName || "Provider",
                        rating: data.providerRating || 4.5,
                    } : undefined,
                    eta: data.estimatedCompletionTime?.toDate?.()?.toISOString(),
                    completedAt: data.actualCompletionTime?.toDate?.()?.toISOString(),
                    cost: data.price ? {
                        amount: data.price,
                        currency: data.currency || "$",
                        isFinal: data.status === "completed",
                    } : undefined,
                    timeline: data.history?.map((h: any, idx: number) => ({
                        id: `${idx}`,
                        status: h.status,
                        description: h.note || `Status changed to ${h.status}`,
                        timestamp: h.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                    })) || [],
                    unreadMessages: 0, // TODO: Implement message count
                    actionRequired: data.status === "awaiting_confirmation" || data.status === "partially_completed",
                    isOverdue: data.estimatedCompletionTime &&
                        data.estimatedCompletionTime.toDate() < new Date() &&
                        data.status !== "completed" && data.status !== "fully_completed" && data.status !== "cancelled" && data.status !== "rejected",
                } as Request;
            });

            setRequests(fetchedRequests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching requests:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500">Verifying session...</p>
                </div>
            </div>
        );
    }

    const filteredRequests = requests.filter((req) => {
        // 1. Text Search
        const matchesSearch =
            req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.id.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // 2. Status Filter
        if (activeFilter === "All") return true;
        if (activeFilter === "Active") {
            return ["Pending", "In Progress", "Action Required"].includes(req.status);
        }
        if (activeFilter === "History") {
            return ["Completed", "Rejected", "Cancelled"].includes(req.status);
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto">

                {/* Sticky Header Section */}
                <div className="sticky top-0 z-10 bg-gray-50 pt-8 px-6 md:px-8 pb-4 border-b border-gray-200/50 shadow-sm transition-all">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Requests</h1>
                            <p className="text-gray-500">Track and manage your service requests.</p>
                        </div>
                        <Link
                            href="/dashboard/user"
                            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
                        >
                            <Plus className="w-5 h-5" /> New Request
                        </Link>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Total Requests</p>
                            <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">In Progress</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {requests.filter((r: Request) => r.status === "In Progress").length}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Action Required</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {requests.filter((r: Request) => r.actionRequired).length}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">Completed</p>
                            <p className="text-2xl font-bold text-green-600">
                                {requests.filter((r: Request) => r.status === "Completed").length}
                            </p>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">

                        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                            {(["All", "Active", "History"] as FilterType[]).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${activeFilter === filter
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by ID or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Request Grid */}
                <div className="px-6 md:px-8 py-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500">Loading your requests...</p>
                        </div>
                    ) : filteredRequests.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {filteredRequests.map((request) => (
                                <RequestCard key={request.id} request={request} />
                            ))}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Filter className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
                            <p className="text-gray-500 max-w-sm text-center mb-6">
                                We couldn't find any requests matching your filters. Try adjusting your search or create a new request.
                            </p>
                            {activeFilter !== "All" && (
                                <button
                                    onClick={() => { setActiveFilter("All"); setSearchQuery(""); }}
                                    className="text-orange-600 hover:text-orange-700 font-medium"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
