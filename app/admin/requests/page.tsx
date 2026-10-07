"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, onSnapshot, doc, getDoc, orderBy, limit, where } from "firebase/firestore";
import {
    LayoutDashboard,
    Search,
    Clock,
    CheckCircle,
    XCircle,
    Briefcase,
    MapPin,
    AlertTriangle,
    Eye,
    User,
    DollarSign,
    X,
    MessageSquare,
    Bell,
    Smartphone,
    Globe,
    CreditCard,
    Image as ImageIcon
} from "lucide-react";
import { UnifiedChat } from "@/components/chat/UnifiedChat";

interface JobRequest {
    id: string;
    source: 'web' | 'mobile';
    rawCollection: 'job_requests' | 'requests';
    clientId: string;
    clientName: string;
    providerId: string;
    serviceType: string;
    status: string;
    description: string;
    location: string;
    createdAt: any;
    budget: number;
    paymentStatus?: string;
    escrowReference?: string;
    escrowAmount?: number;
    images?: string[];
    rejectionReason?: string;

    // Timing & Partial completion
    startTime?: any;
    estimatedDuration?: string;
    startNote?: string;
    actualEndTime?: any;
    completionDetails?: {
        reason: string;
        photoProof: string;
        timestamp: any;
    };
}

interface UserDetails {
    fullName: string;
    email: string;
    role: string;
    phone?: string;
    state?: string;
    city?: string;
    address?: string;
    businessName?: string;
}

