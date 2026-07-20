"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function PublicLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Define routes where the public header/footer should be hidden
    // We add '/onboarding' just in case, though the header handles it internally, hiding the whole thing might be cleaner?
    // User requested "remove details of website from main application".
    const isAppRoute = pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/admin") ||
        pathname?.startsWith("/settings");

    return (
        <>
            {!isAppRoute && <Header />}
            {children}
            {!isAppRoute && <Footer />}
        </>
    );
}
