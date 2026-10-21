"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { resolveUserDestination } from "@/lib/auth-helpers";

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (unsubDoc) unsubDoc();

            if (!user) {
                router.replace("/signin");
                return;
            }

            // Real-time listener: if user changes role or submits onboarding on mobile, dashboard reacts instantly
            unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
                if (!snap.exists()) {
                    router.replace("/dashboard/user");
                    return;
                }

                const userData = snap.data();
                const destination = resolveUserDestination(user, userData);
                router.replace(destination);
            }, (error) => {
                console.error("Dashboard routing error:", error);
                router.replace("/dashboard/user");
            });
        });

        return () => {
            if (unsubDoc) unsubDoc();
            unsubscribe();
        };
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
