"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Briefcase, CreditCard, User, Settings, LogOut } from "lucide-react";

// Update Props
interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (path: string) => {
        if (path === "/dashboard/user" && pathname === "/dashboard/user") return true;
        if (path !== "/dashboard/user" && pathname.startsWith(path)) return true;
        return false;
    };

    const handleLogout = () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("tempUserId");
        localStorage.removeItem("userName");
        router.push("/signin");
    };

    const menuItems = [
        { id: "home", label: "Home", icon: LayoutDashboard, path: "/dashboard/user" },
        { id: "requests", label: "My Requests", icon: Briefcase, path: "/dashboard/my-requests" },
        { id: "payments", label: "Payments", icon: CreditCard, path: "/dashboard/payments" },
        { id: "profile", label: "Profile", icon: User, path: "/dashboard/profile" },
        { id: "settings", label: "Settings", icon: Settings, path: "/dashboard/user/settings" },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                w-64 bg-white border-r border-gray-100 fixed inset-y-0 left-0 flex flex-col z-50 transition-transform duration-300
                lg:translate-x-0 lg:static lg:h-screen
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img src="/images/wheel logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">Wheel of Comfort</h1>
                            <p className="text-xs text-gray-500 font-medium whitespace-nowrap">& Multipurpose Services</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.path}
                            onClick={onClose} // Close on nav
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium ${isActive(item.path)
                                ? "bg-orange-50 text-orange-700 shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive(item.path) ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
                        <LogOut className="w-5 h-5" />
                        Log Out
                    </button>
                </div>
            </aside>
        </>
    );
}