export default function AdminServiceRequestsPage() {
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [providersMap, setProvidersMap] = useState<Record<string, string>>({}); // Map ID -> Name
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterSource, setFilterSource] = useState<"All" | "web" | "mobile">("All");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
    const [providerDetails, setProviderDetails] = useState<UserDetails | null>(null);
    const [clientDetails, setClientDetails] = useState<UserDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        let webJobsList: JobRequest[] = [];
        let mobileJobsList: JobRequest[] = [];

        const updateAllJobs = () => {
            const combined = [...webJobsList, ...mobileJobsList];
            combined.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            setJobs(combined);
            setIsLoading(false);
        };

        // 1. Fetch Web Job Requests
        const qWeb = query(collection(db, "job_requests"));
        const unsubWeb = onSnapshot(qWeb, (snapshot) => {
            webJobsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    source: 'web' as const,
                    rawCollection: 'job_requests' as const,
                    clientId: data.clientId || '',
                    clientName: data.clientName || 'Web Client',
                    providerId: data.providerId || '',
                    serviceType: data.serviceType || 'Service Request',
                    status: data.status || 'pending',
                    description: data.description || '',
                    location: typeof data.location === 'object' ? (data.location?.address || JSON.stringify(data.location)) : (data.location || 'Not specified'),
                    budget: Number(data.budget || 0),
                    paymentStatus: data.paymentStatus,
                    escrowReference: data.escrowReference,
                    escrowAmount: data.escrowAmount,
                    images: data.images || [],
                    rejectionReason: data.rejectionReason,
                    startTime: data.startTime,
                    estimatedDuration: data.estimatedDuration,
                    startNote: data.startNote,
                    actualEndTime: data.actualEndTime,
                    completionDetails: data.completionDetails,
                    createdAt: data.createdAt
                };
            });
            updateAllJobs();
        }, (err) => console.error("Web requests listener error", err));

        // 2. Fetch Mobile Requests
        const qMobile = query(collection(db, "requests"));
        const unsubMobile = onSnapshot(qMobile, (snapshot) => {
            mobileJobsList = snapshot.docs.map(doc => {
                const data = doc.data();
                let locStr = 'Not specified';
                if (typeof data.location === 'string') locStr = data.location;
                else if (typeof data.location === 'object' && data.location) locStr = data.location.address || data.location.city || JSON.stringify(data.location);

                return {
                    id: doc.id,
                    source: 'mobile' as const,
                    rawCollection: 'requests' as const,
                    clientId: data.userId || data.clientId || '',
                    clientName: data.clientName || data.userName || 'Mobile App User',
                    providerId: data.providerId || '',
                    serviceType: data.serviceType || 'Service Booking',
                    status: data.status === 'assigned' ? 'in_progress' : (data.status || 'pending'),
                    description: data.description || '',
                    location: locStr,
                    budget: Number(data.price || data.budget || 0),
                    paymentStatus: data.paymentStatus,
                    escrowReference: data.escrowReference,
                    escrowAmount: data.escrowAmount,
                    images: data.images || [],
                    createdAt: data.createdAt
                };
            });
            updateAllJobs();
        }, (err) => console.error("Mobile requests listener error", err));

        // 3. Fetch Providers for lookup
        const fetchProviders = async () => {
            try {
                const map: Record<string, string> = {};

                // Fetch from user_applications (Service Providers)
                const appsSnap = await import("firebase/firestore").then(mod => mod.getDocs(collection(db, "user_applications")));
                appsSnap.docs.forEach(doc => {
                    const d = doc.data();
                    const details = d.data || d;
                    const name = details.businessName || details.fullName || "Provider";
                    map[doc.id] = name;
                });

                // Fetch from users (Fallbacks)
                const usersSnap = await import("firebase/firestore").then(mod => mod.getDocs(collection(db, "users")));
                usersSnap.docs.forEach(doc => {
                    if (!map[doc.id]) {
                        const d = doc.data();
                        map[doc.id] = d.businessName || d.fullName || "User";
                    }
                });

                setProvidersMap(map);
            } catch (err) {
                console.error("Error fetching providers map", err);
            }
        };
        fetchProviders();

        return () => {
            unsubWeb();
            unsubMobile();
        };
    }, []);

    const fetchExtraDetails = async (job: JobRequest) => {
        setIsLoadingDetails(true);
        setSelectedJob(job);
        setProviderDetails(null);
        setClientDetails(null);

        try {
            // Fetch Provider from user_applications or users
            if (job.providerId) {
                const provRef = doc(db, "user_applications", job.providerId);
                const provSnap = await getDoc(provRef);
                if (provSnap.exists()) {
                    setProviderDetails(provSnap.data().data as UserDetails);
                } else {
                    const userRef = doc(db, "users", job.providerId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const d = userSnap.data();
                        setProviderDetails({
                            fullName: d.fullName || d.displayName || "Provider",
                            email: d.email || "",
                            role: d.role || "service_provider",
                            phone: d.phone,
                            state: d.state,
                            city: d.city,
                            address: d.address,
                            businessName: d.businessName,
                        });
                    }
                }
            }

            // Fetch Client from user_applications or users
            if (job.clientId) {
                const clientRef = doc(db, "user_applications", job.clientId);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) {
                    setClientDetails(clientSnap.data().data as UserDetails);
                } else {
                    const userRef = doc(db, "users", job.clientId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const d = userSnap.data();
                        setClientDetails({
                            fullName: d.fullName || d.displayName || job.clientName,
                            email: d.email || "",
                            role: d.role || "user",
                            phone: d.phone,
                            state: d.state,
                            city: d.city,
                            address: d.address,
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching details", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const closeModal = () => {
        setSelectedJob(null);
        setProviderDetails(null);
        setClientDetails(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
            case "accepted":
            case "in_progress": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><Briefcase className="w-3 h-3" /> Active</span>;
            case "fully_completed": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Completed</span>;
            case "cancelled":
            case "rejected": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Rejected</span>;
            case "partially_completed": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Partial</span>;
            default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    const filteredJobs = jobs.filter(job => {
        const providerName = providersMap[job.providerId] || "";
        const matchesSearch =
            job.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            providerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === "All" ||
            (filterStatus === "Active" && ['accepted', 'in_progress', 'assigned'].includes(job.status)) ||
            (filterStatus === "Completed" && (job.status === 'fully_completed' || job.status === 'completed')) ||
            (filterStatus === "Rejected" && ['rejected', 'cancelled'].includes(job.status)) ||
            (filterStatus === "Pending" && job.status === 'pending');

        const matchesSource = filterSource === "All" || job.source === filterSource;

        return matchesSearch && matchesStatus && matchesSource;
    });

    // Admin Alerts State
    const [adminAlerts, setAdminAlerts] = useState<any[]>([]);
    const [adminAlertsOpen, setAdminAlertsOpen] = useState(false);

    useEffect(() => {
        // Listen for Admin Alerts
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", "admin"),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAdminAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-8 font-sans">
            {/* Header & Notifications */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Request Log</h1>
                    <p className="text-gray-500">Unified marketplace overview across Mobile & Web platforms.</p>
                </div>

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setAdminAlertsOpen(!adminAlertsOpen)}
                        className="p-2 sm:p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm relative group"
                    >
                        <Bell className={`w-5 h-5 ${adminAlerts.length > 0 ? 'text-gray-700' : 'text-gray-400'}`} />
                        {adminAlerts.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white" />
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {adminAlertsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                                <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">{adminAlerts.length}</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {adminAlerts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">No new notifications</div>
                                ) : (
                                    adminAlerts.map(alert => (
                                        <div key={alert.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3">
                                            <div className="bg-red-50 p-2 h-fit rounded-lg text-red-500 shrink-0">
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-xs mb-1 line-clamp-1">{alert.title}</h4>
                                                <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{alert.message}</p>
                                                <p className="text-[10px] text-gray-300 mt-2">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {adminAlerts.length > 0 && (
                                <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all as read</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        {(["All", "Pending", "Active", "Completed", "Rejected"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${filterStatus === status
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Source Filter */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterSource("All")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${filterSource === "All"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            All Sources
                        </button>
                        <button
                            onClick={() => setFilterSource("web")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${filterSource === "web"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <Globe className="w-3 h-3" /> Web
                        </button>
                        <button
                            onClick={() => setFilterSource("mobile")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${filterSource === "mobile"
                                ? "bg-white text-purple-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <Smartphone className="w-3 h-3" /> Mobile
                        </button>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search provider, client, ID..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Channel / Job ID</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Client</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Service & Budget</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Escrow</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading unified request logs...</td></tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No requests match your filters.</td></tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={`${job.rawCollection}_${job.id}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                {job.source === 'mobile' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Smartphone className="w-3 h-3" /> Mobile
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        <Globe className="w-3 h-3" /> Web
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">#{job.id.slice(0, 8)}</div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900 text-sm">
                                                {job.providerId ? (providersMap[job.providerId] || "Assigned Provider") : (
                                                    <span className="text-gray-400 italic">Unassigned (Open)</span>
                                                )}
                                            </div>
                                            {job.providerId && (
                                                <div className="text-xs text-gray-400 font-mono">ID: {job.providerId.slice(0, 8)}</div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 text-sm">{job.clientName}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[150px]">{job.location}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 text-sm">{job.serviceType}</div>
                                            <div className="text-xs font-semibold text-green-700">
                                                {job.budget > 0 ? `₦${job.budget.toLocaleString()}` : "Price upon request"}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {job.paymentStatus === 'escrow_held' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                    <CreditCard className="w-3 h-3" /> Escrow Held
                                                </span>
                                            ) : job.paymentStatus === 'released' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    <CheckCircle className="w-3 h-3" /> Released
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">None</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(job.status)}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => fetchExtraDetails(job)}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Request #{selectedJob.id.slice(0, 8)}
                                    </h2>
                                    {getStatusBadge(selectedJob.status)}
                                    {selectedJob.source === 'mobile' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                            <Smartphone className="w-3 h-3" /> Mobile App
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                            <Globe className="w-3 h-3" /> Web
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">Created on {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString() : 'N/A'}</p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-8">
                            {isLoadingDetails ? (
                                <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                    <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-orange-600 rounded-full mb-2"></div>
                                    Loading details...
                                </div>
                            ) : (
                                <>
                                    {/* 1. Job Description */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-gray-400" /> Service Request
                                        </h3>
                                        <p className="text-gray-800 font-medium text-lg mb-1">{selectedJob.serviceType}</p>
                                        <p className="text-gray-600 mb-3">{selectedJob.description}</p>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <div className="flex items-center gap-1 text-gray-500 bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                                                <MapPin className="w-3 h-3" /> {selectedJob.location}
                                            </div>
                                            <div className="flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1 rounded-md border border-green-100 shadow-sm font-bold">
                                                <DollarSign className="w-3 h-3" /> Budget: {selectedJob.budget > 0 ? `₦${selectedJob.budget.toLocaleString()}` : 'Price upon request'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 1.2 Escrow & Payment Details */}
                                    {selectedJob.paymentStatus && (
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-emerald-600" /> Escrow Payment Status
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500 text-xs">Escrow Status: </span>
                                                    <div className="font-semibold text-emerald-900 capitalize">
                                                        {selectedJob.paymentStatus.replace('_', ' ')}
                                                    </div>
                                                </div>
                                                {selectedJob.escrowReference && (
                                                    <div>
                                                        <span className="text-gray-500 text-xs">Payment Reference: </span>
                                                        <div className="font-mono text-xs font-bold text-gray-800">
                                                            {selectedJob.escrowReference}
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedJob.escrowAmount ? (
                                                    <div>
                                                        <span className="text-gray-500 text-xs">Escrow Amount: </span>
                                                        <div className="font-bold text-emerald-700">
                                                            ₦{selectedJob.escrowAmount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* 1.3 Client Uploaded Photos */}
                                    {selectedJob.images && selectedJob.images.length > 0 && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-gray-500" /> Attached Photos ({selectedJob.images.length})
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {selectedJob.images.map((imgUrl, idx) => (
                                                    <a key={idx} href={imgUrl} target="_blank" rel="noreferrer" className="block group">
                                                        <img
                                                            src={imgUrl}
                                                            alt={`Request upload ${idx + 1}`}
                                                            className="w-full h-24 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 1.5 Job Timing & ETA - NEW */}
                                    {(selectedJob.estimatedDuration || selectedJob.startTime) && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-4 justify-between">
                                            <div>
                                                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1 flex items-center gap-2">
                                                    <Clock className="w-3 h-3" /> Job Timing
                                                </h3>
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Started: </span>
                                                    <span className="font-semibold text-gray-900">{selectedJob.startTime ? new Date(selectedJob.startTime).toLocaleString() : 'N/A'}</span>
                                                </div>
                                                {selectedJob.actualEndTime && (
                                                    <div className="text-sm">
                                                        <span className="text-gray-500">Completed: </span>
                                                        <span className="font-semibold text-gray-900">{new Date(selectedJob.actualEndTime).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-white/50 p-2 rounded-lg border border-blue-100 min-w-[120px]">
                                                <div className="text-xs text-blue-600">Est. Duration</div>
                                                <div className="font-bold text-blue-900 text-lg">{selectedJob.estimatedDuration || "N/A"}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 1.6 Completion Evidence - NEW */}
                                    {selectedJob.completionDetails && (
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                            <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-3 h-3" /> Partial Completion Report
                                            </h3>
                                            <p className="text-sm text-gray-800 mb-2"><strong>Reason:</strong> {selectedJob.completionDetails.reason}</p>
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-500 mb-1">Proof:</p>
                                                <a href={selectedJob.completionDetails.photoProof} target="_blank" rel="noreferrer">
                                                    <img
                                                        src={selectedJob.completionDetails.photoProof}
                                                        alt="Proof"
                                                        className="h-32 w-auto rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                                                    />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rejection Reason (if applicable) */}
                                    {selectedJob.status === 'rejected' && selectedJob.rejectionReason && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Rejection Reason
                                            </h3>
                                            <p className="text-red-700">{selectedJob.rejectionReason}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 2. Client Details */}
                                        <div className="border border-gray-100 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                                <User className="w-4 h-4 text-blue-500" /> Client Details
                                            </h3>
                                            {clientDetails ? (
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Name:</span>
                                                        <span className="font-semibold text-gray-900">{clientDetails.fullName}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Email:</span>
                                                        <span className="font-medium text-gray-900">{clientDetails.email}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Phone:</span>
                                                        <span className="font-medium text-gray-900">{clientDetails.phone || "N/A"}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Location:</span>
                                                        <span className="font-medium text-gray-900">{clientDetails.city}, {clientDetails.state}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500 text-sm italic">Client details not found.</div>
                                            )}
                                        </div>

                                        {/* 3. Provider Details */}
                                        <div className="border border-gray-100 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                                <Briefcase className="w-4 h-4 text-orange-500" /> Assigned Provider
                                            </h3>
                                            {providerDetails ? (
                                                <div className="space-y-3 text-sm">
                                                    <div>
                                                        <div className="text-gray-500 text-xs">Provider / Business Name</div>
                                                        <div className="font-bold text-lg text-gray-900">
                                                            {providerDetails.businessName || providerDetails.fullName}
                                                        </div>
                                                        {/* Show Real Name if Business Name exists */}
                                                        {providerDetails.businessName && (
                                                            <div className="text-xs text-gray-500">Contact: {providerDetails.fullName}</div>
                                                        )}
                                                        <div className="font-mono text-xs text-orange-600 bg-orange-50 inline-block px-1 rounded mt-1">
                                                            ID: {selectedJob.providerId}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-gray-50">
                                                        <div className="flex justify-between py-1">
                                                            <span className="text-gray-500">Email:</span>
                                                            <span className="font-medium text-gray-900">{providerDetails.email}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1">
                                                            <span className="text-gray-500">Phone:</span>
                                                            <span className="font-medium text-gray-900">{providerDetails.phone || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500 text-sm italic">Provider details not found.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4. Communication Log (Read-Only) */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mt-6">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <MessageSquare className="w-4 h-4 text-purple-500" /> Communication Log
                                        </h3>
                                        {/* Force re-mount when selectedJob changes using key */}
                                        <UnifiedChat
                                            key={selectedJob.id}
                                            requestId={selectedJob.id}
                                            readOnly={true}
                                            currentUserRole="admin"
                                            className="h-[400px]"
                                            clientName={clientDetails?.fullName || selectedJob.clientName}
                                            providerName={providerDetails?.businessName || providerDetails?.fullName || providersMap[selectedJob.providerId]}
                                            jobProviderId={selectedJob.providerId}
                                            jobClientId={selectedJob.clientId}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button onClick={closeModal} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
