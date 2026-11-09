"use client";

import { useState, useEffect } from "react";
import {
    Briefcase,
    MapPin,
    Clock,
    Crown,
    UserCheck,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";
import { db, auth } from "../../../../lib/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { JobRequest } from "../../../../components/dashboard/provider/types";
import { formatJobLocation } from "@/lib/job-utils";
import { useHodDirectory } from "@/lib/hod-routing";
import AssignAssistantModal from "@/components/dashboard/provider/AssignAssistantModal";

export default function MarketPage() {
    const router = useRouter();
    const { activeAssignments: hodAssignments, assistants: directoryAssistants } = useHodDirectory();

    const [departmentJobs, setDepartmentJobs] = useState<JobRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState<string>("Partner");
    const [providerProfile, setProviderProfile] = useState<Record<string, any> | null>(null);
    const [dispatchingJob, setDispatchingJob] = useState<JobRequest | null>(null);

    const myHodDepartments = hodAssignments.filter((h) => h.hodUid === providerId);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            const storedId =
                currentUser?.uid ||
                (typeof window !== "undefined" ? localStorage.getItem("tempUserId") : null);
            if (!storedId) {
                router.push("/signin");
                return;
            }
            setProviderId(storedId);

            try {
                const userDoc = await getDoc(doc(db, "users", storedId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.status !== "approved") {
                        if (
                            data.status === "pending_review" ||
                            data.status === "pending" ||
                            data.status === "rejected"
                        ) {
                            router.replace("/dashboard/pending");
                        } else {
                            router.replace("/register/provider");
                        }
                        return;
                    }
                    setProviderProfile(data);
                    setProviderName(data.fullName || data.businessName || "Partner");
                }
            } catch (e) {
                console.error("Error verifying provider status in department hub:", e);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Listen ONLY to jobs routed to this provider/HOD (never broadcast all client requests to everyone)
    useEffect(() => {
        if (!providerId) return;

        const qDirect = query(
            collection(db, "job_requests"),
            where("providerId", "==", providerId)
        );
        const qInvited = query(
            collection(db, "job_requests"),
            where("invitedProviderIds", "array-contains", providerId)
        );

        let directList: JobRequest[] = [];
        let invitedList: JobRequest[] = [];

        const mergeAndSet = () => {
            const byId = new Map<string, JobRequest>();
            for (const j of [...directList, ...invitedList]) {
                if ((j as any).isArchived || (j.status as string) === "archived") continue;
                if (["pending", "accepted"].includes(j.status)) {
                    byId.set(j.id, j);
                }
            }
            const combined = Array.from(byId.values());
            combined.sort((a, b) => {
                const timeA = b.createdAt?.seconds
                    ? b.createdAt.seconds * 1000
                    : new Date(b.createdAt || 0).getTime();
                const timeB = a.createdAt?.seconds
                    ? a.createdAt.seconds * 1000
                    : new Date(a.createdAt || 0).getTime();
                return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
            });
            setDepartmentJobs(combined);
            setIsLoading(false);
        };

        const unsub1 = onSnapshot(
            qDirect,
            (snap) => {
                directList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobRequest));
                mergeAndSet();
            },
            () => setIsLoading(false)
        );

        const unsub2 = onSnapshot(
            qInvited,
            (snap) => {
                invitedList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobRequest));
                mergeAndSet();
            },
            () => setIsLoading(false)
        );

        return () => {
            unsub1();
            unsub2();
        };
    }, [providerId]);

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold uppercase tracking-wider mb-2">
                            <Crown className="w-3.5 h-3.5 text-purple-600" />
                            1 Request = 1 Category + 1 Location = 1 HOD
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Department Dispatch Hub
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Client requests are routed exclusively to the designated Head of Department (HOD) for each service &amp; state.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push("/dashboard/provider/jobs")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold cursor-pointer self-start"
                    >
                        Go to My Jobs
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* HOD Status Card */}
                {myHodDepartments.length > 0 ? (
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-md space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
                            <Crown className="w-4 h-4 text-amber-300" />
                            Your Active HOD Departments ({myHodDepartments.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {myHodDepartments.map((d) => (
                                <span
                                    key={d.key}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-bold"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                                    {d.categoryName} • {d.stateName} State
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-purple-100">
                            All new client requests matching your service category and state appear below so you can review and dispatch the nearest assistant.
                        </p>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-gray-900 text-sm">
                                Managed Department Routing Active
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Client service requests do not go to a public bidding feed. Instead, each request routes directly to the{" "}
                                <strong>Head of Department (HOD)</strong> for that service category in the client&apos;s state, who dispatches the nearest available technician. Any job assigned to you appears immediately below and in{" "}
                                <strong>My Jobs</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Incoming Department / Assigned Requests */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                        Incoming Department Dispatches ({departmentJobs.length})
                    </h2>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            Loading department dispatches...
                        </div>
                    ) : departmentJobs.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">
                                No pending dispatches right now
                            </h3>
                            <p className="text-gray-500 text-xs max-w-md mx-auto">
                                When a client in your state submits a request for your department, it will route directly here.
                            </p>
                        </div>
                    ) : (
                        departmentJobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-6"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                            {job.serviceType}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800">
                                            {job.status}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {job.createdAt
                                                ? new Date(job.createdAt).toLocaleDateString()
                                                : "Just now"}
                                        </span>
                                    </div>

                                    <p className="text-gray-800 text-sm font-medium">
                                        {job.description}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                            {formatJobLocation(job.location)}
                                        </span>
                                        {(job as any).assignedAssistant?.name && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                Dispatched: {(job as any).assignedAssistant.name} (
                                                {(job as any).assignedAssistant.area})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center gap-2 min-w-[200px] border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                    <button
                                        onClick={() => setDispatchingJob(job)}
                                        className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        Dispatch Nearest Assistant
                                    </button>
                                    <button
                                        onClick={() => router.push("/dashboard/provider/jobs")}
                                        className="w-full py-2 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                        Manage in My Jobs
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <AssignAssistantModal
                isOpen={Boolean(dispatchingJob)}
                job={dispatchingJob}
                hodUid={providerId || ""}
                hodName={providerName}
                hodProfile={providerProfile}
                directoryAssistants={directoryAssistants}
                onClose={() => setDispatchingJob(null)}
            />
        </div>
    );
}
