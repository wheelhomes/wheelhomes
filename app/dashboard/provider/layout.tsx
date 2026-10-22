"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { doc, collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { Bell, LogOut, ChevronDown, Settings, Menu, X } from "lucide-react";
import ProviderSidebar, {
    OPERATIONAL_MENU_ITEMS,
    ACCOUNT_MENU_ITEMS
} from "@/components/dashboard/ProviderSidebar";
import Link from "next/link";

export default function ProviderDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userName, setUserName] = useState("");
    const [currentDate, setCurrentDate] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Profile Menu State
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notifMenuRef = useRef<HTMLDivElement>(null);

    // Initial Helper
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    useEffect(() => {
        // Set date on client side to avoid hydration mismatch
        setCurrentDate(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));

        // Click outside listener
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        let unsubProfile: (() => void) | null = null;
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (unsubProfile) {
                unsubProfile();
                unsubProfile = null;
            }

            if (u) {
                setUser(u);
                // Listen to user profile for real-time name and passportUrl changes
                unsubProfile = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile(data);
                        setUserName(data.fullName || u.displayName || "Partner");
                    } else {
                        setUserName(u.displayName || "Partner");
                    }
                }, (err) => {
                    console.error("Error listening to user profile:", err);
                    setUserName(u.displayName || "Partner");
                });

                // Listen for Notifications (Single-value queries for 100% security rule and index compatibility)
                const userNotifQuery = query(
                    collection(db, "notifications"),
                    where("recipientId", "==", u.uid),
                    limit(20)
                );

                const broadcastNotifQuery = query(
                    collection(db, "notifications"),
                    where("recipientId", "==", "all"),
                    limit(10)
                );

                let userNotifs: any[] = [];
                let broadcastNotifs: any[] = [];

                const updateNotifications = () => {
                    const combined = [...userNotifs, ...broadcastNotifs];
                    const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

                    unique.sort((a, b) => {
                        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
                    });

                    const final = unique.slice(0, 15);
                    setNotifications(final);
                    setUnreadCount(final.filter((n: any) => !n.read && !n.isRead).length);
                };

                const unsubscribeUserNotif = onSnapshot(userNotifQuery, (snapshot) => {
                    userNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateNotifications();
                }, (err) => console.warn("Provider user notification notice:", err));

                const unsubscribeBroadcast = onSnapshot(broadcastNotifQuery, (snapshot) => {
                    broadcastNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateNotifications();
                }, (err) => console.warn("Provider broadcast notification notice:", err));

                return () => {
                    if (unsubProfile) unsubProfile();
                    unsubscribeUserNotif();
                    unsubscribeBroadcast();
                };

            } else {
                router.push("/signin");
            }
        });
        return () => {
            unsubscribe();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [router]);

    const handleLogout = async () => {
        await auth.signOut();
        localStorage.removeItem("isLoggedIn");
        router.push("/signin");
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-[family-name:var(--font-geist-mono)]">

            {/* Sidebar - Fixed Desktop Layer */}
            <ProviderSidebar />

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Drawer Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/images/wheel logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className="text-base font-bold text-gray-900 leading-tight">Wheel of Comfort</h1>
                            <p className="text-[10px] text-gray-500 font-medium">Service Partner Hub</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* Operations */}
                    <div>
                        <div className="px-3 mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                Operations
                            </span>
                        </div>
                        <div className="space-y-1">
                            {OPERATIONAL_MENU_ITEMS.map((item) => {
                                const active = item.path === "/dashboard/provider"
                                    ? pathname === "/dashboard/provider"
                                    : pathname?.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm ${
                                            active
                                                ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <item.icon className={`w-4.5 h-4.5 ${active ? "text-orange-600" : "text-gray-400"}`} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reputation & Account */}
                    <div>
                        <div className="px-3 mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                Reputation & Account
                            </span>
                        </div>
                        <div className="space-y-1">
                            {ACCOUNT_MENU_ITEMS.map((item) => {
                                const active = item.path === "/dashboard/provider"
                                    ? pathname === "/dashboard/provider"
                                    : pathname?.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm ${
                                            active
                                                ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <item.icon className={`w-4.5 h-4.5 ${active ? "text-orange-600" : "text-gray-400"}`} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors font-semibold text-xs cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content - Pushed Right on Desktop */}
            <main className="flex-1 lg:ml-64 w-full relative h-screen overflow-y-auto">
                <header className="bg-white m-4 sm:m-6 mb-0 rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 sticky top-4 sm:top-6 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            aria-label="Toggle navigation menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate max-w-[180px] sm:max-w-none">
                                Welcome back, {userName} 👋
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                                {currentDate}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <div className="relative" ref={notifMenuRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                            >
                                <Bell className="w-6 h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400 text-sm py-8">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((notif: any) => (
                                                <div key={notif.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-orange-50/50' : ''}`}>
                                                    <p className="text-sm text-gray-800 font-medium line-clamp-2">{notif.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                                                        {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                                        <Link href="/dashboard/notifications" className="text-xs font-bold text-gray-900 hover:underline">
                                            View all
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-px bg-gray-200 mx-2"></div>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 focus:outline-none group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:shadow-lg transition-all overflow-hidden">
                                    {userProfile?.photoURL || userProfile?.passportUrl || userProfile?.applicationData?.passportUrl || user?.photoURL ? (
                                        <img
                                            src={userProfile?.photoURL || userProfile?.passportUrl || userProfile?.applicationData?.passportUrl || user?.photoURL}
                                            alt="Profile"
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        getInitials(userName || "Partner")
                                    )}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-bold text-gray-900 leading-tight">{userName.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500">Service Partner</p>
                                </div>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {/* Profile Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                                    <div className="px-4 py-3 border-b border-gray-50">
                                        <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <Link
                                        href="/dashboard/provider/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Account Settings
                                    </Link>

                                    <div className="border-t border-gray-50 my-1"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
