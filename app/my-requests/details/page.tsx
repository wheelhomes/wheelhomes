'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RequestServices } from '@/lib/services/request-service';
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge';
import { Timeline } from '@/components/requests/Timeline';
import { ChatInterface } from '@/components/requests/ChatInterface';
import { ReviewForm } from '@/components/requests/ReviewForm';
import { ArrowLeft, Calendar, MapPin, DollarSign, ExternalLink, CheckCircle, ShieldCheck, Shield, Users, Phone } from 'lucide-react';
import Link from 'next/link';
import { sendNotification } from '@/lib/notifications';
import { Suspense } from 'react';

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
    hodPhone?: string;
    clientState?: string;
    assignedAssistant?: {
        name: string;
        phone: string;
        area?: string;
    };
    assistantName?: string;
    assistantPhone?: string;
    assistantArea?: string;
    budget?: number;
    completionDetails?: any;
}

function RequestDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const [request, setRequest] = useState<RequestData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const unsubscribe = onSnapshot(doc(db, "job_requests", id), (docFn) => {
            if (docFn.exists()) {
                const data = docFn.data();
                setRequest({
                    id: docFn.id,
                    ...data,
                    location: typeof data.location === 'object' ? data.location.address || "Location" : data.location,
                    provider: data.providerId ? { id: data.providerId, name: data.hodName || "Department HOD" } : undefined
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
        if (!confirm("Are you sure you want to confirm this job as completed? This will close the job and release payment.")) return;

        try {
            await RequestServices.confirmJobCompletion(request.id, 5, "");
            if (request.providerId) {
                await sendNotification(request.providerId, "Job Closed & Confirmed! 🌟", "Client has confirmed the job completion.", "success");
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
        completed: request.completedAt || (request.status === 'fully_completed' ? request.updatedAt : undefined),
    };

    const isAwaitingConfirmation = request.status === 'awaiting_confirmation';
    const isCompleted = ['fully_completed', 'completed'].includes(request.status);
    const assistantName = request.assistantName || request.assignedAssistant?.name;
    const assistantPhone = request.assistantPhone || request.assignedAssistant?.phone;
    const assistantArea = request.assistantArea || request.assignedAssistant?.area;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <Link
                href="/my-requests"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Requests
            </Link>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">

                    {isAwaitingConfirmation && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-indigo-900">Provider has finished the job</h3>
                                    <p className="text-indigo-700 mb-4 text-sm leading-relaxed">
                                        Please review the work. If you are satisfied, click the button below to confirm completion and close this job.
                                        Only confirm if you verify the job is done.
                                    </p>
                                    <button
                                        onClick={handleConfirmCompletion}
                                        className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 w-full sm:w-auto"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Job Confirmed Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold text-gray-900">{request.serviceType || "Service Request"}</h1>
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

                            {request.budget && (
                                <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 min-w-[120px]">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Budget</p>
                                    <p className="text-2xl font-bold text-gray-900 flex items-center">
                                        ₦{request.budget.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* HOD & Dispatched Assistant Info */}
                        {(request.provider || request.hodName || assistantName) && (
                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 overflow-hidden flex items-center justify-center">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{request.hodName || request.provider?.name || "Department HOD"}</p>
                                            <p className="text-xs text-indigo-600 font-semibold">
                                                Head of Department (HOD){request.clientState ? ` • ${request.clientState}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {assistantName && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Dispatched Field Assistant</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {assistantName}
                                                    {assistantArea ? <span className="text-xs font-normal text-gray-600"> • {assistantArea}</span> : null}
                                                </p>
                                                {assistantPhone && (
                                                    <a href={`tel:${assistantPhone}`} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline mt-0.5">
                                                        <Phone className="w-3 h-3" /> {assistantPhone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Request Timeline</h3>
                        <Timeline status={request.status} dates={dates} />
                    </div>

                    {isCompleted && <ReviewForm />}
                </div>

                {/* Sidebar / Chat */}
                <div className="lg:w-96">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2">Messages</h3>
                        {request.provider ? (
                            <ChatInterface requestId={request.id} providerName={request.hodName || request.provider.name} />
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm">Chat will be available once your Department HOD accepts your request.</p>
                            </div>
                        )}
                        {isCompleted && (
                            <div className="mt-4 p-3 bg-gray-50 text-center rounded-lg border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Chat Locked (Job Closed)</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function RequestDetailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RequestDetailContent />
        </Suspense>
    );
}
