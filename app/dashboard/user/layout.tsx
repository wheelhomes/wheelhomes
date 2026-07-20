"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, Home, Bell, Settings, ChevronDown, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import Sidebar from "../../../components/dashboard/Sidebar";

export default function UserDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userName, setUserName] = useState("");
    const [currentDate, setCurrentDate] = useState("");

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Profile Menu State
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notifMenuRef = useRef<HTMLDivElement>(null);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);

                // 1. Fetch user profile
                try {
                    const docRef = doc(db, "users", u.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserName(data.fullName || u.displayName || "User");
                    } else {
                        setUserName(u.displayName || "User");
                    }
                } catch (err) {
                    console.error("Error fetching user name:", err);
                    setUserName(u.displayName || "User");
                }

                // 2. Listen for Notifications (Split queries to avoid permission issues)
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
                    // Combine and sort
                    const combined = [...userNotifs, ...broadcastNotifs];
                    // Remove duplicates by ID
                    const unique = combined.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

                    unique.sort((a, b) => {
                        const tA = a.createdAt?.seconds || 0;
                        const tB = b.createdAt?.seconds || 0;
                        return tB - tA;
                    });

                    const final = unique.slice(0, 15);
                    setNotifications(final);
                    setUnreadCount(final.filter((n: any) => !n.read).length);
                };

                const unsubscribeUserNotif = onSnapshot(userNotifQuery, (snapshot) => {
                    userNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateNotifications();
                }, (err) => console.log("User notif error", err));

                const unsubscribeBroadcast = onSnapshot(broadcastNotifQuery, (snapshot) => {
                    broadcastNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateNotifications();
                }, (err) => console.log("Broadcast notif error", err));

                return () => {
                    unsubscribeUserNotif();
                    unsubscribeBroadcast();
                }

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
        <div className="h-screen bg-gray-50 flex font-sans overflow-hidden">
            {/* Global Sidebar - Now included globally */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">
                {/* New App Header */}
                <header className="bg-white m-4 md:m-6 mb-0 rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 flex-none z-20">
                    <div className="flex items-center gap-3">
                        {/* Mobile Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Welcome back, {userName} 👋
                            </h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">
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
                                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:shadow-lg transition-all">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        getInitials(userName || "User")
                                    )}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-bold text-gray-900 leading-tight">{userName.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500">Home Owner</p>
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
                                        href="/dashboard/user/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
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

                <main className="flex-1 w-full overflow-y-auto bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
