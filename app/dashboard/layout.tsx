"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { UserProfile } from "../../types/user";
import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push("/signin");
                return;
            }

            // Unsubscribe from previous listener if getting a new user update (unlikely but safe)
            if (unsubscribeDoc) {
                unsubscribeDoc();
            }

            // Real-time listener for status updates (so admin approval works instantly)
            unsubscribeDoc = onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data() as UserProfile;
                    setUserProfile(data);

                    // Logic to redirect if on "pending" page but actually approved
                    if (pathname?.includes("/dashboard/pending") && data.status === 'approved') {
                        if (data.role === 'service_provider') router.push("/dashboard/provider");
                        else router.push("/dashboard/user");
                    }
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching user profile:", error);
                setIsLoading(false);
            });
        });

        // Cleanup function
        return () => {
            if (unsubscribeDoc) unsubscribeDoc();
            unsubscribeAuth();
        };
    }, [pathname]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    }

    if (!userProfile) return null;

    // 1. Pending Review State
    if (userProfile.status === 'pending_review') {
        // Allow access to the specific pending page, block others
        if (pathname !== "/dashboard/pending") {
            router.replace("/dashboard/pending");
            return null;
        }
    }

    // 2. Rejected State
    if (userProfile.status === 'rejected') {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Rejected</h1>
                    <p className="text-gray-600 mb-6">
                        Unfortunately, your application was rejected.
                    </p>

                    {userProfile.rejectionReason && (
                        <div className="bg-red-50 p-4 rounded-lg text-left mb-6 border border-red-100">
                            <h3 className="text-xs font-bold text-red-800 uppercase mb-1">Reason:</h3>
                            <p className="text-sm text-red-700">{userProfile.rejectionReason}</p>
                        </div>
                    )}

                    <Link href="/onboarding/documents" className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2">
                        Re-upload Documents
                    </Link>
                </div>
            </div>
        );
    }

    // 3. Restricted State
    if (userProfile.status === 'restricted' || (userProfile.status as string) === 'rejected') {
        // Allow access to settings to fix issues
        if (pathname?.startsWith("/dashboard/user/settings")) {
            return <>{children}</>;
        }

        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                        {userProfile.status === 'restricted' ? <ShieldAlert className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {userProfile.status === 'restricted' ? "Account Restricted" : "Application Rejected"}
                        </h1>
                        <p className="text-gray-500">
                            {userProfile.status === 'restricted'
                                ? "Your account has been temporarily disabled due to security or policy issues."
                                : userProfile.rejectionReason || "Your application was not approved."}
                        </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-left">
                        <p className="font-bold text-gray-900 mb-1">What can I do?</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Review your profile details</li>
                            <li>Re-upload verification documents</li>
                            <li>Contact support if you believe this is an error</li>
                        </ul>
                    </div>

                    <div className="grid gap-3">
                        <Link href="/dashboard/user/settings/verification" className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2">
                            Fix Verification Issues
                        </Link>
                        <button onClick={() => window.location.href = "mailto:support@wheelofcomfort.com"} className="text-sm font-bold text-gray-500 hover:text-gray-900">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 4. Unverified State (Should have been caught by routing, but safety net)
    if (userProfile.status === 'unverified') {
        router.replace("/verify-email");
        return null;
    }


    return <>{children}</>;
}
