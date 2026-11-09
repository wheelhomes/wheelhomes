"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    ArrowLeft,
    CheckCheck,
    MessageSquare,
    Briefcase,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { formatNotificationTime } from "@/lib/notifications";
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
    message?: string;
    body?: string;
    type?: string;
    read?: boolean;
    isRead?: boolean;
    createdAt?: any;
    requestId?: string;
    jobId?: string;
    link?: string;
    recipientId?: string;
    payload?: Record<string, any>;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>("user");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread" | "job" | "chat" | "escrow">("all");

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

    const isItemRead = (n: NotificationItem) => Boolean(n.read || n.isRead);

    const classifyNotif = (n: NotificationItem): "chat" | "escrow" | "job" | "system" => {
        const lower = String(n.title || "").toLowerCase();
        if (n.type === "chat" || n.type === "chat_message" || lower.includes("message") || lower.includes("chat")) {
            return "chat";
        }
        if (n.type === "escrow" || lower.includes("escrow") || lower.includes("payment") || lower.includes("paid")) {
            return "escrow";
        }
        if (
            n.type === "job_update" ||
            lower.includes("job") ||
            lower.includes("dispatch") ||
            lower.includes("hod") ||
            lower.includes("assistant") ||
            lower.includes("request") ||
            lower.includes("completed")
        ) {
            return "job";
        }
        return "system";
    };

    const handleMarkAsRead = async (notifId: string) => {
        try {
            await updateDoc(doc(db, "notifications", notifId), {
                read: true,
                isRead: true,
            });
        } catch (e) {
            console.error("Failed to mark notification read", e);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadItems = notifications.filter(n => !isItemRead(n) && n.recipientId !== "all");
        for (const item of unreadItems) {
            try {
                await updateDoc(doc(db, "notifications", item.id), {
                    read: true,
                    isRead: true,
                });
            } catch (_) {}
        }
    };

    const dashboardHome = userRole === "service_provider" ? "/dashboard/provider" : "/dashboard/user";

    const filtered = notifications.filter((n) => {
        if (filter === "unread") return !isItemRead(n);
        if (filter === "chat") return classifyNotif(n) === "chat";
        if (filter === "job") return classifyNotif(n) === "job";
        if (filter === "escrow") return classifyNotif(n) === "escrow";
        return true;
    });
    const unreadCount = notifications.filter(n => !isItemRead(n)).length;

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
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { id: "all", label: `All (${notifications.length})` },
                        { id: "unread", label: `Unread (${unreadCount})` },
                        { id: "job", label: "Jobs 🛠️" },
                        { id: "chat", label: "Chat 💬" },
                        { id: "escrow", label: "Escrow 🔒" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filter === tab.id
                                    ? "bg-gray-900 text-white shadow-xs"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
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
                            const cat = classifyNotif(notif);
                            const isUnread = !isItemRead(notif);
                            const dateStr = formatNotificationTime(notif.createdAt);
                            const jobId = notif.payload?.jobId || notif.jobId || notif.requestId;

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => {
                                        if (isUnread && notif.recipientId !== "all") {
                                            handleMarkAsRead(notif.id);
                                        }
                                        const targetLink =
                                            notif.link ||
                                            notif.payload?.link ||
                                            (cat === "chat"
                                                ? userRole === "service_provider"
                                                    ? "/dashboard/provider/messages"
                                                    : jobId
                                                        ? `/dashboard/my-requests/details?id=${jobId}`
                                                        : "/dashboard/my-requests"
                                                : jobId
                                                    ? userRole === "service_provider"
                                                        ? "/dashboard/provider/jobs"
                                                        : `/dashboard/my-requests/details?id=${jobId}`
                                                    : "");
                                        if (targetLink) {
                                            router.push(targetLink);
                                        }
                                    }}
                                    className={`p-5 transition-colors flex items-start gap-4 cursor-pointer hover:bg-gray-50/70 ${
                                        isUnread ? "bg-orange-50/40" : ""
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                        cat === "job"
                                            ? "bg-blue-100 text-blue-700"
                                            : cat === "chat"
                                                ? "bg-orange-100 text-orange-700"
                                                : cat === "escrow"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-purple-100 text-purple-700"
                                    }`}>
                                        {cat === "job" ? (
                                            <Briefcase className="w-5 h-5" />
                                        ) : cat === "chat" ? (
                                            <MessageSquare className="w-5 h-5" />
                                        ) : cat === "escrow" ? (
                                            <ShieldCheck className="w-5 h-5" />
                                        ) : (
                                            <Bell className="w-5 h-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={`text-sm font-bold ${isUnread ? "text-gray-950" : "text-gray-800"}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                {dateStr}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {notif.message || notif.body}
                                        </p>
                                    </div>

                                    {isUnread && (
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
