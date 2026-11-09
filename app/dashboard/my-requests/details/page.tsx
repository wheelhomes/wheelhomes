"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { RequestServices } from "@/lib/services/request-service";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Timeline } from "@/components/requests/Timeline";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { ReviewForm } from "@/components/requests/ReviewForm";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    DollarSign,
    CheckCircle,
    ShieldCheck,
    Crown,
    UserCheck,
    Phone,
    Copy,
} from "lucide-react";
import Link from "next/link";
import { sendNotification } from "@/lib/notifications";
import { formatRequestCode } from "@/lib/job-utils";
import { requestOnlineCall } from "@/lib/call-service";

interface RequestData {
    id: string;
    clientId: string;
    description: string;
    serviceType: string;
    status: string;
    location: string;
    createdAt: any;
    updatedAt: any;
    completedAt?: any;
    actualEndTime?: any;
    provider?: {
        id: string;
        name: string;
        avatar?: string;
    };
    providerId?: string;
    hodId?: string;
    hodName?: string;
    hodDepartment?: string;
    clientState?: string;
    assignedAssistant?: {
        id: string;
        name: string;
        phone: string;
        area: string;
        note?: string;
    };
    assistantName?: string;
    assistantPhone?: string;
    assistantArea?: string;
    budget?: number;
    initialBudget?: number;
    finalAgreedPrice?: number;
    completionSummary?: string;
    completionDetails?: any;
}

function RequestDetailsContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [request, setRequest] = useState<RequestData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserId(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!id) return;

        const unsubscribe = onSnapshot(doc(db, "job_requests", id), (docFn) => {
            if (docFn.exists()) {
                const data = docFn.data();
                setRequest({
                    id: docFn.id,
                    ...data,
                    location:
                        typeof data.location === "object"
                            ? data.location.address || "Location"
                            : data.location,
                    provider: data.providerId
                        ? {
                              id: data.providerId,
                              name: data.providerName || data.hodName || "Department HOD",
                          }
                        : undefined,
                } as RequestData);
            } else {
                setRequest(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    const handleConfirmCompletion = async () => {
        if (!request) return;
        if (
            !confirm(
                "Are you sure you want to confirm this job as completed? This will close the job and release payment."
            )
        )
            return;

        try {
            await RequestServices.confirmJobCompletion(request.id, 5, "");
            if (request.providerId) {
                await sendNotification(
                    request.providerId,
                    "Job Closed & Confirmed! 🌟",
                    "Client has confirmed the job completion.",
                    "success"
                );
            }
        } catch (error) {
            console.error(error);
            alert("Failed to confirm completion");
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!request) {
        return <div className="min-h-screen flex items-center justify-center">Request not found</div>;
    }

    const dates = {
        created: request.createdAt,
        accepted: request.updatedAt,
        providerDone: request.actualEndTime,
        completed:
            request.completedAt ||
            (request.status === "fully_completed" ? request.updatedAt : undefined),
    };

    const isAwaitingConfirmation = request.status === "awaiting_confirmation";
    const isCompleted = ["fully_completed", "completed"].includes(request.status);
    const assistantName = request.assignedAssistant?.name || request.assistantName;
    const assistantPhone = request.assignedAssistant?.phone || request.assistantPhone;
    const assistantArea = request.assignedAssistant?.area || request.assistantArea;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <Link
                href="/dashboard/my-requests"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Requests
            </Link>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    {isAwaitingConfirmation && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-indigo-900">
                                        Inspect & Approve Work Is Well Done
                                    </h3>
                                    <p className="text-indigo-700 mb-3 text-sm leading-relaxed">
                                        Your technician has submitted the completed work and final bill. Please inspect the work first — payment remains locked until you approve that the job is well done.
                                    </p>

                                    {(request.completionSummary || request.finalAgreedPrice) && (
                                        <div className="bg-white rounded-xl p-4 border border-indigo-100 mb-4 space-y-2">
                                            {request.finalAgreedPrice ? (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-semibold text-gray-600">Final Agreed Bill:</span>
                                                    <div className="flex items-center gap-2">
                                                        {request.initialBudget && request.initialBudget !== request.finalAgreedPrice ? (
                                                            <span className="text-xs text-gray-400 line-through">
                                                                ₦{Number(request.initialBudget).toLocaleString()}
                                                            </span>
                                                        ) : null}
                                                        <span className="text-base font-extrabold text-emerald-700">
                                                            ₦{Number(request.finalAgreedPrice).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}
                                            {request.completionSummary ? (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                                        Technician Work Summary
                                                    </p>
                                                    <p className="text-sm text-gray-800 mt-0.5">
                                                        {request.completionSummary}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleConfirmCompletion}
                                        className="inline-flex items-center justify-center px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-md w-full sm:w-auto cursor-pointer"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve Job & Final Bill (₦{Number(request.finalAgreedPrice ?? request.budget ?? 0).toLocaleString()})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Client Approval & Payment Protection Banner */}
                    <div className={`rounded-xl p-5 border ${isCompleted ? "bg-emerald-50/70 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className={`w-5 h-5 shrink-0 ${isCompleted ? "text-emerald-600" : "text-indigo-600"}`} />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {isCompleted
                                            ? "Job Approved as Well Done — Payment Unlocked ✅"
                                            : "Payment Locked Until You Approve Work 🔒"}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {isCompleted
                                            ? "You have confirmed the work was completed satisfactorily. You may now proceed with payment."
                                            : "For your protection, you cannot make any payment until the technician finishes the job and you approve that it is well done."}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shrink-0 ${isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                                {isCompleted ? "Approved" : "Locked"}
                            </span>
                        </div>
                    </div>

                    {/* Header Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {request.serviceType || "Service Request"}
                                    </h1>
                                    <span
                                        onClick={() => navigator.clipboard?.writeText(formatRequestCode(request))}
                                        title="Click to copy Request ID"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 text-xs font-mono font-extrabold cursor-pointer hover:bg-purple-200 transition-colors"
                                    >
                                        #{formatRequestCode(request)}
                                        <Copy className="w-3 h-3" />
                                    </span>
                                    <RequestStatusBadge status={request.status} />
                                </div>
                                <p className="text-gray-600 mb-4">{request.description}</p>

                                <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                                        {new Date(request.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center">
                                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                                        {request.location}
                                    </div>
                                </div>
                            </div>

                            {request.budget ? (
                                <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 min-w-[120px]">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                                        Budget
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900 flex items-center">
                                        <DollarSign className="w-5 h-5" />₦
                                        {Number(request.budget).toLocaleString()}
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        {/* HOD & Dispatched Field Technician Card */}
                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                                            Department Head (HOD) • {request.clientState || "State"}
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {request.hodName ||
                                                request.provider?.name ||
                                                `${request.serviceType} Department Desk`}
                                        </p>
                                    </div>
                                </div>

                                {assistantName ? (
                                    <div className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                            <UserCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                Assigned Field Assistant ({assistantArea || "Nearest to You"})
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {assistantName}
                                            </p>
                                            {assistantPhone && (
                                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {assistantPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-purple-800 bg-white px-3 py-1.5 rounded-lg border border-purple-200">
                                        HOD is assigning the nearest technician to your location...
                                    </span>
                                )}
                            </div>

                            {/* Doorstep Security Verification Box */}
                            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 leading-relaxed">
                                    <p className="font-extrabold uppercase tracking-wider text-[11px] text-amber-800 mb-0.5">
                                        Doorstep Security Verification • Request ID #{formatRequestCode(request)}
                                    </p>
                                    For your safety, when the technician arrives at your gate or door, ask them to quote your Request ID{" "}
                                    <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">
                                        #{formatRequestCode(request)}
                                    </strong>{" "}
                                    {assistantName ? (
                                        <>and verify their name is <strong>{assistantName}</strong> </>
                                    ) : null}
                                    before granting entry.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Request Timeline</h3>
                        <Timeline status={request.status} dates={dates} />
                    </div>

                    {/* Review Section (Only if completed) */}
                    {isCompleted && <ReviewForm />}
                </div>

                {/* Sidebar / Chat */}
                <div className="lg:w-96">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-6">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Department Messages
                            </h3>
                            {(request.providerId || request.hodId) &&
                                !["pending", "open", "cancelled", "rejected"].includes(request.status) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            requestOnlineCall({
                                                calleeId: (request.providerId || request.hodId) as string,
                                                calleeName:
                                                    request.hodName || request.provider?.name || "Department HOD",
                                                jobId: request.id,
                                                requestCode: formatRequestCode(request),
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                                        title="Free online voice call over the internet"
                                    >
                                        <Phone className="w-3.5 h-3.5" /> Online Call
                                    </button>
                                )}
                        </div>
                        {request.provider && !["pending", "open", "cancelled", "rejected"].includes(request.status) ? (
                            <UnifiedChat
                                requestId={request.id}
                                currentUserId={currentUserId || undefined}
                                currentUserName="You"
                                currentUserRole="user"
                                readOnly={isCompleted}
                                className="min-h-[500px]"
                            />
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200 px-4">
                                <p className="text-gray-500 text-sm">
                                    🔒 Chat opens as soon as your State HOD accepts your request or dispatches a field assistant.
                                </p>
                            </div>
                        )}
                        {isCompleted && (
                            <div className="mt-4 p-3 bg-gray-50 text-center rounded-lg border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                    Chat Locked (Job Closed)
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RequestDetailsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading request details...</div>}>
            <RequestDetailsContent />
        </Suspense>
    );
}
