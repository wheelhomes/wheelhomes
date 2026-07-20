"use client";

import { useState, useEffect } from "react";
import { Search, Briefcase, MapPin, Clock, Filter, CheckCircle, ArrowRight } from "lucide-react";
import { db } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { JobRequest } from "../../../../components/dashboard/provider/types";

export default function MarketPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState("all");

    useEffect(() => {
        const storedId = localStorage.getItem("tempUserId");
        if (!storedId) {
            router.push("/signin");
        } else {
            setProviderId(storedId);
        }
    }, []);

    useEffect(() => {
        // Query for OPEN jobs
        const q = query(
            collection(db, "job_requests"),
            where("status", "==", "open")
            // orderBy("createdAt", "desc") // Requires index, use client sort for now
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedJobs: JobRequest[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JobRequest));

            // Client side sort
            fetchedJobs.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA; // Newest first
            });

            setJobs(fetchedJobs);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAcceptJob = async (job: JobRequest) => {
        if (!providerId) return;
        const confirm = window.confirm(`Are you sure you want to accept this ${job.serviceType} job?`);
        if (!confirm) return;

        try {
            const jobRef = doc(db, "job_requests", job.id);
            await updateDoc(jobRef, {
                status: "accepted",
                providerId: providerId,
                acceptedAt: new Date().toISOString()
            });
            // Job will vanish from list due to realtime listener
            // Ideally show success toast
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
                                                <Clock className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">₦{(job.budget || 0).toLocaleString()}</div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{job.serviceType}</h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
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
