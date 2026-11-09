"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, limit, doc, updateDoc, getDoc } from "firebase/firestore";
import {
    Briefcase,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NotificationData } from "../../../lib/notifications";
import ChatSheet from "../../../components/chat/ChatSheet";
import { JobCard } from "../../../components/dashboard/JobCard";
import { RequestWizard } from "../../../components/request/RequestWizard";
import MagicRequestInput from "../../../components/dashboard/MagicRequestInput";
import VerifiedProvidersDirectory from "@/components/services/VerifiedProvidersDirectory";
import { useServiceCategories, getLucideIcon } from "@/lib/service-categories";

interface JobRequest {
    id: string;
    clientId: string;
    providerId: string;
    providerName?: string;
    serviceType: string;
    status: "pending" | "accepted" | "in_progress" | "fully_completed" | "partially_completed" | "cancelled" | "rejected";
    description: string;
    budget: number;
    location: string;
    createdAt: any;
}

export default function UserDashboard() {
    const router = useRouter();
    const { activeCategories } = useServiceCategories();
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("User");
    const [isLoading, setIsLoading] = useState(true);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatJob, setChatJob] = useState<JobRequest | null>(null);

    const handleOpenChat = (job: JobRequest) => {
        setChatJob(job);
        setIsChatOpen(true);
    };

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [magicDescription, setMagicDescription] = useState("");

    const handleOpenWizard = (category: string) => {
        setSelectedCategory(category);
        setIsWizardOpen(true);
    };

    // Magic Request Logic
    const [isMagicLoading, setIsMagicLoading] = useState(false);

    const handleMagicAnalyze = async (text: string) => {
        setIsMagicLoading(true);
        try {
            const { auth } = await import("@/lib/firebase");
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/ai/magic-request", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ prompt: text }),
            });
            const data = await res.json();

            if (data.success) {
                setSelectedCategory(data.data.category.toLowerCase());
                setMagicDescription(data.data.description);
                setIsWizardOpen(true);
            } else {
                alert("AI could not understand the request. Please try again.");
            }
        } catch (error) {
            console.error("Magic Request Failed", error);
            alert("Something went wrong with the AI request.");
        } finally {
            setIsMagicLoading(false);
        }
    };

    // Notification State
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial Load - Authenticate & Fetch Profile
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserName(data.fullName || "User");
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                }

                // Check URL params for direct booking requests
                if (typeof window !== "undefined") {
                    const params = new URLSearchParams(window.location.search);
                    const cat = params.get("category");
                    const provName = params.get("providerName");
                    if (cat) {
                        setSelectedCategory(cat.toLowerCase());
                        if (provName) {
                            setMagicDescription(`Direct request for verified specialist: ${provName}`);
                        }
                        setIsWizardOpen(true);
                    }
                }
            } else {
                router.push("/signin");
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // Fetch My Jobs
    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, "job_requests"), where("clientId", "==", userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedJobs: JobRequest[] = snapshot.docs.map(
                (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    } as JobRequest)
            );

            setJobs(fetchedJobs);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    // Fetch Notifications
    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, "notifications"), where("recipientId", "==", userId), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            fetchedNotifs.sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).getTime() : 0;
                const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).getTime() : 0;
                return dateB - dateA;
            });

            // @ts-ignore
            setNotifications(fetchedNotifs as NotificationData[]);
            setUnreadCount(fetchedNotifs.filter((n: any) => !n.read).length);
        });

        return () => unsubscribe();
    }, [userId]);

    const markAsRead = async () => {
        if (unreadCount === 0) return;

        notifications.forEach(async (n: any) => {
            if (!n.read) {
                try {
                    const notifRef = doc(db, "notifications", n.id);
                    await updateDoc(notifRef, { read: true });
                } catch (e) {
                    console.error(e);
                }
            }
        });
        setUnreadCount(0);
    };

    const toggleNotifications = () => {
        if (!showNotifications) {
            markAsRead();
        }
        setShowNotifications(!showNotifications);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
            case "accepted":
            case "in_progress":
                return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                        <Zap className="w-3 h-3" /> Active
                    </span>
                );
            case "fully_completed":
                return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Done
                    </span>
                );
            case "cancelled":
            case "rejected":
                return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> Closed
                    </span>
                );
            case "partially_completed":
                return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" /> Attention
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="font-sans">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 p-4 md:p-6">
                    {/* Concierge / Core Services */}
                    <section>
                        <MagicRequestInput onAnalyze={handleMagicAnalyze} isLoading={isMagicLoading} />

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">What do you need help with?</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            {activeCategories.slice(0, 6).map((service) => {
                                const Icon = getLucideIcon(service.iconKey);
                                return (
                                    <button
                                        key={service.id}
                                        onClick={() => handleOpenWizard(service.id)}
                                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all group cursor-pointer"
                                    >
                                        <div
                                            className="p-3.5 rounded-full mb-3 group-hover:scale-110 transition-transform"
                                            style={{
                                                backgroundColor: `${service.colorHex}18`,
                                                color: service.colorHex,
                                            }}
                                        >
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <span className="font-semibold text-gray-700 group-hover:text-orange-600 transition-colors text-center text-xs md:text-sm line-clamp-1">
                                            {service.shortTitle}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Request Wizard */}
                    <RequestWizard
                        isOpen={isWizardOpen}
                        onClose={() => {
                            setIsWizardOpen(false);
                            setMagicDescription("");
                        }}
                        initialCategory={selectedCategory}
                        initialDescription={magicDescription}
                        userId={userId || ""}
                    />

                    {/* Active Requests */}
                    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Your Requests</h3>
                                <p className="text-sm text-gray-500">Track the status of your service requests</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="p-12 text-center text-gray-400">Loading requests...</div>
                            ) : jobs.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Briefcase className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900">No requests yet</h4>
                                    <p className="text-gray-500 mb-6">You haven&apos;t booked any services yet.</p>
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                        {jobs.slice(0, 3).map((job) => (
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                onOpenChat={handleOpenChat}
                                                statusBadge={getStatusBadge(job.status)}
                                            />
                                        ))}
                                    </div>

                                    {jobs.length > 3 && (
                                        <div className="text-center pt-4 border-t border-gray-100">
                                            <Link
                                                href="/dashboard/my-requests"
                                                className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                                            >
                                                View All {jobs.length} Requests →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Verified Service Providers Discovery */}
                    <section className="pt-2">
                        <VerifiedProvidersDirectory />
                    </section>
                </div>

                {chatJob && userId && (
                    <ChatSheet
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        jobId={chatJob.id}
                        currentUserId={userId}
                        currentUserName={userName}
                        recipientName={"Provider"}
                    />
                )}
            </div>
        </div>
    );
}
