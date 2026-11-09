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
import { db, storage, auth } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import ChatSheet from "../../../../components/chat/ChatSheet";

import { JobRequest } from "../../../../components/dashboard/provider/types";
import { JobListItem } from "../../../../components/dashboard/provider/JobListItem";
import { JobDetailView } from "../../../../components/dashboard/provider/JobDetailView";
import AssignAssistantModal from "../../../../components/dashboard/provider/AssignAssistantModal";
import { formatJobLocation, formatRequestCode } from "@/lib/job-utils";

export default function MyJobsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedJob, setSelectedJob] = useState<JobRequest | null>(null);
    const [jobs, setJobs] = useState<JobRequest[]>([]);
    const [providerId, setProviderId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState<string>("Provider");
    const [isLoading, setIsLoading] = useState(true);

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Modal States
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isAssignAssistantModalOpen, setIsAssignAssistantModalOpen] = useState(false);

    // Start Job Form
    const [estimatedTime, setEstimatedTime] = useState("");
    const [startNote, setStartNote] = useState("");

    // Complete Job Form
    const [completionType, setCompletionType] = useState<'full' | 'partial'>('full');
    const [finalAgreedFee, setFinalAgreedFee] = useState<string>("");
    const [completionSummary, setCompletionSummary] = useState<string>("");
    const [partialReason, setPartialReason] = useState("");
    const [partialPhoto, setPartialPhoto] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Initial Load & Auth
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
                    setProviderName(data.fullName || data.name || "Provider");
                    if (data.status !== 'approved') {
                        if (data.status === 'pending_review' || data.status === 'pending' || data.status === 'rejected') {
                            router.replace("/dashboard/pending");
                        } else {
                            router.replace("/register/provider");
                        }
                    }
                }
            } catch (e) {
                console.error("Error verifying provider status in MyJobs:", e);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Fetch Jobs (Direct Assignments + Invitations)
    useEffect(() => {
        if (!providerId) return;

        const q1 = query(
            collection(db, "job_requests"),
            where("providerId", "==", providerId)
        );

        const q2 = query(
            collection(db, "job_requests"),
            where("invitedProviderIds", "array-contains", providerId)
        );

        let directJobs: JobRequest[] = [];
        let invitedJobs: JobRequest[] = [];
        const clientNameCache: Record<string, string> = {};

        const normalizeJob = (id: string, data: any): JobRequest => {
            const cId = String(data.clientId || data.userId || "");
            const rawName = String(data.clientName || data.userName || data.customerName || "").trim();
            const resolvedName =
                rawName && rawName !== "Client" && rawName !== "Unknown Client"
                    ? rawName
                    : clientNameCache[cId] || "";
            return {
                id,
                ...data,
                clientId: cId,
                clientName: resolvedName || rawName || undefined,
                budget: Number(data.budget ?? data.price ?? 0),
            } as JobRequest;
        };

        const updateCombinedJobs = () => {
            const allJobs = [...directJobs, ...invitedJobs];
            const nonArchivedJobs = allJobs.filter(j => !((j as any).isArchived) && (j.status as string) !== 'archived');
            const uniqueJobs = Array.from(new Map(nonArchivedJobs.map(item => [item.id, item])).values());

            uniqueJobs.sort((a, b) => {
                const timeA = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                const timeB = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
            });

            setJobs(uniqueJobs);
            setSelectedJob(prev => {
                if (!prev) return uniqueJobs[0] || null;
                return uniqueJobs.find(j => j.id === prev.id) || prev;
            });
            setIsLoading(false);

            // Backfill missing client names from users/{clientId}
            uniqueJobs.forEach(async (j) => {
                const cId = j.clientId || (j as any).userId;
                if (!cId || clientNameCache[cId]) return;
                if (j.clientName && j.clientName !== "Client" && j.clientName !== "Unknown Client") return;
                try {
                    const uSnap = await getDoc(doc(db, "users", cId));
                    if (uSnap.exists()) {
                        const u = uSnap.data();
                        const name = String(u.fullName || u.displayName || u.name || u.email || "").trim();
                        if (name) {
                            clientNameCache[cId] = name;
                            setJobs(curr =>
                                curr.map(item =>
                                    (item.clientId || (item as any).userId) === cId
                                        ? { ...item, clientName: name }
                                        : item
                                )
                            );
                            setSelectedJob(curr =>
                                curr && (curr.clientId || (curr as any).userId) === cId
                                    ? { ...curr, clientName: name }
                                    : curr
                            );
                        }
                    }
                } catch (_) {}
            });
        };

        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            directJobs = snapshot.docs.map(d => normalizeJob(d.id, d.data()));
            updateCombinedJobs();
        }, (error) => {
            console.warn("Notice fetching direct jobs:", error);
            setIsLoading(false);
        });

        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            invitedJobs = snapshot.docs.map(d => normalizeJob(d.id, d.data()));
            updateCombinedJobs();
        }, (error) => {
            console.warn("Notice fetching invited jobs:", error);
            setIsLoading(false);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [providerId]);

    // Filter Logic
    const filteredJobs = jobs.filter(job => {
        const locString = formatJobLocation(job.location);

        const reqCode = formatRequestCode(job).toLowerCase();
        const matchesSearch = (job.serviceType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            locString.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reqCode.includes(searchTerm.replace(/^#/, "").toLowerCase());

        let matchesStatus = true;
        if (filter === "pending") matchesStatus = job.status === "pending" || (job.status as string) === "open";
        if (filter === "active") matchesStatus = ["accepted", "in_progress", "awaiting_confirmation", "partially_completed"].includes(job.status);
        if (filter === "completed") matchesStatus = ["fully_completed", "completed", "cancelled", "rejected"].includes(job.status);

        return matchesSearch && matchesStatus;
    });

    // --- ACTION HANDLERS ---
    const handleStatusUpdate = async (jobId: string, action: 'accepted' | 'rejected') => {
        try {
            const jobRef = doc(db, "job_requests", jobId);
            const nowIso = new Date().toISOString();
            const updates: any = { status: action, updatedAt: nowIso };
            if (action === 'accepted' && providerId) {
                updates.providerId = providerId;
                updates.hodId = providerId;
                updates.hodName = providerName;
                updates.routingStatus = "hod_self_handled";
                updates.acceptedAt = nowIso;
            }

            await updateDoc(jobRef, updates);
            try {
                await updateDoc(doc(db, "requests", jobId), updates);
            } catch (_) {}

            const targetJob = jobs.find(j => j.id === jobId);
            const targetClient = targetJob?.clientId || (targetJob as any)?.userId;
            if (targetClient && action === 'accepted') {
                const reqCode = formatRequestCode(targetJob || jobId);
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: targetClient,
                        recipientId: targetClient,
                        title: `State HOD Accepted Request (#${reqCode}) 🛠️`,
                        message: `${providerName} (Department HOD) accepted your ${targetJob?.serviceType || "service"} request (#${reqCode}) and will handle it personally. Ask them to quote #${reqCode} at your door.`,
                        body: `${providerName} (Department HOD) accepted your ${targetJob?.serviceType || "service"} request (#${reqCode}) and will handle it personally. Ask them to quote #${reqCode} at your door.`,
                        type: "success",
                        read: false,
                        isRead: false,
                        createdAt: nowIso,
                        payload: { jobId, requestCode: reqCode },
                    });
                } catch (_) {}
            }

            if (selectedJob?.id === jobId) {
                // Optimistic update
                setSelectedJob(prev => prev ? { ...prev, status: action, ...(action === 'accepted' ? { providerId, hodName: providerName } : {}) } : null);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    const handleOpenAssignAssistantModal = (job: JobRequest) => {
        setSelectedJob(job);
        setIsAssignAssistantModalOpen(true);
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
            const nowIso = new Date().toISOString();
            const jobRef = doc(db, "job_requests", selectedJob.id);
            const startUpdates = {
                status: 'in_progress',
                startTime: nowIso,
                estimatedDuration: estimatedTime,
                startNote: startNote,
                note: startNote
            };
            await updateDoc(jobRef, startUpdates);
            try {
                await updateDoc(doc(db, "requests", selectedJob.id), startUpdates);
            } catch (_) {}

            setIsStartModalOpen(false);
            setSelectedJob(prev => prev ? { ...prev, status: 'in_progress' } : null);
        } catch (error) {
            console.error("Error starting job:", error);
            alert("Failed to start job.");
        }
    };

    const handleOpenCompleteModal = (job: JobRequest) => {
        setSelectedJob(job);
        setCompletionType('full');
        setFinalAgreedFee(String(job.budget || ""));
        setCompletionSummary((job as any).completionSummary || "");
        setPartialReason("");
        setPartialPhoto(null);
        setIsCompleteModalOpen(true);
    };

    const submitCompleteJob = async () => {
        if (!selectedJob) return;

        try {
            const nowIso = new Date().toISOString();
            const jobRef = doc(db, "job_requests", selectedJob.id);

            if (completionType === 'full') {
                const parsedFee = Number(String(finalAgreedFee).replace(/,/g, "").trim());
                if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
                    alert("Please enter a valid Final Agreed Fee (₦).");
                    return;
                }
                if (!completionSummary.trim()) {
                    alert("Please provide a brief summary of the work completed.");
                    return;
                }
                const initialEst = Number((selectedJob as any).initialBudget ?? selectedJob.budget ?? 0);
                const completeUpdates: any = {
                    status: 'awaiting_confirmation',
                    actualEndTime: nowIso,
                    updatedAt: nowIso,
                    initialBudget: initialEst > 0 ? initialEst : parsedFee,
                    finalAgreedPrice: parsedFee,
                    budget: parsedFee,
                    price: parsedFee,
                    completionSummary: completionSummary.trim()
                };
                await updateDoc(jobRef, completeUpdates);
                try {
                    await updateDoc(doc(db, "requests", selectedJob.id), completeUpdates);
                } catch (_) {}
                setSelectedJob(prev => prev ? { ...prev, ...completeUpdates } : null);
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
        <div className="font-sans flex text-gray-900 h-[calc(100vh-148px)] min-h-[540px] rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden bg-white">

            {/* List Panel */}
            <div className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white ${selectedJob ? 'hidden lg:flex' : 'flex'}`}>
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
            <div className={`flex-1 min-w-0 bg-gray-50/40 flex flex-col h-full ${selectedJob ? 'flex' : 'hidden lg:flex'}`}>
                <JobDetailView
                    job={selectedJob}
                    onBack={() => setSelectedJob(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onStartJob={handleOpenStartModal}
                    onCompleteJob={handleOpenCompleteModal}
                    onAssignAssistant={handleOpenAssignAssistantModal}
                    onChat={() => setIsChatOpen(true)}
                    className="h-full"
                />
            </div>

            {/* ASSIGN ASSISTANT MODAL */}
            <AssignAssistantModal
                isOpen={isAssignAssistantModalOpen && Boolean(selectedJob)}
                job={selectedJob}
                hodUid={providerId || ""}
                hodName={providerName}
                onClose={() => setIsAssignAssistantModalOpen(false)}
            />

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
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed">
                                    Confirm the <strong>Final Agreed Fee</strong> (keep the client&apos;s initial estimate or update if extra parts/repairs were agreed upon on-site) and summarize what was fixed.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        Final Agreed Fee (₦) *
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-base font-bold text-gray-900"
                                        placeholder="e.g. 15000"
                                        value={finalAgreedFee}
                                        onChange={e => setFinalAgreedFee(e.target.value)}
                                    />
                                    {selectedJob.budget ? (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Client&apos;s initial estimate: <strong>₦{Number((selectedJob as any).initialBudget ?? selectedJob.budget).toLocaleString()}</strong>
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        Work Completed / Parts Summary *
                                    </label>
                                    <textarea
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                        placeholder="Describe what was repaired, parts replaced, and testing completed..."
                                        rows={3}
                                        value={completionSummary}
                                        onChange={e => setCompletionSummary(e.target.value)}
                                    />
                                </div>

                                <button onClick={submitCompleteJob} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 cursor-pointer">
                                    Submit Work & Final Bill for Client Approval
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
                    currentUserName={providerName}
                    recipientName={selectedJob.clientName || "Client"}
                />
            )}
        </div>
    );
}
