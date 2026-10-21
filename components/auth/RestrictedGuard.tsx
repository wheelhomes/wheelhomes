"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function RestrictedGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isRestricted, setIsRestricted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async (user: any) => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.status === 'restricted') {
                        setIsRestricted(true);
                        // Allow specific paths
                        const allowedPaths = [
                            '/dashboard/user/settings',
                            '/dashboard/provider/settings',
                            '/register/provider',
                            '/contact',
                            '/about-us',
                            '/signin',
                        ];

                        // If current path is NOT allowed, force redirect
                        if (!allowedPaths.some(p => pathname?.startsWith(p)) && pathname !== '/') {
                            // Force them to verification/settings
                            router.push(data.role === 'service_provider' ? '/dashboard/provider/settings' : '/dashboard/user/settings/verification');
                        }
                    } else {
                        setIsRestricted(false);
                    }
                }
            } catch (e) {
                console.error("Guard Check Failed", e);
            } finally {
                setIsLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(checkStatus);
        return () => unsubscribe();
    }, [pathname, router]);

    // Optional: Show loading state or nothing while checking
    // if (isLoading) return null; 

    return <>{children}</>;
}
