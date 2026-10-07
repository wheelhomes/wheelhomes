"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, getDownloadURL, uploadString } from "firebase/storage";
import { compressImageToBase64 } from "../../../lib/image-utils";
import { Shield, Upload, CheckCircle, AlertCircle, Clock, FileText, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendPendingReviewEmailAction } from "@/app/actions/email";

interface ApplicationData {
    serviceCategory?: string;
    experience?: string;
    coverageArea?: string;
    passportUrl?: string;
    govIdUrl?: string;
    submittedAt?: string;
}

interface UserData {
    uid: string;
    fullName: string;
    email: string;
    status: string;
    rejectionReason?: string;
    rejectedDocs?: string[]; // 'govId', 'passport'
    applicationData?: ApplicationData;
}

export default function VerificationSettingsPage() {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const [idFile, setIdFile] = useState<File | null>(null);
    const [passportFile, setPassportFile] = useState<File | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push("/signin");
                return;
            }
            fetchUserData(currentUser.uid);
        });
        return () => unsubscribe();
    }, []);

    const fetchUserData = async (uid: string) => {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            setUser({ uid: docSnap.id, ...docSnap.data() } as UserData);
        }
        setIsLoading(false);
    };

    const handleReupload = async () => {
        if (!user) return;
        setIsUploading(true);

        try {
            let updates: any = {};
            let appDataUpdates: any = {};

            // Re-upload ID if selected and previously rejected
            if (idFile && user.rejectedDocs?.includes('govId')) {
                const compressedId = await compressImageToBase64(idFile);
                // STORAGE BYPASS: Save Base64 directly to Firestore to avoid "Storage Not Enabled" issues
                // const idRef = ref(storage, `provider_docs/${user.uid}/gov_id`);
                // await uploadString(idRef, compressedId, 'data_url');
                // const idUrl = await getDownloadURL(idRef);
                appDataUpdates.govIdUrl = compressedId;
            }

            // Re-upload Passport if selected and previously rejected
            if (passportFile && user.rejectedDocs?.includes('passport')) {
                const compressedPass = await compressImageToBase64(passportFile);
                // STORAGE BYPASS: Save Base64 directly to Firestore
                // const passRef = ref(storage, `provider_docs/${user.uid}/passport`);
                // await uploadString(passRef, compressedPass, 'data_url');
                // const passportUrl = await getDownloadURL(passRef);
                appDataUpdates.passportUrl = compressedPass;
            }

            // Only update if files were actually selected
            if (Object.keys(appDataUpdates).length === 0) {
                alert("Please select the documents you need to re-upload.");
                setIsUploading(false);
                return;
            }

            // Update User Doc
            await updateDoc(doc(db, "users", user.uid), {
                status: "pending_review", // Reset status to pending
                "applicationData": {
                    ...user.applicationData,
                    ...appDataUpdates,
                    resubmittedAt: new Date().toISOString()
                },
            });

            // Dispatch pending review confirmation email
            if (user.email) {
                sendPendingReviewEmailAction(user.email, user.fullName || 'Service Provider')
                    .catch(err => console.warn('[Settings Verification] Notice: Pending review email dispatch:', err));
            }

            alert("Documents re-uploaded successfully! Your account is now under review.");
            window.location.reload(); // Reload to reflect status changes

        } catch (error: any) {
            console.error("Re-upload error:", error);
            alert("Failed to upload: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading verification status...</div>;
    if (!user) return <div className="p-8 text-center">User not found.</div>;

    const isRestricted = user.status === 'restricted';
    const rejectedDocs = user.rejectedDocs || [];

    const getDocStatus = (docType: string) => {
        if (isRestricted && rejectedDocs.includes(docType)) return 'rejected';
        if (user.status === 'approved') return 'approved';
        return 'pending'; // Default or under review
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Verification Documents</h1>
                    <p className="text-gray-600 mt-2">Manage your identity verification documents to ensure account access.</p>
                </div>

                {isRestricted && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 flex gap-4 items-start animate-in slide-in-from-top-2">
                        <div className="p-2 bg-red-100 rounded-full shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900">Action Required: Re-upload Documents</h3>
                            <p className="text-sm text-red-700 mt-1">
                                Your application was rejected because some documents were invalid.
                                <br /><strong>Reason:</strong> {user.rejectionReason}
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Government ID Card */}
                    <div className={`bg-white rounded-xl shadow-sm border p-6 ${getDocStatus('govId') === 'rejected' ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Government ID</h3>
                                    <p className="text-xs text-gray-500">National ID, Drivers License, or Voter's Card</p>
                                </div>
                            </div>
                            {getDocStatus('govId') === 'approved' && <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Verified</span>}
                            {getDocStatus('govId') === 'pending' && <span className="flex items-center gap-1 text-xs font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full"><Clock className="w-3 h-3" /> In Review</span>}
                            {getDocStatus('govId') === 'rejected' && <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full"><AlertCircle className="w-3 h-3" /> Rejected</span>}
                        </div>

                        {getDocStatus('govId') === 'rejected' ? (
                            <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    id="reupload-id"
                                    className="hidden"
                                    onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)}
                                />
                                <label htmlFor="reupload-id" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-red-400" />
                                    <span className="font-medium text-red-700 sm:text-sm">
                                        {idFile ? idFile.name : "Click to Re-upload Government ID"}
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center gap-3 opacity-75">
                                <Lock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">Document is currently locked for editing.</span>
                            </div>
                        )}
                    </div>

                    {/* Passport Photo Card */}
                    <div className={`bg-white rounded-xl shadow-sm border p-6 ${getDocStatus('passport') === 'rejected' ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Passport Photograph</h3>
                                    <p className="text-xs text-gray-500">Clear face photo on white background</p>
                                </div>
                            </div>
                            {getDocStatus('passport') === 'approved' && <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Verified</span>}
                            {getDocStatus('passport') === 'pending' && <span className="flex items-center gap-1 text-xs font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full"><Clock className="w-3 h-3" /> In Review</span>}
                            {getDocStatus('passport') === 'rejected' && <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full"><AlertCircle className="w-3 h-3" /> Rejected</span>}
                        </div>

                        {getDocStatus('passport') === 'rejected' ? (
                            <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    id="reupload-pass"
                                    className="hidden"
                                    onChange={(e) => setPassportFile(e.target.files ? e.target.files[0] : null)}
                                />
                                <label htmlFor="reupload-pass" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-red-400" />
                                    <span className="font-medium text-red-700 sm:text-sm">
                                        {passportFile ? passportFile.name : "Click to Re-upload Passport Photo"}
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center gap-3 opacity-75">
                                <Lock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500">Document is currently locked for editing.</span>
                            </div>
                        )}
                    </div>
                </div>

                {isRestricted && (idFile || passportFile) && (
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleReupload}
                            disabled={isUploading}
                            className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {isUploading ? "Uploading..." : "Submit for Re-evaluation"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
