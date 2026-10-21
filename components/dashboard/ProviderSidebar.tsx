"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    Store,
    DollarSign,
    MessageSquare,
    Star,
    User,
    Settings,
    LogOut,
    ShieldCheck,
    Clock
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export const OPERATIONAL_MENU_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/provider" },
    { id: "jobs", label: "My Jobs", icon: Briefcase, path: "/dashboard/provider/jobs" },
    { id: "market", label: "Job Market", icon: Store, path: "/dashboard/provider/market" },
    { id: "messages", label: "Messages", icon: MessageSquare, path: "/dashboard/provider/messages" },
    { id: "earnings", label: "Earnings & Payouts", icon: DollarSign, path: "/dashboard/provider/earnings" },
];

export const ACCOUNT_MENU_ITEMS = [
    { id: "ratings", label: "Ratings & Reviews", icon: Star, path: "/dashboard/provider/ratings" },
    { id: "profile", label: "Profile & Portfolio", icon: User, path: "/dashboard/provider/profile" },
    { id: "settings", label: "Account Settings", icon: Settings, path: "/dashboard/provider/settings" },
];

export const PROVIDER_MENU_ITEMS = [
    ...OPERATIONAL_MENU_ITEMS,
    ...ACCOUNT_MENU_ITEMS,
];

export default function ProviderSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [profile, setProfile] = useState<{
        fullName?: string;
        serviceCategory?: string;
        status?: string;
        passportUrl?: string;
    } | null>(null);

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setProfile({
                            fullName: data.fullName || user.displayName || "Service Partner",
                            serviceCategory: data.serviceCategory || (data.services && data.services[0]) || "Specialist",
                            status: data.status || "unverified",
                            passportUrl: data.passportUrl || data.photoURL || user.photoURL,
                        });
                    }
                }, (err) => console.warn("Sidebar profile listener notice:", err));
            } else {
                setProfile(null);
            }
        });

        return () => {
            if (unsubDoc) unsubDoc();
            unsubAuth();
        };
    }, []);

    const isActive = (path: string) => {
        if (path === "/dashboard/provider" && pathname === "/dashboard/provider") return true;
        if (path !== "/dashboard/provider" && pathname.startsWith(path)) return true;
        return false;
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (_) {}
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("tempUserId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        router.push("/signin");
    };

    const isVerified = profile?.status === "approved";
    const initials = (profile?.fullName || "SP")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <aside className="w-64 bg-white border-r border-gray-100 fixed inset-y-0 left-0 hidden lg:flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            {/* Header Brand */}
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <img src="/images/wheel logo.png" alt="Logo" className="w-11 h-11 object-contain" />
                <div>
                    <h1 className="text-base font-bold text-gray-900 leading-tight whitespace-nowrap">Wheel of Comfort</h1>
                    <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Service Partner Hub</p>
                </div>
            </div>

            {/* Navigation Body */}
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {/* 1. Daily Operations Section */}
                <div>
                    <div className="px-3 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                            Operations
                        </span>
                    </div>
                    <div className="space-y-1">
                        {OPERATIONAL_MENU_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    className={`
                                        w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm
                                        ${active
                                            ? "bg-orange-50 text-orange-700 shadow-xs font-semibold"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }
                                    `}
                                >
                                    <item.icon
                                        className={`
                                            w-4.5 h-4.5 transition-colors
                                            ${active ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}
                                        `}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Preferences & Reputation Section */}
                <div>
                    <div className="px-3 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                            Reputation & Account
                        </span>
                    </div>
                    <div className="space-y-1">
                        {ACCOUNT_MENU_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    className={`
                                        w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm
                                        ${active
                                            ? "bg-orange-50 text-orange-700 shadow-xs font-semibold"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }
                                    `}
                                >
                                    <item.icon
                                        className={`
                                            w-4.5 h-4.5 transition-colors
                                            ${active ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}
                                        `}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Bottom Provider Dossier & Logout Card */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                {/* Mini Identity Card */}
                <div className="p-2.5 rounded-xl bg-white border border-gray-200/60 shadow-xs flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                        {profile?.passportUrl ? (
                            <img src={profile.passportUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                            {profile?.fullName || "Service Partner"}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            {isVerified ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">Verified Pro</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span className="truncate">{profile?.status === "rejected" ? "Needs Update" : "Under Review"}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors font-semibold text-xs group cursor-pointer"
                >
                    <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
