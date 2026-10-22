"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { auth, db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export default function RestrictedBanner() {
    const [isRestricted, setIsRestricted] = useState(false);
    const [userRole, setUserRole] = useState<string>("user");
    const [rejectionReason, setRejectionReason] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Real-time listener for status changes
                const userRef = doc(db, "users", user.uid);
                const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserRole(data.role || "user");
                        if (data.status === 'restricted') {
                            setIsRestricted(true);
                            setRejectionReason(data.rejectionReason || "One or more documents failed verification.");
                        } else {
                            setIsRestricted(false);
                        }
                    }
                    setIsLoading(false);
                });
                return () => unsubscribeDoc();
            } else {
                setIsRestricted(false);
                setIsLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    if (isLoading || !isRestricted) return null;

    const reuploadHref = userRole === "service_provider"
        ? "/register/provider?mode=update"
        : "/dashboard/user/settings/verification";

    return (
        <div className="bg-red-600 text-white w-full shadow-lg sticky top-0 z-[60]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-full">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide">Application Rejected</h3>
                        <p className="text-xs sm:text-sm text-red-100 max-w-xl">
                            {rejectionReason}
                        </p>
                    </div>
                </div>
                <Link
                    href={reuploadHref}
                    className="whitespace-nowrap px-4 py-2 bg-white text-red-600 font-bold text-sm rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
                >
                    Reupload Documents <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
