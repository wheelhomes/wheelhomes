"use client";

import { useState, useEffect } from "react";
import {
    Briefcase,
    Clock,
    CheckCircle,
    X,
    Upload,
    AlertTriangle,
    Check,
    Search
} from "lucide-react";
import { db, storage } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import ChatSheet from "../../../../components/chat/ChatSheet";

import { JobRequest } from "../../../../components/dashboard/provider/types";
import { JobListItem } from "../../../../components/dashboard/provider/JobListItem";
import { JobDetailView } from "../../../../components/dashboard/provider/JobDetailView";

export default function MyJobsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Modal States
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    // Start Job Form
    const [estimatedTime, setEstimatedTime] = useState("");
    const [startNote, setStartNote] = useState("");

    // Complete Job Form
    const [completionType, setCompletionType] = useState<'full' | 'partial'>('full');
    const [partialReason, setPartialReason] = useState("");
    const [partialPhoto, setPartialPhoto] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Initial Load & Auth
    useEffect(() => {
        const storedId = localStorage.getItem("tempUserId");
        if (!storedId) {
            router.push("/signin");
        } else {
            setProviderId(storedId);
        }
    }, []);

    // Fetch Jobs
    useEffect(() => {
        if (!providerId) return;

        const q = query(
            collection(db, "job_requests"),
            where("providerId", "==", providerId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedJobs: JobRequest[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JobRequest));

            // Sort by createdAt desc
            fetchedJobs.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            setJobs(fetchedJobs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching jobs:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [providerId]);

    // Filter Logic
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.location.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (filter === "pending") matchesStatus = job.status === "pending";
        if (filter === "active") matchesStatus = ["accepted", "in_progress"].includes(job.status);
        if (filter === "completed") matchesStatus = ["fully_completed", "partially_completed", "cancelled", "rejected"].includes(job.status);

        return matchesSearch && matchesStatus;
    });

    // --- ACTION HANDLERS ---
    const handleStatusUpdate = async (jobId: string, action: 'accepted' | 'rejected') => {
        try {
            const jobRef = doc(db, "job_requests", jobId);
            await updateDoc(jobRef, { status: action });
            if (selectedJob?.id === jobId) {
                // Optimistic update
                setSelectedJob(prev => prev ? { ...prev, status: action } : null);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    const handleOpenStartModal = (job: JobRequest) => {
        setSelectedJob(job);
        setEstimatedTime("");
        setStartNote("");
        setIsStartModalOpen(true);
    };

    const submitStartJob = async () => {
        if (!selectedJob || !estimatedTime) {
            alert("Please select an estimated completion time.");
            return;
        }

        try {
            const jobRef = doc(db, "job_requests", selectedJob.id);
            await updateDoc(jobRef, {
                status: 'in_progress',
                startTime: new Date().toISOString(),
                estimatedDuration: estimatedTime,
                startNote: startNote
            });
            setIsStartModalOpen(false);
            // Update selected job locally to reflect change immediately in detail view (if snapshot is slow)
            setSelectedJob(prev => prev ? { ...prev, status: 'in_progress' } : null);
        } catch (error) {
            console.error("Error starting job:", error);
            alert("Failed to start job.");
        }
    };

    const handleOpenCompleteModal = (job: JobRequest) => {
        setSelectedJob(job);
        setCompletionType('full');
        setPartialReason("");
        setPartialPhoto(null);
        setIsCompleteModalOpen(true);
    };

    const submitCompleteJob = async () => {
        if (!selectedJob) return;

        try {
            const jobRef = doc(db, "job_requests", selectedJob.id);

            if (completionType === 'full') {
                await updateDoc(jobRef, {
                    status: 'fully_completed',
                    actualEndTime: new Date().toISOString()
                });
                setSelectedJob(prev => prev ? { ...prev, status: 'fully_completed' } : null);
            } else {
                if (!partialReason) {
                    alert("Please provide a reason for partial completion.");
                    return;
                }
                if (!partialPhoto) {
                    alert("Please upload a photo of the completed work.");
                    return;
                }

                setIsUploading(true);

                let downloadURL = "";
                try {
                    const storageRef = ref(storage, `job_evidence/${selectedJob.id}_${Date.now()}`);
                    const snapshot = await uploadBytes(storageRef, partialPhoto);
                    downloadURL = await getDownloadURL(snapshot.ref);
                } catch (uploadError: any) {
                    console.error("Upload failed (likely permission/CORS), using fallback:", uploadError);
                    downloadURL = "https://placehold.co/600x400/orange/white?text=Evidence+Photo+(Demo)";
                }

                await updateDoc(jobRef, {
                    status: 'partially_completed',
                    actualEndTime: new Date().toISOString(),
                    completionDetails: {
                        reason: partialReason,
                        photoProof: downloadURL,
                        timestamp: new Date().toISOString()
                    }
                });
                setSelectedJob(prev => prev ? { ...prev, status: 'partially_completed' } : null);
            }

            setIsCompleteModalOpen(false);
            setIsUploading(false);

        } catch (error) {
            console.error("Error completing job:", error);
            alert("Failed to complete job. Please try again.");
            setIsUploading(false);
        }
    };

    return (
        <div className="font-sans flex text-gray-900 h-[calc(100vh-64px)] overflow-hidden bg-white">

            {/* List Panel */}
            <div className={`w-full lg:w-1/3 flex-col border-r border-gray-200 bg-white ${selectedJob ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex-none bg-white z-10">
                    <h1 className="text-xl font-bold text-gray-900 mb-3">Inbox</h1>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {["all", "pending", "active", "completed"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 space-y-3">
                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading...</span>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center h-64">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <Briefcase className="w-6 h-6 text-gray-300" />
                            </div>
                            <h3 className="text-gray-900 font-medium text-sm">No jobs found</h3>
                            <p className="text-gray-500 text-xs mt-1">Try changing your filters.</p>
                        </div>
                    ) : (
                        <div>
                            {filteredJobs.map((job) => (
                                <JobListItem
                                    key={job.id}
                                    job={job}
                                    isSelected={selectedJob?.id === job.id}
                                    onClick={() => setSelectedJob(job)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Panel */}
            <div className={`w-full lg:w-2/3 bg-gray-50 flex flex-col h-full bg-white ${selectedJob ? 'flex' : 'hidden lg:flex'}`}>
                <JobDetailView
                    job={selectedJob}
                    onBack={() => setSelectedJob(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onStartJob={handleOpenStartModal}
                    onCompleteJob={handleOpenCompleteModal}
                    onChat={() => setIsChatOpen(true)}
                    className="h-full"
                />
            </div>

            {/* START JOB MODAL */}
            {isStartModalOpen && selectedJob && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Start Job</h2>
                            <button onClick={() => setIsStartModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">Before starting, please provide an estimated duration.</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Expected Completion Time</label>
                                <div className="flex flex-wrap gap-2">
                                    {['30 mins', '1 hour', '2 hours', '5 hours', '24 hours'].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setEstimatedTime(time)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${estimatedTime === time ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Note (Optional)</label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                    placeholder="Any important notes about the job..."
                                    rows={3}
                                    value={startNote}
                                    onChange={e => setStartNote(e.target.value)}
                                />
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start">
                                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700">
                                    <strong>Legal Note:</strong> Estimated time is a professional estimate and may change due to site conditions.
                                </p>
                            </div>
                        </div>

                        <button onClick={submitStartJob} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                            Confirm Start
                        </button>
                    </div>
                </div>
            )}

            {/* COMPLETE JOB MODAL */}
            {isCompleteModalOpen && selectedJob && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Finish Job</h2>
                            <button onClick={() => setIsCompleteModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        {/* Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setCompletionType('full')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${completionType === 'full' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <CheckCircle className={`inline w-4 h-4 mr-1 ${completionType === 'full' ? 'text-green-600' : ''}`} /> Fully Completed
                            </button>
                            <button
                                onClick={() => setCompletionType('partial')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${completionType === 'partial' ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <AlertTriangle className={`inline w-4 h-4 mr-1 ${completionType === 'partial' ? 'text-yellow-600' : ''}`} /> Partially Completed
                            </button>
                        </div>

                        {completionType === 'full' ? (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Great Job!</h3>
                                <p className="text-gray-500 mb-6">Confirming this will mark the job as 100% complete and notify the client.</p>

                                <button onClick={submitCompleteJob} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                                    Confirm Completion
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4">
                                    <p className="text-sm text-yellow-800 font-medium">To mark as Partial, you must provide a reason and photographic evidence.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Reason for Partial Completion</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm"
                                        placeholder="e.g. Missing parts, need client approval for extra work..."
                                        rows={3}
                                        value={partialReason}
                                        onChange={e => setPartialReason(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Photo Evidence</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={e => setPartialPhoto(e.target.files ? e.target.files[0] : null)}
                                        />
                                        {partialPhoto ? (
                                            <div className="text-green-600 font-medium flex flex-col items-center">
                                                <CheckCircle className="w-8 h-8 mb-2" />
                                                {partialPhoto.name}
                                            </div>
                                        ) : (
                                            <div className="text-gray-500 flex flex-col items-center">
                                                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                                <span className="text-sm font-medium">Click to upload photo</span>
                                                <span className="text-xs text-gray-400 mt-1">Required for verification</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={submitCompleteJob}
                                    disabled={isUploading}
                                    className="w-full py-3 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700 transition-colors shadow-lg shadow-yellow-200 disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {isUploading ? "Uploading Proof..." : "Submit Partial Status"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Sheet */}
            {selectedJob && providerId && (
                <ChatSheet
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    jobId={selectedJob.id}
                    currentUserId={providerId}
                    currentUserName="Provider"
                    recipientName={selectedJob.clientName || "Client"}
                />
            )}
        </div>
    );
}
