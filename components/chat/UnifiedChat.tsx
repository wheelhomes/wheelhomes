import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    role?: string;
    createdAt: any;
}

interface UnifiedChatProps {
    requestId: string;
    currentUserId?: string;
    currentUserName?: string;
    currentUserRole: 'user' | 'provider' | 'admin';
    readOnly?: boolean;
    className?: string; // For custom layout overrides
    jobProviderId?: string;
    jobClientId?: string;
    clientName?: string;
    providerName?: string;
}

export const UnifiedChat: React.FC<UnifiedChatProps> = ({
    requestId,
    currentUserId,
    currentUserName = "User",
    currentUserRole,
    readOnly = false,
    className = "",
    clientName,
    providerName,
    jobProviderId,
    jobClientId
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll Logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Firestore Listener
    useEffect(() => {
        if (!requestId) return;
        setIsLoading(true);

        const q = query(
            collection(db, "job_requests", requestId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(fetched);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [requestId]);

    // Send Logic
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        if (!currentUserId) {
            alert("Debug Error: currentUserId is missing in component props.");
            return;
        }

        // Check actual Firebase Auth status
        const { auth } = require('@/lib/firebase'); // Lazy load to avoid cycle if any
        if (!auth.currentUser) {
            alert("Debug Error: You are not signed in to Firebase Auth. Please refresh or sign in again.");
            return;
        }

        if (readOnly) return;

        try {
            await addDoc(collection(db, "job_requests", requestId, "messages"), {
                text: input,
                senderId: currentUserId,
                senderName: currentUserName,
                role: currentUserRole,
                createdAt: serverTimestamp()
            });
            setInput('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert(`Failed to send message: ${(error as any).message}`);
        }
    };

    // Render Helpers
    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'Sending...';
        // Handle Firestore Timestamp or serialized date string
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper to get display name for Admin view
    const getAdminDisplayName = (msg: Message) => {
        if (currentUserRole !== 'admin') return msg.senderName;

        // Debug Log (Temporary)
        console.log(`MsgId: ${msg.id} | Sender: ${msg.senderId} | Prov: ${jobProviderId} | Client: ${jobClientId}`);

        // Match by ID first (Robust for old fallback messages)
        if (jobProviderId && msg.senderId === jobProviderId) {
            return providerName || "Service Provider";
        }
        if (jobClientId && msg.senderId === jobClientId) {
            return clientName || "Client";
        }

        // Fallback to role if ID match fails or IDs not provided
        if (msg.role === 'provider') return providerName || "Service Provider";
        if (msg.role === 'user') return clientName || "Client";

        return msg.senderName; // Final Fallback
    };

    return (
        <div className={`flex flex-col h-full bg-gray-50 overflow-hidden rounded-xl border border-gray-200 ${className}`}>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-sm">Loading chat...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                        <MessageSquare className="w-12 h-12" />
                        <p className="text-sm font-medium text-gray-400">No messages yet</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // "Me" logic: Sender ID matches Current User ID
                        const isMe = currentUserId && msg.senderId === currentUserId;
                        const isSystem = msg.senderName?.toLowerCase().includes("system");

                        // System Message Style (Center)
                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <div className="bg-gray-200 text-gray-600 text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                                        <AlertCircle className="w-3 h-3" />
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        }

                        const displayName = getAdminDisplayName(msg);

                        // Normal Message Style (Left/Right)
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm relative group transition-all duration-200 ${isMe
                                    ? 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                    }`}>
                                    {!isMe && (
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                                            {displayName}
                                        </p>
                                    )}
                                    <p className={`leading-relaxed ${isMe ? 'text-white' : 'text-gray-700'}`}>
                                        {msg.text}
                                    </p>
                                    <p className={`text-[10px] mt-1 text-right opacity-80 ${isMe ? 'text-orange-100' : 'text-gray-400'
                                        }`}>
                                        {formatTime(msg.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!readOnly ? (
                <div className="p-3 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm border-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-2 top-1.5 p-1.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Read Only Mode
                    </p>
                </div>
            )}
        </div>
    );
};
