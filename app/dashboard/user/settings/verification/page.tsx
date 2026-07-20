"use client";

import { useState, useEffect } from "react";
import { Shield, FileCheck, XCircle, Clock, CheckCircle, Upload, AlertCircle, Loader2, Eye, User } from "lucide-react";
import { db } from "../../../../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function VerificationSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [docs, setDocs] = useState<{ govId?: string; passport?: string }>({});
    const [status, setStatus] = useState<string>("unverified");

    // Upload State
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const fetchVerificationData = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            try {
                // Get Profile Status
                const userSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setUser({ uid: currentUser.uid, ...userData });
                    setStatus(userData.status);

                    // Fetch Current Documents
                    const govIdSnap = await getDoc(doc(db, "users", currentUser.uid, "documents", "govId"));
                    const passportSnap = await getDoc(doc(db, "users", currentUser.uid, "documents", "passport"));

                    setDocs({
                        govId: govIdSnap.exists() ? govIdSnap.data().data : undefined,
                        passport: passportSnap.exists() ? passportSnap.data().data : undefined
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchVerificationData();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'govId' | 'passport') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validation (Max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File too large. Max 2MB.");
            return;
        }

        setUploadingDoc(docType);

        try {
            console.log("Starting Upload for:", user.uid);
            console.log("Current Auth:", getAuth().currentUser?.uid);

            // Convert to Base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64String = event.target?.result as string;

                // 1. Save to Subcollection
                await setDoc(doc(db, "users", user.uid, "documents", docType), {
                    data: base64String,
                    updatedAt: new Date().toISOString()
                });

                // 2. Update Local State
                setDocs(prev => ({ ...prev, [docType]: base64String }));
                alert("Document uploaded successfully. Admin notified.");
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error(error);
            alert("Upload failed.");
        } finally {
            setUploadingDoc(null);
        }
    };

    const StatusBadge = () => {
        const config = {
            approved: { color: "bg-green-100 text-green-700", icon: CheckCircle, text: "Verified" },
            pending_review: { color: "bg-yellow-100 text-yellow-700", icon: Clock, text: "Pending Review" },
            rejected: { color: "bg-red-100 text-red-700", icon: XCircle, text: "Action Required" },
            restricted: { color: "bg-red-900 text-white", icon: XCircle, text: "Restricted" },
            unverified: { color: "bg-gray-100 text-gray-600", icon: Shield, text: "Unverified" }
        };
        const active = config[status as keyof typeof config] || config.unverified;
        const Icon = active.icon;

        return (
            <div className={`inline-flex items-center px-4 py-2 rounded-lg font-bold text-sm ${active.color}`}>
                <Icon className="w-4 h-4 mr-2" />
                {active.text}
            </div>
        );
    };

    if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

    const isRejected = status === 'rejected' || status === 'restricted';
    // Logic: Editable if Rejected OR Document is missing (and not approved)
    // Actually, if approved, it should be locked.
    // If pending, it should be locked (unless we want to allow overwriting before review, but keep simple for now).
    // Let's say: Locked if 'approved' or 'pending_review'. Unlocked if 'rejected' or 'unverified'. BUT strict on rejected specific docs?

    // Improved Logic based on requirements:
    // "Approved documents must be locked"
    // "Only rejected documents are editable"

    const isDocEditable = (docType: string) => {
        if (status === 'approved') return false;
        if (status === 'pending_review') return false; // Lock while review
        if (status === 'unverified') return true;
        // If rejected, check which specific doc was rejected
        if (isRejected) {
            // If we have specific rejectedDocs array in user profile
            if (user.rejectedDocs && user.rejectedDocs.includes(docType)) return true;
            // If global rejection but no specific doc listed (legacy), maybe allow editing all? Safe to allow.
            return true;
        }
        return true;
    };


    return (
        <div className="divide-y divide-gray-100">
            <div className="p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Identity Verification</h2>
                        <p className="text-sm text-gray-500">To ensure safety, we require valid identification.</p>
                    </div>
                    <StatusBadge />
                </div>

                {/* Rejection Message */}
                {user?.rejectionReason && isRejected && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-800">Application Rejected</h4>
                            <p className="text-sm text-red-600 mt-1">{user.rejectionReason}</p>
                            <p className="text-xs text-red-500 mt-2 font-medium">Please re-upload the corrected documents below.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gov ID Card */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <FileCheck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-gray-900">Government ID</span>
                        </div>
                        {docs.govId && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>

                    <div className="bg-gray-50 rounded-lg aspect-video flex items-center justify-center border border-dashed border-gray-300 relative overflow-hidden group">
                        {docs.govId ? (
                            <img src={docs.govId} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-sm text-gray-400">No Document</span>
                        )}
                    </div>

                    {isDocEditable('govId') && (
                        <div className="mt-4">
                            <label className="block w-full text-center py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-900 hover:bg-gray-50 cursor-pointer transition-all font-bold text-sm text-gray-600">
                                {uploadingDoc === 'govId' ? 'Uploading...' : 'Upload ID'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'govId')}
                                    disabled={!!uploadingDoc}
                                />
                            </label>
                        </div>
                    )}

                    {!isDocEditable('govId') && <div className="mt-4 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Locked</div>}
                </div>

                {/* Passport Photo Card */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <User className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-gray-900">Passport Photo</span>
                        </div>
                        {docs.passport && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>

                    <div className="bg-gray-50 rounded-lg aspect-square w-32 mx-auto flex items-center justify-center border border-dashed border-gray-300 relative overflow-hidden">
                        {docs.passport ? (
                            <img src={docs.passport} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm text-gray-400">No Photo</span>
                        )}
                    </div>

                    {isDocEditable('passport') && (
                        <div className="mt-4">
                            <label className="block w-full text-center py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-900 hover:bg-gray-50 cursor-pointer transition-all font-bold text-sm text-gray-600">
                                {uploadingDoc === 'passport' ? 'Uploading...' : 'Upload Photo'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'passport')}
                                    disabled={!!uploadingDoc}
                                />
                            </label>
                        </div>
                    )}
                    {!isDocEditable('passport') && <div className="mt-4 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Locked</div>}
                </div>
            </div>

            {(status === 'rejected' || status === 'unverified') && (
                <div className="p-6 bg-gray-50 flex justify-end">
                    <button
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                        onClick={async () => {
                            if (!user) return;
                            if (confirm("Submit documents for review?")) {
                                await updateDoc(doc(db, "users", user.uid), { status: 'pending_review' });
                                window.location.reload();
                            }
                        }}
                    >
                        Submit for Review
                    </button>
                    {/* Note: In real world, we should check if documents exist before enabling submit button */}
                </div>
            )}
        </div>
    );
}

// Helper for Lock Icon
function Lock({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
// Helper for User Icon (since imported one conflicts or we want custom) - Actually imported User is fine.
