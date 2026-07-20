"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    DollarSign,
    MessageSquare,
    Star,
    User,
    Settings,
    LogOut
} from "lucide-react";

export default function ProviderSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (path: string) => {
        if (path === "/dashboard/provider" && pathname === "/dashboard/provider") return true;
        if (path !== "/dashboard/provider" && pathname.startsWith(path)) return true;
        return false;
    };

    const handleLogout = () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("tempUserId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        router.push("/signin");
    };

    const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/provider" },
        { id: "jobs", label: "My Jobs", icon: Briefcase, path: "/dashboard/provider/jobs" },
        { id: "earnings", label: "Earnings", icon: DollarSign, path: "/dashboard/provider/earnings" },
        { id: "messages", label: "Messages", icon: MessageSquare, path: "/dashboard/provider/messages" },
        { id: "ratings", label: "Ratings & Reviews", icon: Star, path: "/dashboard/provider/ratings" },
        { id: "profile", label: "Profile", icon: User, path: "/dashboard/provider/profile" },
        { id: "settings", label: "Settings", icon: Settings, path: "/dashboard/provider/settings" },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-100 fixed inset-y-0 left-0 hidden lg:flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            {/* Header */}
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex items-center gap-3">
                <img src="/images/wheel logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                <div>
                    <h1 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">Wheel of Comfort</h1>
                    <p className="text-xs text-gray-500 font-medium whitespace-nowrap">& Multipurpose Services</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.id}
                        href={item.path}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group font-medium text-sm
                            ${isActive(item.path)
                                ? "bg-orange-50 text-orange-700 shadow-sm"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            }
                        `}
                    >
                        <item.icon
                            className={`
                                w-5 h-5 transition-colors
                                ${isActive(item.path) ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}
                            `}
                        />
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Log Out
                </button>
            </div>
        </aside>
    );
}
