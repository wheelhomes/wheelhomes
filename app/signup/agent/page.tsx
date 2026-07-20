"use client";

import { useState, FormEvent, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info, Eye, EyeOff, Upload, X } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function AgentSignupPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        agencyName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        licenseNumber: "",
        verificationDoc: null as string | null
    });

    // Helper to compress image
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                // Determine file type. If image, compress. If PDF (future), handle differently.
                // For now, assuming image upload for simplicity or enforcing accept="image/*"
                const compressed = await compressImage(file);
                setFormData(prev => ({ ...prev, verificationDoc: compressed }));
            } catch (err) {
                alert("Error processing file. Please ensure it is an image.");
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setIsLoading(true);

        try {
            const dbData = {
                fullName: formData.fullName,
                agencyName: formData.agencyName || "",
                email: formData.email,
                phone: formData.phone,
                licenseNumber: formData.licenseNumber || "",
                verificationDoc: formData.verificationDoc || null,
                role: "agent",
            };

            const dataToSave = {
                submittedAt: new Date().toISOString(),
                status: "pending",
                rejectionReason: null,
                data: dbData
            };

            await addDoc(collection(db, "user_applications"), dataToSave);

            alert("Registration successful! Your agent account is under review.");
            router.push("/");
        } catch (error: any) {
            console.error("Error submitting:", error);
            alert(`Error: ${error.message || "Something went wrong"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-2xl mx-auto mb-8 relative">
                <button
                    onClick={() => router.back()}
                    className="absolute left-0 top-0 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="text-center pt-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Register as Real Estate Agent
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Join our network of trusted agents
                    </p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>

                    {/* Agency Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Agency Name (Optional)
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Premium Estates Ltd"
                            value={formData.agencyName}
                            onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="email"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="tel"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Create password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Confirm password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-gray-400">
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* License Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            License Number (Optional)
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. AGT-2024-001"
                            value={formData.licenseNumber}
                            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        />
                    </div>

                    {/* Verification Document Upload */}
                    <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            Upload Verification Document <span className="text-gray-400 ml-1">(ID Card / Certificate)</span>
                            <Info className="w-4 h-4 text-gray-400 ml-1" />
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {formData.verificationDoc ? (
                            <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                                <img
                                    src={formData.verificationDoc}
                                    alt="Verification Document"
                                    className="w-full h-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, verificationDoc: null }))}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-green-50 transition-colors cursor-pointer group"
                            >
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-green-500 transition-colors mb-3" />
                                <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900">Click to upload document</span>
                                <span className="text-xs text-gray-400 mt-1">Image files only (max 5MB)</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-all shadow-md mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Submitting..." : "Register as Real Estate Agent"}
                    </button>

                </form>
            </div>
        </div>
    );
}
