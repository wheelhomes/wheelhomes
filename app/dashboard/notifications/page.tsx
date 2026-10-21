"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    CheckCircle2,
    Clock,
    ArrowLeft,
    CheckCheck,
    MessageSquare,
    Briefcase,
    ShieldAlert,
    Trash2,
    Loader2
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    limit
} from "firebase/firestore";
import Link from "next/link";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type?: string;
    read?: boolean;
    createdAt?: any;
    requestId?: string;
    jobId?: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>("user");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push("/signin");
                return;
            }
            setUser(currentUser);

            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role || "user");
                }
            } catch (e) {
                console.warn("Could not fetch user role", e);
            }

            const qUser = query(
                collection(db, "notifications"),
                where("recipientId", "==", currentUser.uid),
                limit(50)
            );

            const qAll = query(
                collection(db, "notifications"),
                where("recipientId", "==", "all"),
                limit(20)
            );

            let userList: NotificationItem[] = [];
            let allList: NotificationItem[] = [];

            const mergeAndSet = () => {
                const combined = [...userList, ...allList];
                const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                unique.sort((a, b) => {
                    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                });
                setNotifications(unique);
                setIsLoading(false);
            };

            const unsub1 = onSnapshot(qUser, (snap) => {
                userList = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
                mergeAndSet();
            }, () => setIsLoading(false));

            const unsub2 = onSnapshot(qAll, (snap) => {
                allList = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
                mergeAndSet();
            }, () => setIsLoading(false));

            return () => {
                unsub1();
                unsub2();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleMarkAsRead = async (notifId: string) => {
        try {
            await updateDoc(doc(db, "notifications", notifId), {
                read: true,
            });
        } catch (e) {
            console.error("Failed to mark notification read", e);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadItems = notifications.filter(n => !n.read);
        for (const item of unreadItems) {
            try {
                await updateDoc(doc(db, "notifications", item.id), {
                    read: true,
                });
            } catch (_) {}
        }
    };

    const dashboardHome = userRole === "service_provider" ? "/dashboard/provider" : "/dashboard/user";

    const filtered = filter === "all" ? notifications : notifications.filter(n => !n.read);
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={dashboardHome}
                            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications & Alerts</h1>
                                {unreadCount > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Real-time dispatches, job updates, and account activity.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5 text-gray-500" />
                                <span>Mark All Read</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filter === "all"
                                ? "bg-gray-900 text-white shadow-xs"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("unread")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filter === "unread"
                                ? "bg-gray-900 text-white shadow-xs"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>

                {/* Notification List */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900 mb-2" />
                            <p className="text-sm">Loading activity notifications...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 space-y-2">
                            <Bell className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-bold text-gray-700">No notifications found</p>
                            <p className="text-xs text-gray-400">You are all caught up with your dispatches and alerts.</p>
                        </div>
                    ) : (
                        filtered.map((notif) => {
                            const isJobAlert = notif.title.toLowerCase().includes("job") || notif.title.toLowerCase().includes("dispatch");
                            const isChat = notif.title.toLowerCase().includes("message") || notif.title.toLowerCase().includes("chat");
                            const dateStr = notif.createdAt?.seconds
                                ? new Date(notif.createdAt.seconds * 1000).toLocaleString()
                                : "Recent";

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                    className={`p-5 transition-colors flex items-start gap-4 cursor-pointer hover:bg-gray-50/70 ${
                                        !notif.read ? "bg-orange-50/40" : ""
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                        isJobAlert
                                            ? "bg-blue-100 text-blue-700"
                                            : isChat
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                        {isJobAlert ? (
                                            <Briefcase className="w-5 h-5" />
                                        ) : isChat ? (
                                            <MessageSquare className="w-5 h-5" />
                                        ) : (
                                            <Bell className="w-5 h-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={`text-sm font-bold ${!notif.read ? "text-gray-950" : "text-gray-800"}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                {dateStr}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {notif.message}
                                        </p>
                                    </div>

                                    {!notif.read && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" title="Unread" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
