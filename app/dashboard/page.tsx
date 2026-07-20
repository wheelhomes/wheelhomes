"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch role
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const role = userData.role;

                        if (role === 'service_provider') router.replace("/dashboard/provider");
                        else if (role === 'agent') router.replace("/dashboard/agent");
                        else if (role === 'admin') router.replace("/admin/dashboard");
                        else router.replace("/dashboard/user");
                    } else {
                        // Default fallback
                        router.replace("/dashboard/user");
                    }
                } catch (e) {
                    router.replace("/dashboard/user");
                }
            } else {
                router.replace("/signin");
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-500">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}
