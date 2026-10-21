"use client";

import { useState, useEffect } from "react";
import { Search, Briefcase, MapPin, Clock, Filter, CheckCircle, ArrowRight } from "lucide-react";
import { db, auth } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { JobRequest } from "../../../../components/dashboard/provider/types";
import { formatJobLocation } from "@/lib/job-utils";

export default function MarketPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState("all");

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            const storedId = currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem("tempUserId") : null);
            if (!storedId) {
                router.push("/signin");
                return;
            }
            setProviderId(storedId);

            try {
                const userDoc = await getDoc(doc(db, "users", storedId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.status !== 'approved') {
                        if (data.status === 'pending_review' || data.status === 'pending' || data.status === 'rejected') {
                            router.replace("/dashboard/pending");
                        } else {
                            router.replace("/register/provider");
                        }
                    }
                }
            } catch (e) {
                console.error("Error verifying provider status in market:", e);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        let isSubscribed = true;
        let unsubscribeDirect: (() => void) | null = null;

        const processDocs = (docs: any[]) => {
            if (!isSubscribed) return;
            const fetchedJobs: JobRequest[] = docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as JobRequest))
                .filter(job => {
                    // Only active open marketplace dispatches
                    if (job.status !== "open") return false;
                    if ((job as any).isArchived) return false;
                    // Must not be already assigned to any provider
                    if (job.providerId && job.providerId !== "") return false;
                    // Must have a valid budget > 0
                    const budget = Number(job.budget ?? (job as any).price);
                    if (!budget || budget <= 0) return false;
                    return true;
                });

            fetchedJobs.sort((a, b) => {
                const timeA = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                const timeB = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
            });

            setJobs(fetchedJobs);
            setIsLoading(false);
        };

        try {
            const q = query(
                collection(db, "job_requests"),
                where("status", "==", "open")
            );

            unsubscribeDirect = onSnapshot(q, (snapshot) => {
                processDocs(snapshot.docs);
            }, (error) => {
                console.warn("Marketplace query notice:", error);
                setIsLoading(false);
            });
        } catch (e) {
            console.warn("Market listener initialization notice:", e);
            setIsLoading(false);
        }

        return () => {
            isSubscribed = false;
            if (unsubscribeDirect) unsubscribeDirect();
        };
    }, []);

    const handleAcceptJob = async (job: JobRequest) => {
        if (!providerId) return;

        try {
            const userDoc = await getDoc(doc(db, "users", providerId));
            if (!userDoc.exists() || userDoc.data().status !== 'approved') {
                alert("Your service provider account must be approved by an administrator before accepting jobs.");
                return;
            }

            const confirm = window.confirm(`Are you sure you want to accept this ${job.serviceType} job?`);
            if (!confirm) return;

            const nowIso = new Date().toISOString();
            const updates = {
                status: "accepted",
                providerId: providerId,
                acceptedAt: nowIso
            };

            const jobRef = doc(db, "job_requests", job.id);
            await updateDoc(jobRef, updates);
            try {
                await updateDoc(doc(db, "requests", job.id), updates);
            } catch (_) {}

            // Job will vanish from list due to realtime listener
            router.push(`/dashboard/provider/jobs`); // Redirect to My Jobs
        } catch (error) {
            console.error("Error accepting job:", error);
            alert("Failed to accept job. It might have been taken.");
        }
    };

    const filteredJobs = filterCategory === "all"
        ? jobs
        : jobs.filter(j => (j.category || j.serviceType.toLowerCase()) === filterCategory);

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">

            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Market</h1>
                <p className="text-gray-500">Pick up new jobs posted by clients in your area.</p>
            </div>

            {/* Filters */}
            <div className="max-w-5xl mx-auto mb-8 flex gap-3 overflow-x-auto pb-2">
                {["all", "plumbing", "electrical", "cleaning", "painting", "moving"].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-all ${filterCategory === cat
                                ? "bg-gray-900 text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Job Grid */}
            <div className="max-w-5xl mx-auto">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg">No open jobs currently</h3>
                        <p className="text-gray-500">Check back later or adjust your filters.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                                {/* Left: Info */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                ${job.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                                                    job.urgency === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}
                                            `}>
                                                {job.urgency || "Normal"}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(job.createdAt?.seconds ? job.createdAt.seconds * 1000 : (job.createdAt || Date.now())).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">₦{((job.budget ?? (job as any).price) || 0).toLocaleString()}</div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{job.serviceType}</h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4 flex-shrink-0" /> {formatJobLocation(job.location)}</span>
                                        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Verified Client</span>
                                    </div>
                                </div>

                                {/* Right: Action */}
                                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0">
                                    <button
                                        onClick={() => handleAcceptJob(job)}
                                        className="w-full md:w-auto px-6 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        Accept Job <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
