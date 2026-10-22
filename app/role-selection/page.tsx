"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { Home, Wrench, Building2, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { isEmailVerifiedGlobally, resolveUserDestination } from "@/lib/auth-helpers";

export default function RoleSelectionPage() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Ensure user is logged in and guard against overwriting existing roles with real-time sync
    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.replace("/signin");
                return;
            }
            if (unsubDoc) unsubDoc();

            // Real-time listener: if the user selects their role on mobile, web syncs and routes instantly
            unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (!isEmailVerifiedGlobally(user, data)) {
                        router.replace("/verify-email");
                        return;
                    }

                    if (data.role && data.role !== 'pending_role_selection') {
                        router.replace(resolveUserDestination(user, data));
                    }
                }
            }, (err) => console.error("Role check error:", err));
        });

        return () => {
            if (unsubDoc) unsubDoc();
            unsubscribe();
        };
    }, [router]);

    const handleRoleSelect = async (role: 'user' | 'service_provider' | 'agent') => {
        const user = auth.currentUser;
        if (!user) return;

        setIsProcessing(true);
        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            const existingData = snap.exists() ? snap.data() : {};
            const preserveStatus = existingData.status === 'pending_review' || existingData.status === 'approved';

            // Update Role in Firestore
            await updateDoc(doc(db, "users", user.uid), {
                role: role,
                updatedAt: new Date().toISOString()
            });

            // Redirect logic using replace to avoid history loops
            if (role === 'service_provider') {
                router.replace("/register/provider"); // Go to detailed form
            } else if (role === 'agent') {
                router.replace("/dashboard/agent"); // Go to agent dashboard
            } else {
                router.replace("/onboarding/profile"); // Go to profile completion
            }

        } catch (error) {
            console.error("Role update failed:", error);
            alert("Failed to save selection. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12 font-sans">
            <div className="max-w-4xl w-full text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">How will you use Wheelhomes?</h1>
                <p className="text-gray-500 mb-10 max-w-lg mx-auto text-sm">Choose your primary account type. This tailors your experience across properties and services.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1. Client / Resident */}
                    <button
                        onClick={() => handleRoleSelect('user')}
                        disabled={isProcessing}
                        className="bg-white p-7 rounded-2xl border-2 border-transparent hover:border-emerald-500 shadow-lg hover:shadow-2xl transition-all group text-left relative flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Home className="w-7 h-7" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Client
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Client / Resident</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">
                                Hire skilled technicians, request home maintenance, or find apartments and houses to buy or rent.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-emerald-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                            Select Client Account <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                    </button>

                    {/* 2. Service Provider */}
                    <button
                        onClick={() => handleRoleSelect('service_provider')}
                        disabled={isProcessing}
                        className="bg-white p-7 rounded-2xl border-2 border-transparent hover:border-orange-500 shadow-lg hover:shadow-2xl transition-all group text-left relative flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Wrench className="w-7 h-7" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                    Provider
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Service Provider</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">
                                Offer skilled trades — plumbing, electrical, carpentry, AC repair, painting, or home maintenance.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-orange-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                            Select Provider Account <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                    </button>

                    {/* 3. Real Estate Agent */}
                    <button
                        onClick={() => handleRoleSelect('agent')}
                        disabled={isProcessing}
                        className="bg-white p-7 rounded-2xl border-2 border-transparent hover:border-blue-600 shadow-lg hover:shadow-2xl transition-all group text-left relative flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    Agent
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Real Estate Agent</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">
                                Represent property owners to publish verified listings for apartments, houses, land, and commercial spaces.
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-blue-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                            Select Agent Account <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
