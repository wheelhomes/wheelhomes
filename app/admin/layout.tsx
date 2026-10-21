"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Shield, FileText, Users, Building2, CreditCard, Sparkles } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        // Skip check for login page
        if (pathname === "/admin/login") {
            setAuthorized(true);
            return;
        }

        let unsub: (() => void) | undefined;
        let cancelled = false;

        (async () => {
            const { getAuth, onAuthStateChanged } = await import("firebase/auth");
            const { doc, getDoc, getFirestore } = await import("firebase/firestore");
            const { auth: appAuth } = await import("../../lib/firebase");
            const auth = appAuth || getAuth();
            const db = getFirestore(auth.app);

            unsub = onAuthStateChanged(auth, async (user) => {
                if (cancelled) return;
                if (!user) {
                    setCurrentUserEmail(null);
                    setAuthorized(false);
                    router.replace("/admin/login");
                    return;
                }
                setCurrentUserEmail(user.email);

                let isAdmin = false;
                try {
                    const tokenResult = await user.getIdTokenResult();
                    if (tokenResult.claims.admin === true) isAdmin = true;
                    if (!isAdmin) {
                        const adminSnap = await getDoc(doc(db, "admins", user.uid));
                        isAdmin = adminSnap.exists();
                    }
                    if (!isAdmin) {
                        const userSnap = await getDoc(doc(db, "users", user.uid));
                        isAdmin = userSnap.exists() && userSnap.data()?.role === "admin";
                    }
                    // TEMPORARY: mirrors firestore.rules isAdmin(); remove once admin claim/doc is set.
                    if (!isAdmin && user.email && ["admin@wheelhomes.com", "admin@wheelofcomfort.com"].includes(user.email)) {
                        isAdmin = true;
                    }
                } catch {
                    isAdmin = false;
                }

                if (cancelled) return;
                if (isAdmin) {
                    setAuthorized(true);
                } else {
                    setAuthorized(false);
                    router.replace("/admin/login");
                }
            });
        })();

        return () => {
            cancelled = true;
            if (unsub) unsub();
        };
    }, [pathname, router]);


    if (!authorized) return null;

    // Don't show sidebar on login page
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        localStorage.removeItem("adminToken");
        try {
            const { signOut, getAuth } = await import("firebase/auth");
            const auth = getAuth();
            await signOut(auth);
        } catch (_) {}
        router.push("/admin/login");
    };

    const menuItems = [
        { name: "Overview", icon: LayoutDashboard, href: "/admin/dashboard" },
        { name: "User Management", icon: Users, href: "/admin/users" },
        { name: "Provider Approvals", icon: Shield, href: "/admin/approvals" },
        { name: "Properties", icon: Building2, href: "/admin/properties" },
        { name: "Service Requests", icon: FileText, href: "/admin/requests" },
        { name: "Transactions & Escrow", icon: CreditCard, href: "/admin/transactions" },
        { name: "Platform Updates", icon: Sparkles, href: "/admin/updates" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 fixed h-full z-20 hidden lg:flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin<span className="text-orange-600">.</span></h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Control Panel</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium ${isActive
                                    ? "bg-orange-50 text-orange-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-2">
                    {currentUserEmail && (
                        <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Signed in as</p>
                                <p className="text-xs font-semibold text-gray-800 truncate" title={currentUserEmail}>{currentUserEmail}</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium group cursor-pointer"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-0 lg:ml-64 w-full p-8">
                {children}
            </main>
        </div>
    );
}
