"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, User, Eye, EyeOff } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function NormalUserSignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        location: ""
    });

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
                email: formData.email,
                phone: formData.phone,
                location: formData.location || "",
                role: "user", // Normal User
            };

            const dataToSave = {
                submittedAt: new Date().toISOString(),
                status: "pending",
                rejectionReason: null,
                data: dbData
            };

            // NEW: Check for duplicate email
            const q = query(
                collection(db, "user_applications"),
                where("data.email", "==", formData.email)
            );
            const existingSnapshot = await getDocs(q);

            if (!existingSnapshot.empty) {
                // Check status of existing app
                const existingApp = existingSnapshot.docs[0].data();
                if (existingApp.status === 'pending') {
                    alert("An application pending review already exists for this email.");
                    return;
                } else if (existingApp.status === 'approved') {
                    alert("An account with this email already exists and is approved.");
                    return;
                } else {
                    // If rejected, maybe allow? For now, block to be safe or allow overwrite?
                    // Let's block and say "Application previously rejected" to notify admin manual intervention or use reapply flow.
                    // But for simple "fix duplicate", blocking is safer.
                    alert("An application with this email already exists (Status: " + existingApp.status + ").");
                    return;
                }
            }

            await addDoc(collection(db, "user_applications"), dataToSave);

            alert("Registration successful! Your account is under review.");
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
                        Register as User
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Request services and maintenance
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
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

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Lagos, Abuja"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-purple-600 text-white font-bold py-4 rounded-lg hover:bg-purple-700 transition-all shadow-md mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Submitting..." : "Register as Normal User"}
                    </button>

                </form>
            </div>
        </div>
    );
}
