"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, FileText, Camera, Sparkles } from "lucide-react";
import Link from "next/link";
import { auth, db } from "../../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function PendingReviewPage() {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            if (unsubDoc) unsubDoc();

            unsubDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserProfile(data);

                    // Real-time automatic transition: if admin approves applicant, forward to active dashboard!
                    if (data.status === 'approved') {
                        router.replace(data.role === 'service_provider' ? "/dashboard/provider" : "/dashboard/user");
                        return;
                    }
                }
                setIsLoading(false);
            }, (err) => {
                console.error("Pending page profile listener notice:", err);
                setIsLoading(false);
            });
        });

        return () => {
            if (unsubDoc) unsubDoc();
            unsubscribeAuth();
        };
    }, [router]);

    const isRejected = userProfile?.status === 'rejected';
    const appData = userProfile?.applicationData || {};
    const category = userProfile?.serviceCategory || appData.serviceCategory || (userProfile?.services && userProfile.services[0]) || appData.primaryService || "Service Provider";
    const hasGovId = !!(userProfile?.govIdUrl || appData.govIdUrl);
    const hasPassport = !!(userProfile?.passportUrl || appData.passportUrl);
    const jobPhotoCount = (userProfile?.jobPhotos?.length || appData.jobPhotos?.length || 0);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 sm:p-10 border border-gray-100">
                
                {/* Status Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${
                    isRejected ? 'bg-red-100 text-red-600 animate-bounce' : 'bg-amber-100 text-amber-600 animate-pulse'
                }`}>
                    {isRejected ? <AlertTriangle className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-3 ${
                    isRejected 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                    <span className={`w-2 h-2 rounded-full ${isRejected ? 'bg-red-500' : 'bg-amber-500 animate-ping'}`} />
                    <span>{isRejected ? 'ACTION REQUIRED' : 'APPLICATION UNDER REVIEW'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                    {isRejected
                        ? 'Application Needs Updates'
                        : (userProfile?.fullName ? `Welcome, ${userProfile.fullName}` : 'Application Submitted!')}
                </h1>
                
                <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
                    {isRejected
                        ? 'The compliance team has reviewed your documents and requested changes before approving your provider account.'
                        : `Your ${category ? `(${category})` : ''} compliance documents were received and are currently being reviewed by our verification team.`}
                </p>

                {/* Rejection Feedback Box */}
                {isRejected && userProfile?.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 uppercase mb-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>Compliance Team Feedback</span>
                        </div>
                        <p className="text-sm font-semibold text-red-950 leading-relaxed bg-white/70 p-3 rounded-lg border border-red-200/60">
                            "{userProfile.rejectionReason}"
                        </p>
                    </div>
                )}

                {/* Live Activity & Document Snapshot */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Application Dossier Snapshot
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-600" /> Government ID Document
                        </span>
                        <span className={`font-semibold flex items-center gap-1 ${hasGovId ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {hasGovId ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted</> : 'Pending'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" /> Passport Photograph / Selfie
                        </span>
                        <span className={`font-semibold flex items-center gap-1 ${hasPassport ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {hasPassport ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted</> : 'Pending'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Proof of Work Photos
                        </span>
                        <span className="font-semibold text-gray-800">
                            {jobPhotoCount > 0 ? `${jobPhotoCount} Photos Uploaded` : 'Included in dossier'}
                        </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRejected ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                            Application Status
                        </span>
                        <span className="text-gray-400">{isRejected ? 'Requires Resubmission' : 'Auto-refreshes on approval'}</span>
                    </div>
                </div>

                {!isRejected ? (
                    <div className="bg-blue-50 p-5 rounded-xl text-left mb-6 border border-blue-100">
                        <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-blue-700" /> What happens next?
                        </h3>
                        <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside leading-relaxed">
                            <li>Our compliance team verifies authenticity of uploaded credentials.</li>
                            <li>This usually completes within a few business hours.</li>
                            <li>You will receive an automated confirmation email once approved.</li>
                            <li>This page will automatically redirect to your Job Hub upon approval.</li>
                        </ul>
                    </div>
                ) : (
                    <div className="bg-amber-50 p-5 rounded-xl text-left mb-6 border border-amber-200">
                        <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-amber-700" /> How to resolve this?
                        </h3>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Click the button below to update your documents or details. Your previous information is preserved so you only need to replace the items requested by compliance.
                        </p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                    {isRejected ? (
                        <Link
                            href="/register/provider"
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-200 hover:shadow-red-300 transition-all text-center inline-flex items-center justify-center gap-2"
                        >
                            <span>Update & Re-Submit Documents</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    ) : null}
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 font-medium text-xs sm:text-sm transition-all text-center inline-flex items-center justify-center gap-1.5"
                    >
                        <span>Back to Home</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                        href="/downloads/wheelofcomfort.apk"
                        download="wheelofcomfort.apk"
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                        📱 You can also track your status directly in the Mobile App
                    </a>
                </div>
            </div>
        </div>
    );
}
