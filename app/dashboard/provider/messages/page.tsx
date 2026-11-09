"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { Search, MessageSquare, ChevronRight } from "lucide-react";
import { formatRequestCode } from "@/lib/job-utils";

interface ChatSession {
    jobId: string;
    clientId: string;
    clientName: string;
    serviceType?: string;
    description: string;
    status: string;
    requestCode?: string;
    trackingId?: string;
    lastMessage?: string;
    lastMessageTime?: any;
    createdAt?: any;
}

export default function ProviderMessagesPage() {
    const router = useRouter();
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [providerName, setProviderName] = useState<string>("Service Provider");
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Current User & Verify Status
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            const storedId = currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem("tempUserId") : null);
            if (!storedId) {
                router.push("/signin");
                return;
            }
            setCurrentUserId(storedId);

            try {
                const userDoc = await getDoc(doc(db, "users", storedId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProviderName(data.fullName || data.displayName || data.name || "Service Provider");
                    if (data.status !== 'approved') {
                        if (data.status === 'pending_review' || data.status === 'pending' || data.status === 'rejected') {
                            router.replace("/dashboard/pending");
                        } else {
                            router.replace("/register/provider");
                        }
                    }
                }
            } catch (e) {
                console.error("Error verifying provider status in messages:", e);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Fetch Active Jobs for Messages (providerId, hodId, or invitedProviderIds)
    useEffect(() => {
        if (!currentUserId) return;

        const q1 = query(
            collection(db, "job_requests"),
            where("providerId", "==", currentUserId)
        );
        const q2 = query(
            collection(db, "job_requests"),
            where("invitedProviderIds", "array-contains", currentUserId)
        );

        let directDocs: any[] = [];
        let invitedDocs: any[] = [];
        const nameCache: Record<string, string> = {};

        const toCleanClientName = (d: any, clientId: string): string => {
            const raw = String(d.clientName || d.userName || d.customerName || "").trim();
            if (raw && raw !== "Unknown Client" && raw !== "Client") return raw;
            if (nameCache[clientId]) return nameCache[clientId];
            if (clientId && clientId !== "guest-user") {
                return `Client #${clientId.slice(0, 6).toUpperCase()}`;
            }
            return "Client";
        };

        const rebuildSessions = () => {
            const mergedMap = new Map<string, ChatSession>();
            [...directDocs, ...invitedDocs].forEach((docSnap) => {
                const d = docSnap.data();
                // Chat is unlocked only after HOD accepts or dispatches an assistant
                if (["pending", "open", "rejected", "cancelled", "archived"].includes(String(d.status || ""))) {
                    return;
                }
                const cId = String(d.clientId || d.userId || "");
                mergedMap.set(docSnap.id, {
                    jobId: docSnap.id,
                    ...d,
                    clientId: cId,
                    clientName: toCleanClientName(d, cId),
                } as ChatSession);
            });

            const list = Array.from(mergedMap.values()).sort((a, b) => {
                const tA = a.lastMessageTime?.seconds
                    ? a.lastMessageTime.seconds * 1000
                    : a.createdAt?.seconds
                        ? a.createdAt.seconds * 1000
                        : new Date(a.createdAt || 0).getTime();
                const tB = b.lastMessageTime?.seconds
                    ? b.lastMessageTime.seconds * 1000
                    : b.createdAt?.seconds
                        ? b.createdAt.seconds * 1000
                        : new Date(b.createdAt || 0).getTime();
                return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
            });

            setSessions(list);
            setIsLoading(false);

            // Attempt background name resolution if accessible
            list.forEach(async (session) => {
                if (!session.clientId || session.clientId === "guest-user" || nameCache[session.clientId]) return;
                if (session.clientName && !session.clientName.startsWith("Client #")) return;
                try {
                    const stdUserDoc = await getDoc(doc(db, "users", session.clientId));
                    if (stdUserDoc.exists()) {
                        const userData = stdUserDoc.data();
                        const realName = String(userData.fullName || userData.displayName || userData.name || "").trim();
                        if (realName) {
                            nameCache[session.clientId] = realName;
                            setSessions(prev =>
                                prev.map(s => (s.clientId === session.clientId ? { ...s, clientName: realName } : s))
                            );
                        }
                    }
                } catch (_) {
                    // Non-admin providers cannot read client user docs directly; fallback name is already clean
                }
            });
        };

        const unsub1 = onSnapshot(
            q1,
            (snap) => {
                directDocs = snap.docs;
                rebuildSessions();
            },
            (err) => {
                console.warn("Messages direct query notice:", err);
                setIsLoading(false);
            }
        );

        const unsub2 = onSnapshot(
            q2,
            (snap) => {
                invitedDocs = snap.docs;
                rebuildSessions();
            },
            (err) => {
                console.warn("Messages invited query notice:", err);
                setIsLoading(false);
            }
        );

        return () => {
            unsub1();
            unsub2();
        };
    }, [currentUserId]);

    const activeSession = sessions.find(s => s.jobId === selectedJobId);

    const filteredSessions = sessions.filter(s => {
        const q = searchTerm.trim().replace(/^#/, "").toLowerCase();
        if (!q) return true;
        const reqCode = formatRequestCode({ id: s.jobId, ...s }).toLowerCase();
        return (
            s.clientName?.toLowerCase().includes(q) ||
            s.serviceType?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            reqCode.includes(q)
        );
    });

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-100 flex flex-col ${selectedJobId ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-100"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading conversations...</div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No active conversations found.</p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <div
                                key={session.jobId}
                                onClick={() => setSelectedJobId(session.jobId)}
                                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors group ${selectedJobId === session.jobId ? "bg-orange-50 border-orange-100" : ""
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-semibold text-sm ${selectedJobId === session.jobId ? "text-gray-900" : "text-gray-700"}`}>
                                        {session.clientName || "Client"}
                                    </h3>
                                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize font-medium">
                                        {session.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                    {session.lastMessage || session.description}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                    <span className="font-mono font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                                        #{formatRequestCode({ id: session.jobId, ...session })}
                                    </span>
                                    <ChevronRight className={`w-3 h-3 transition-transform ${selectedJobId === session.jobId ? "text-orange-500 translate-x-1" : "opacity-0 group-hover:opacity-100"}`} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col ${!selectedJobId ? 'hidden md:flex' : 'flex'}`}>
                {selectedJobId && activeSession ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedJobId(null)}
                                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div>
                                    <h2 className="font-bold text-gray-900">{activeSession.clientName}</h2>
                                    <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                        {activeSession.serviceType || "Service Request"} • #{formatRequestCode({ id: activeSession.jobId, ...activeSession })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Component */}
                        <UnifiedChat
                            requestId={selectedJobId}
                            currentUserId={currentUserId!}
                            currentUserRole="provider"
                            currentUserName={providerName}
                            clientName={activeSession.clientName}
                            providerName={providerName}
                            className="flex-1 border-none rounded-none"
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Your Messages</h3>
                        <p className="max-w-xs text-center mt-2 text-sm">Select a conversation from the sidebar to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
