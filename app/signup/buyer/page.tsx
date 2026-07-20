"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Home, Info, Eye, EyeOff } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function BuyerSignupPage() {
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
        location: "",
        interest: "buy", // 'buy' or 'rent'
        budget: ""
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setIsLoading(true);

        try {
            // NOTE: We do NOT use the password here for Auth yet.
            // The password is effectively discarded or strictly placeholder because
            // the system will GENERATE a temporary password upon Admin Approval.
            // We store the application data for review.

            const dbData = {
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                location: formData.location,
                interest: formData.interest,
                budget: formData.budget || "Not specified",
                role: "buyer", // Identify the role
            };

            const dataToSave = {
                submittedAt: new Date().toISOString(),
                status: "pending",
                rejectionReason: null,
                data: dbData
            };

            // Use the same collection 'service_provider_applications'? 
            // OR a generic 'user_applications'?
            // Let's use a unified collection 'user_applications' for simpler Admin management,
            // or stick to the existing one if we want to reuse code.
            // Better: 'user_applications' and migrate the existing logic or just use 'service_provider_applications' 
            // but that name is confusing. 
            // Let's create a NEW collection 'user_applications' for all new roles.
            // (I will need to update the Admin panel to read this instead).

            await addDoc(collection(db, "user_applications"), dataToSave);

            alert("Registration successful! Your account is under review. You'll be notified once approved.");
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
                        Register as Buyer or Renter
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Find your next dream property
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                            Preferred Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Lagos, Abuja"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    {/* Interest & Budget */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                I'm interested in:
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.interest === 'buy' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <input
                                        type="radio"
                                        name="interest"
                                        value="buy"
                                        checked={formData.interest === 'buy'}
                                        onChange={() => setFormData({ ...formData, interest: 'buy' })}
                                        className="hidden"
                                    />
                                    Buy Property
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.interest === 'rent' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <input
                                        type="radio"
                                        name="interest"
                                        value="rent"
                                        checked={formData.interest === 'rent'}
                                        onChange={() => setFormData({ ...formData, interest: 'rent' })}
                                        className="hidden"
                                    />
                                    Rent Property
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Budget Range (Optional)
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 5M - 10M"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-all shadow-md mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Submitting..." : "Register as Buyer / Renter"}
                    </button>

                </form>
            </div>
        </div>
    );
}
