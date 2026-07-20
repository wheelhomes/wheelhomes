"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { Shield, Upload, FileText, Camera, CheckCircle, AlertCircle, X, ArrowRight } from "lucide-react";
import Image from "next/image";

interface DocState {
    file: File | null;
    previewUrl: string | null;
    status: 'empty' | 'selected' | 'uploaded';
}

export default function DocumentVerificationPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [declaration, setDeclaration] = useState(false);

    // Initial check for Auth
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) router.push("/signin");
        });
        return () => unsubscribe();
    }, []);

    const [govId, setGovId] = useState<DocState>({ file: null, previewUrl: null, status: 'empty' });
    const [passport, setPassport] = useState<DocState>({ file: null, previewUrl: null, status: 'empty' });

    const govIdInputRef = useRef<HTMLInputElement>(null);
    const passportInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'govId' | 'passport') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (max 2MB for Base64 sanity)
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large. Max 2MB allowed.");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const newState = { file, previewUrl, status: 'selected' as const };

        if (type === 'govId') setGovId(newState);
        else setPassport(newState);
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async () => {
        if (!declaration) {
            alert("Please accept the declaration.");
            return;
        }
        if (!govId.file || !passport.file) {
            alert("Please upload both documents.");
            return;
        }

        setIsSubmitting(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Convert to Base64
            const govIdBase64 = await convertToBase64(govId.file);
            const passportBase64 = await convertToBase64(passport.file);

            // Update Firestore
            // Write to Subcollections (to bypass 1MB limit on main doc)
            await setDoc(doc(db, "users", user.uid, "documents", "govId"), {
                data: govIdBase64,
                mimeType: govId.file.type,
                type: 'govId',
                uploadedAt: new Date().toISOString()
            });

            await setDoc(doc(db, "users", user.uid, "documents", "passport"), {
                data: passportBase64,
                mimeType: passport.file.type,
                type: 'passport',
                uploadedAt: new Date().toISOString()
            });

            // Update Main User Doc (Metadata only)
            await updateDoc(doc(db, "users", user.uid), {
                applicationData: {
                    submittedAt: new Date().toISOString(),
                    hasDocuments: true // Flag for admin to know to fetch subcollection
                },
                status: 'pending_review'
            });

            router.push("/dashboard/pending");

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
            setIsSubmitting(false);
        }
    };

    const removeFile = (type: 'govId' | 'passport') => {
        const emptyState = { file: null, previewUrl: null, status: 'empty' as const };
        if (type === 'govId') {
            setGovId(emptyState);
            if (govIdInputRef.current) govIdInputRef.current.value = "";
        } else {
            setPassport(emptyState);
            if (passportInputRef.current) passportInputRef.current.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 px-8 py-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Verification Documents</h1>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-400">
                        <Shield className="w-4 h-4" />
                        <span>For safety, trust, and compliance, we require identity verification.</span>
                    </div>
                </div>

                <div className="p-8 space-y-8">

                    {/* Government ID */}
                    <section>
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Government ID Upload
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Accepted IDs: National ID, Voter’s Card, Driver’s License, International Passport.
                        </p>

                        <input
                            type="file"
                            ref={govIdInputRef}
                            hidden
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, 'govId')}
                        />

                        {govId.previewUrl ? (
                            <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group">
                                <Image src={govId.previewUrl} alt="ID Preview" fill className="object-cover" />
                                <button
                                    onClick={() => removeFile('govId')}
                                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-red-50 text-red-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-2 right-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Pending Review
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => govIdInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-500 hover:text-blue-600"
                            >
                                <Upload className="w-8 h-8" />
                                <span className="font-bold text-sm">Click to Upload ID</span>
                            </button>
                        )}
                    </section>

                    {/* Passport Photo */}
                    <section>
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Camera className="w-5 h-5 text-orange-600" />
                            Passport Photograph Upload
                        </h3>
                        <div className="text-sm text-gray-500 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <strong>Requirements:</strong> Clear face, Plain background, No filters or sunglasses.
                        </div>

                        <input
                            type="file"
                            ref={passportInputRef}
                            hidden
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, 'passport')}
                        />

                        {passport.previewUrl ? (
                            <div className="relative w-32 h-32 mx-auto bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                                <Image src={passport.previewUrl} alt="Passport Preview" fill className="object-cover" />
                                <button
                                    onClick={() => removeFile('passport')}
                                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md hover:bg-red-50 text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-yellow-100 text-yellow-700 text-[10px] font-bold py-1 text-center">
                                    Pending Review
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => passportInputRef.current?.click()}
                                className="w-32 h-32 mx-auto border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-500 hover:bg-orange-50 transition-all text-gray-500 hover:text-orange-600"
                            >
                                <Camera className="w-8 h-8" />
                                <span className="font-bold text-xs">Upload Photo</span>
                            </button>
                        )}
                    </section>

                    {/* Declaration */}
                    <section className="bg-gray-50 p-4 rounded-xl">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-1 w-5 h-5 text-gray-900 rounded focus:ring-gray-900 border-gray-300"
                                checked={declaration}
                                onChange={(e) => setDeclaration(e.target.checked)}
                            />
                            <span className="text-sm text-gray-600 leading-relaxed">
                                I confirm that the information and documents provided are accurate and belong to me. I understand that falsifying information may lead to permanent account suspension.
                            </span>
                        </label>
                    </section>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !declaration || !govId.file || !passport.file}
                        className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        {isSubmitting ? "Submitting..." : "Submit for Review"} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
