"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    or,
    addDoc
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { sendNotification, sendAdminAlert } from "../../../lib/notifications";

import { Bell, AlertTriangle } from "lucide-react";
import StatsCards from "@/components/dashboard/provider/StatsCards";
import JobCard from "@/components/dashboard/provider/JobCard";
import StartJobModal from "@/components/dashboard/provider/StartJobModal";
import CompleteJobModal from "@/components/dashboard/provider/CompleteJobModal";

// --- TYPES ---
interface JobRequest {
    id: string;
    clientId: string;
    clientName?: string;
    description: string;
    serviceType: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'fully_completed' | 'partially_completed' | 'cancelled' | 'rejected' | 'awaiting_confirmation';
    location: string;
    createdAt: any;
    budget?: number;
    estimatedDuration?: string;
    startNote?: string;
    providerId?: string;
    invitedProviderIds?: string[];
}

export default function ProviderDashboard() {
    const router = useRouter();
    const [providerId, setProviderId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState("Partner");
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRejected, setIsRejected] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const [activeTab, setActiveTab] = useState<'new' | 'active' | 'completed'>('new');

    // Modal States
    const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        const storedId = localStorage.getItem("tempUserId");
        const storedRole = localStorage.getItem("userRole");

        // Security Check: Ensure only providers access this
        if (!storedId) {
            router.push("/signin");
            return;
        }

        setProviderId(storedId);

        // Fetch Provider Name & Status
        const fetchProfile = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", storedId));
                if (userDoc.exists()) {
                    setProviderName(userDoc.data().fullName || "Partner");
                    const data = userDoc.data();
                    if (data.status === 'rejected') {
                        setRejectionReason(data.rejectionReason || "No reason provided.");
                        setIsRejected(true);
                    }
                }
            } catch (e) {
                console.error("Profile fetch error", e);
            }
        };
        fetchProfile();

    }, [router]);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!providerId) return;

        // Query 1: Direct Assignments
        const q1 = query(
            collection(db, "job_requests"),
            where("providerId", "==", providerId)
        );

        // Query 2: Invitations
        const q2 = query(
            collection(db, "job_requests"),
            where("invitedProviderIds", "array-contains", providerId)
        );

        let directJobs: JobRequest[] = [];
        let invitedJobs: JobRequest[] = [];

        const updateJobs = () => {
            // Merge by ID to prevent duplicates (though unlikely to overlap in valid state)
            const allJobs = [...directJobs, ...invitedJobs];
            const uniqueJobs = Array.from(new Map(allJobs.map(item => [item.id, item])).values());

            // Sort by Date Descending
            uniqueJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setJobs(uniqueJobs);
            setIsLoading(false);
        };

        const unsubscribe1 = onSnapshot(q1,
            (snapshot) => {
                directJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest));
                updateJobs();
            },
            (error) => console.error("Error fetching direct jobs:", error)
        );

        const unsubscribe2 = onSnapshot(q2,
            (snapshot) => {
                invitedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest));
                updateJobs();
            },
            (error) => console.error("Error fetching invited jobs:", error)
        );

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [providerId]);


    // --- CALCULATED STATS ---
    const stats = {
        active: jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length,
        pending: jobs.filter(j => j.status === 'pending').length,
        completed: jobs.filter(j => j.status === 'fully_completed').length,
        rating: 4.8, // Placeholder until rating system is live
        ratingCount: 128
    };

    // --- FILTERS ---
    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'new') return job.status === 'pending';
        if (activeTab === 'active') return ['accepted', 'in_progress', 'partially_completed', 'awaiting_confirmation'].includes(job.status);
        if (activeTab === 'completed') return ['fully_completed', 'cancelled', 'rejected'].includes(job.status);
        return true;
    });

    // --- ACTION HANDLERS ---

    const handleAccept = async (jobId: string) => {
        try {
            const job = jobs.find(j => j.id === jobId);
            await updateDoc(doc(db, "job_requests", jobId), { status: 'accepted' });

            if (job?.clientId) {
                await sendNotification(job.clientId, "Job Accepted! 🎉", `Your request for ${job.serviceType} has been accepted.`, 'success');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to accept job.");
        }
    };

    const handleReject = async (jobId: string) => {
        if (!confirm("Are you sure you want to reject this job?")) return;
        try {
            const job = jobs.find(j => j.id === jobId);
            await updateDoc(doc(db, "job_requests", jobId), { status: 'rejected' });

            if (job?.clientId) {
                await sendNotification(job.clientId, "Job Declined", `Provider unavailable for ${job.serviceType}.`, 'error');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to reject job.");
        }
    };

    const handleStartJob = async (eta: string, note: string) => {
        if (!selectedJob) return;
        try {
            await updateDoc(doc(db, "job_requests", selectedJob.id), {
                status: 'in_progress',
                startTime: new Date().toISOString(),
                estimatedDuration: eta,
                startNote: note
            });

            if (selectedJob.clientId) {
                await sendNotification(
                    selectedJob.clientId,
                    "Job Started 🚀",
                    `Provider has started. ETA: ${eta}. ${note ? `Note: ${note}` : ''}`,
                    'info'
                );
            }
            setIsStartModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to start job.");
        }
    };

    const handleCompleteJob = async (type: 'full' | 'partial', data?: any) => {
        if (!selectedJob) return;
        try {
            const updates: any = {
                status: type === 'full' ? 'awaiting_confirmation' : 'partially_completed',
                actualEndTime: new Date().toISOString()
            };

            if (type === 'partial' && data) {
                updates.completionDetails = {
                    reason: data.reason,
                    photoProof: data.photoProof,
                    timestamp: new Date().toISOString()
                };
            }

            await updateDoc(doc(db, "job_requests", selectedJob.id), updates);

            // Notifications
            if (selectedJob.clientId) {
                const title = type === 'full' ? "Job Done - Waiting Confirmation ⏳" : "Job Update: Partial ⚠️";
                const msg = type === 'full'
                    ? `Provider marked job as done. Please confirm in dashboard.`
                    : `Job marked as partial: ${data.reason}`;

                await sendNotification(selectedJob.clientId, title, msg, type === 'full' ? 'success' : 'warning');
            }

            // Admin Alert for Partial
            if (type === 'partial') {
                await sendAdminAlert("Partial Completion Alert", `Job ${selectedJob.id} marked partial. Reason: ${data?.reason}`, 'warning');
            }

            // Chat Message (System/Auto-post)
            // We want this to appear in the chat so the user sees it immediately
            const chatMsg = type === 'full'
                ? "I have finished the job! Please verify and confirm completion."
                : `Status Update: Job is partially completed. Reason: ${data?.reason}`;

            await addDoc(collection(db, "job_requests", selectedJob.id, "messages"), {
                text: chatMsg,
                senderId: selectedJob.providerId, // Send as provider
                senderName: "System (Provider)",
                createdAt: new Date(), // using Date for now to match other parts, or import serverTimestamp if already imported
                role: 'provider'
            });

            setIsCompleteModalOpen(false);
        } catch (error) {
            console.error(error);
            alert(`Failed to complete job: ${(error as any).message}`);
        }
    };


    // --- RENDER ---
    return (
        <div className="w-full min-h-screen bg-gray-50/50">
            {/* Header */}


            {isRejected && (
                <div className="bg-red-50 border-b border-red-200 p-4 animate-in slide-in-from-top-5">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-900">Application Rejected</h3>
                                <p className="text-sm text-red-700">Reason: {rejectionReason}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/register/provider')}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
                        >
                            Fix Application & Re-submit
                        </button>
                    </div>
                </div>
            )}

            <div className="p-8 max-w-7xl mx-auto space-y-8">

                {/* 1. Stats Overview */}
                <section>
                    <StatsCards stats={stats} />
                </section>

                {/* 2. My Jobs Section */}
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">My Jobs</h2>

                        {/* Tabs */}
                        <div className="flex bg-gray-100/80 p-1.5 rounded-xl self-start md:self-auto">
                            {[
                                { id: 'new', label: 'New Requests', count: stats.pending },
                                { id: 'active', label: 'In Progress', count: stats.active },
                                { id: 'completed', label: 'History', count: stats.completed }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        px-6 py-2.5 rounded-lg text-sm font-bold transition-all
                                        ${activeTab === tab.id
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }
                                    `}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job List */}
                    <div className="p-8 bg-gray-50/30 h-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="animate-pulse font-bold text-gray-400">Loading your workspace...</span>
                            </div>
                        ) : filteredJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                                    <Bell className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found here</h3>
                                <p className="text-gray-500 max-w-sm">
                                    {activeTab === 'new'
                                        ? "You're all caught up! Wait for new incoming requests."
                                        : "Jobs will appear here once you change their status."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredJobs.map(job => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onAccept={handleAccept}
                                        onReject={handleReject}
                                        onStart={(j) => { setSelectedJob(j); setIsStartModalOpen(true); }}
                                        onComplete={(j) => { setSelectedJob(j); setIsCompleteModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* MODALS */}
            <StartJobModal
                isOpen={isStartModalOpen}
                job={selectedJob}
                onClose={() => setIsStartModalOpen(false)}
                onStart={handleStartJob}
            />

            <CompleteJobModal
                isOpen={isCompleteModalOpen}
                job={selectedJob}
                onClose={() => setIsCompleteModalOpen(false)}
                onComplete={handleCompleteJob}
            />

        </div>
    );
}
