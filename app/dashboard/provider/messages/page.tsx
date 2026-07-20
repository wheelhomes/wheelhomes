"use client";

import { useState, useEffect } from "react";
import { db } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { UnifiedChat } from "@/components/chat/UnifiedChat";
import { Search, MessageSquare, Clock, Filter, ChevronRight } from "lucide-react";

interface ChatSession {
    jobId: string;
    clientId: string;
    clientName: string;
    description: string;
    status: string;
    lastMessage?: string;
    lastMessageTime?: any;
}

export default function ProviderMessagesPage() {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Current User
    useEffect(() => {
        const storedId = localStorage.getItem("tempUserId"); // Consistent with other pages
        setCurrentUserId(storedId);
    }, []);

    // Fetch Active Jobs for Messages
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "job_requests"),
            where("providerId", "==", currentUserId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawSessions = snapshot.docs.map(doc => ({
                jobId: doc.id,
                ...doc.data()
            } as ChatSession));

            // Set initial data immediately
            setSessions(rawSessions);
            setIsLoading(false);

            // Fetch missing names in background and update
            rawSessions.forEach(async (session) => {
                if (session.clientId && (!session.clientName || session.clientName === "Unknown Client")) {
                    // 1. Handle Guest User
                    if (session.clientId === "guest-user") {
                        setSessions(prev => prev.map(s =>
                            s.jobId === session.jobId ? { ...s, clientName: "Guest Client (Unregistered)" } : s
                        ));
                        return;
                    }

                    try {
                        // 2. Try 'users' collection first (Standard Users)
                        const stdUserDoc = await getDoc(doc(db, "users", session.clientId));
                        if (stdUserDoc.exists()) {
                            const userData = stdUserDoc.data();
                            const realName = userData.fullName || "Client";
                            setSessions(prev => prev.map(s =>
                                s.jobId === session.jobId ? { ...s, clientName: realName } : s
                            ));
                            return; // Found
                        }

                        // 3. Fallback: 'user_applications' (Pending/New Users)
                        const userDoc = await getDoc(doc(db, "user_applications", session.clientId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            const realName = userData.fullName || userData.data?.fullName || "Applicant Client";

                            setSessions(prev => prev.map(s =>
                                s.jobId === session.jobId ? { ...s, clientName: realName } : s
                            ));
                        }
                    } catch (e) {
                        console.error("Error fetching name for", session.jobId, e);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const activeSession = sessions.find(s => s.jobId === selectedJobId);

    const filteredSessions = sessions.filter(s =>
        s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                        {session.clientName || "Unknown Client"}
                                    </h3>
                                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                                        {session.status.replace("_", " ")}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                    {session.description}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                    <span>#{session.jobId.slice(0, 5)}</span>
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
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        Active Job #{activeSession.jobId.slice(0, 6)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Component */}
                        <UnifiedChat
                            requestId={selectedJobId}
                            currentUserId={currentUserId!}
                            currentUserRole="provider"
                            currentUserName="You" // In a real app, fetch Provider Name
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
