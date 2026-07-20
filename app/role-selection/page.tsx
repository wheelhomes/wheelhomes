"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { User, Briefcase, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

export default function RoleSelectionPage() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Ensure user is logged in
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) router.push("/signin");
        });
        return () => unsubscribe();
    }, []);

    const handleRoleSelect = async (role: 'user' | 'service_provider') => {
        const user = auth.currentUser;
        if (!user) return;

        setIsProcessing(true);
        try {
            // Update Role in Firestore
            await updateDoc(doc(db, "users", user.uid), {
                role: role,
                status: 'unverified' // Set to unverified initially, will update to pending_review after docs
            });


            // Redirect logic
            if (role === 'service_provider') {
                router.push("/register/provider"); // Go to detailed form
            } else {
                router.push("/onboarding/profile"); // Go to profile completion
            }

        } catch (error) {
            console.error("Role update failed:", error);
            alert("Failed to save selection. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-2xl w-full text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">How will you use Wheel of Comfort?</h1>
                <p className="text-gray-500 mb-12">Choose your primary account type. You can't change this later.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Card */}
                    <button
                        onClick={() => handleRoleSelect('user')}
                        disabled={isProcessing}
                        className="bg-white p-8 rounded-2xl border-2 border-transparent hover:border-blue-500 shadow-xl hover:shadow-2xl transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">I need a Service (User)</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            I want to hire plumbers, electricians, and cleaners for my home or office.
                        </p>
                        <div className="mt-8 flex items-center text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            Select User Account <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </button>

                    {/* Provider Card */}
                    <button
                        onClick={() => handleRoleSelect('service_provider')}
                        disabled={isProcessing}
                        className="bg-white p-8 rounded-2xl border-2 border-transparent hover:border-orange-500 shadow-xl hover:shadow-2xl transition-all group text-left relative overflow-hidden"
                    >
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">I provide Services (Service Provider)</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            I am a professional (e.g., Plumber, Electrician) looking for jobs and customers.
                        </p>
                        <div className="mt-8 flex items-center text-orange-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            Select Partner Account <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
