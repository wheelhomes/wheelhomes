"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { Briefcase, MapPin, BadgeCheck, Upload, ArrowRight, User } from "lucide-react";
import { compressImageToBase64 } from "../../../lib/image-utils";

export default function RegisterProviderPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        primaryService: "Plumbing", // Default
        secondaryService: "", // Optional
        experience: "",
        coverageArea: "",
    });


    const [idFile, setIdFile] = useState<File | null>(null);
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) router.push("/signin");
            else {
                // Fetch existing details
                const docSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (docSnap.exists()) {
                    setUser(docSnap.data());
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        if (!agreeToTerms) {
            alert("You must agree to the terms.");
            return;
        }

        setIsLoading(true);

        try {
            let idUrl = "";
            let passportUrl = "";

            // Helper for timeout
            const uploadWithTimeout = (ref: any, file: File) => {
                return Promise.race([
                    uploadBytes(ref, file),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)) // Reduced to 5s
                ]);
            };

            // Upload ID
            if (idFile) {
                try {
                    const compressedId = await compressImageToBase64(idFile);
                    // STORAGE BYPASS: Base64
                    idUrl = compressedId;
                } catch (err: any) {
                    console.error("ID Processing Failed:", err);
                    alert(`Failed to process Government ID: ${err.message}`);
                }
            }

            // Upload Passport
            if (passportFile) {
                try {
                    const compressedPassport = await compressImageToBase64(passportFile);
                    // STORAGE BYPASS: Base64
                    passportUrl = compressedPassport;
                } catch (err) {
                    console.error("Passport Processing Failed:", err);
                    alert("Failed to process Passport Photo.");
                }
            }

            // Update User Profile
            const services = [formData.primaryService, formData.secondaryService].filter(Boolean); // Create array, remove empty

            await updateDoc(doc(db, "users", currentUser.uid), {
                role: "service_provider",
                status: "pending_review",
                applicationData: {
                    ...formData,
                    services: services, // Save array
                    govIdUrl: idUrl,
                    passportUrl: passportUrl,
                    submittedAt: new Date().toISOString()
                }
            });


            router.push("/dashboard/pending");

        } catch (error) {
            console.error("Registration error:", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-900 px-8 py-6 text-white">
                        <h1 className="text-2xl font-bold">Provider Registration</h1>
                        <p className="text-gray-400 text-sm mt-1">Step 3 of 4: Complete your professional profile</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* 1. Basic Info (Read Only) */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                                <User className="w-4 h-4" /> Personal Details (Verified)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                                    <div className="font-medium text-gray-900">{user?.fullName || "Loading..."}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                                    <div className="font-medium text-gray-900">{user?.email || "Loading..."}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                                    <div className="font-medium text-gray-900">{user?.phone || "Loading..."}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Professional Details */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4" /> Professional Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Service (Required)</label>
                                    <select
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.primaryService}
                                        onChange={(e) => setFormData({ ...formData, primaryService: e.target.value })}
                                    >
                                        {["Plumbing", "Electrical", "Cleaning", "Repairs", "HVAC / AC", "Gardening"].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Service (Optional)</label>
                                    <select
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.secondaryService}
                                        onChange={(e) => setFormData({ ...formData, secondaryService: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        {["Plumbing", "Electrical", "Cleaning", "Repairs", "HVAC / AC", "Gardening"]
                                            .filter(c => c !== formData.primaryService) // Exclude primary
                                            .map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="e.g. 5"
                                        value={formData.experience}
                                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Area</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="e.g. Lagos Island, Lekki, Victoria Island"
                                            value={formData.coverageArea}
                                            onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Documents */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                                <BadgeCheck className="w-4 h-4" /> Verification Documents
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Government ID</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="gov-id"
                                            onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <label htmlFor="gov-id" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-600">{idFile ? idFile.name : "Upload ID Card / Passport"}</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Passport Photograph</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="passport-photo"
                                            onChange={(e) => setPassportFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <label htmlFor="passport-photo" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-600">{passportFile ? passportFile.name : "Upload Recent Photo"}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Declaration */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
                            <input
                                type="checkbox"
                                id="terms"
                                className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                            />
                            <label htmlFor="terms" className="text-sm text-gray-700">
                                I agree that all jobs, payments, and communication must take place on the Wheel of Comfort app. I understand that off-platform transactions are prohibited.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2"
                        >
                            {isLoading ? "Submitting Application..." : "Submit for Review"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
