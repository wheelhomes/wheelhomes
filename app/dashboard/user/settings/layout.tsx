"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Lock, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navigation = [
        { name: "My Profile", href: "/dashboard/user/settings/profile", icon: User },
        { name: "Verification", href: "/dashboard/user/settings/verification", icon: Shield },
        { name: "Security", href: "/dashboard/user/settings/security", icon: Lock },
        { name: "Notifications", href: "/dashboard/user/settings/notifications", icon: Bell },
        { name: "Help & Support", href: "/dashboard/user/settings/support", icon: HelpCircle },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Sticky Header: Title + Nav */}
            <div className="sticky top-0 z-20 bg-gray-50 pt-8 pb-0">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your personal information and security preferences.</p>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${isActive
                                        ? "border-gray-900 text-gray-900"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-2 h-4 w-4 transition-colors ${isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500"
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            <div className="flex flex-col gap-6 pt-6">

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[500px]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
