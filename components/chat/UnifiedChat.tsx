import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageSquare, AlertCircle, Smile, Volume2, VolumeX, Check, CheckCheck, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { formatRequestCode } from '@/lib/job-utils';
import { WhatsAppEmojiPicker } from './WhatsAppEmojiPicker';
import {
    isChatSoundMuted,
    setChatSoundMuted,
    playIncomingChatSound,
    playOutgoingChatSound,
} from '@/lib/chat-sound';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    role?: string;
    createdAt: any;
    status?: 'sent' | 'delivered' | 'read';
    delivered?: boolean;
    read?: boolean;
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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [soundMuted, setSoundMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [jobMeta, setJobMeta] = useState<Record<string, any>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevCountRef = useRef<number>(0);
    const initialLoadDoneRef = useRef<boolean>(false);

    useEffect(() => {
        setSoundMuted(isChatSoundMuted());
    }, []);

    // Scroll Logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Firestore Listener + Read Receipt Sync
    useEffect(() => {
        if (!requestId) return;
        setIsLoading(true);
        initialLoadDoneRef.current = false;
        prevCountRef.current = 0;

        const jobRef = doc(db, "job_requests", requestId);
        const markedReadIds = new Set<string>();
        const unsubJob = onSnapshot(
            jobRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data() || {};
                    setJobMeta(data);
                    if (
                        currentUserId &&
                        currentUserRole !== 'admin' &&
                        data.lastMessageSenderId &&
                        data.lastMessageSenderId !== currentUserId &&
                        data.lastMessageStatus !== 'read'
                    ) {
                        const readFields =
                            currentUserRole === 'provider'
                                ? {
                                      providerLastDeliveredAt: serverTimestamp(),
                                      providerLastReadAt: serverTimestamp(),
                                      lastMessageStatus: "read",
                                  }
                                : {
                                      clientLastDeliveredAt: serverTimestamp(),
                                      clientLastReadAt: serverTimestamp(),
                                      lastMessageStatus: "read",
                                  };
                        updateDoc(jobRef, readFields).catch(() => {});
                    }
                }
            },
            () => {}
        );

        const q = query(
            collection(db, "job_requests", requestId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetched: Message[] = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                } as Message));

                if (
                    initialLoadDoneRef.current &&
                    fetched.length > prevCountRef.current
                ) {
                    const newest = fetched[fetched.length - 1];
                    if (newest && newest.senderId !== currentUserId) {
                        playIncomingChatSound();
                    }
                }
                initialLoadDoneRef.current = true;
                prevCountRef.current = fetched.length;

                setMessages(fetched);
                setIsLoading(false);

                // Automatically mark incoming messages as READ when chat is open
                if (currentUserId && currentUserRole !== 'admin') {
                    const unreadIncoming = fetched.filter(
                        (m) =>
                            m.senderId !== currentUserId &&
                            !markedReadIds.has(m.id) &&
                            (!m.read || m.status !== 'read')
                    );
                    if (unreadIncoming.length > 0) {
                        unreadIncoming.forEach((m) => markedReadIds.add(m.id));
                        const readFields =
                            currentUserRole === 'provider'
                                ? {
                                      providerLastDeliveredAt: serverTimestamp(),
                                      providerLastReadAt: serverTimestamp(),
                                      lastMessageStatus: "read",
                                  }
                                : {
                                      clientLastDeliveredAt: serverTimestamp(),
                                      clientLastReadAt: serverTimestamp(),
                                      lastMessageStatus: "read",
                                  };
                        updateDoc(jobRef, readFields).catch(() => {});
                    }
                }
            },
            (error) => {
                console.warn("UnifiedChat listener notice:", error);
                setIsLoading(false);
            }
        );

        return () => {
            unsubJob();
            unsubscribe();
        };
    }, [requestId, currentUserId, currentUserRole, "whatsapp-ticks-v2"]);

    // Send Logic
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const msgText = input.trim();
        if (!msgText) return;

        if (!currentUserId) {
            alert("Please sign in to send messages.");
            return;
        }

        // Check actual Firebase Auth status
        const { auth } = require('@/lib/firebase');
        if (!auth.currentUser) {
            alert("You are not signed in to Firebase Auth. Please refresh or sign in again.");
            return;
        }

        if (readOnly) return;

        try {
            setInput('');
            setShowEmojiPicker(false);
            playOutgoingChatSound();
            const jobRef = doc(db, "job_requests", requestId);
            await Promise.all([
                addDoc(collection(db, "job_requests", requestId, "messages"), {
                    text: msgText,
                    senderId: currentUserId,
                    senderName: currentUserName,
                    role: currentUserRole,
                    status: 'sent',
                    delivered: false,
                    read: false,
                    createdAt: serverTimestamp()
                }),
                updateDoc(jobRef, {
                    lastMessage: msgText,
                    lastMessageSenderId: currentUserId,
                    lastMessageSenderName: currentUserName,
                    lastMessageStatus: 'sent',
                    lastMessageTime: serverTimestamp(),
                    ...(currentUserRole === 'provider'
                        ? {
                              providerLastDeliveredAt: serverTimestamp(),
                              providerLastReadAt: serverTimestamp(),
                          }
                        : {
                              clientLastDeliveredAt: serverTimestamp(),
                              clientLastReadAt: serverTimestamp(),
                          }),
                }).catch(() => {}),
            ]);

            // Notify counterparty
            try {
                const jobSnap = await getDoc(jobRef);
                if (jobSnap.exists()) {
                    const jd = jobSnap.data();
                    const reqCode = formatRequestCode({ id: requestId, ...jd });
                    const targetUid =
                        currentUserRole === "provider"
                            ? jd.clientId || jd.userId
                            : jd.providerId || jd.hodId;

                    if (targetUid && targetUid !== currentUserId) {
                        await addDoc(collection(db, "notifications"), {
                            userId: targetUid,
                            recipientId: targetUid,
                            title: `New Message from ${currentUserName} (#${reqCode}) 💬`,
                            message: msgText.length > 120 ? `${msgText.slice(0, 117)}...` : msgText,
                            body: msgText.length > 120 ? `${msgText.slice(0, 117)}...` : msgText,
                            type: "info",
                            read: false,
                            isRead: false,
                            createdAt: new Date().toISOString(),
                            payload: { jobId: requestId, requestCode: reqCode },
                        });
                    }
                }
            } catch (_) {
                // Non-blocking metadata sync
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setInput(msgText);
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

    // Helper to get display name
    const getAdminDisplayName = (msg: Message) => {
        if (currentUserRole !== 'admin') {
            if (!msg.senderName || msg.senderName === 'You' || msg.senderName === 'User') {
                if (msg.role === 'provider') return providerName || "Service Provider";
                if (msg.role === 'user') return clientName || "Client";
            }
            return msg.senderName;
        }

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
                    messages.map((msg, idx) => {
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
                        const msgSec = msg.createdAt?.seconds || 0;
                        const otherReadSec =
                            currentUserRole === 'provider'
                                ? jobMeta.clientLastReadAt?.seconds || 0
                                : jobMeta.providerLastReadAt?.seconds || 0;
                        const otherDeliveredSec =
                            currentUserRole === 'provider'
                                ? jobMeta.clientLastDeliveredAt?.seconds || 0
                                : jobMeta.providerLastDeliveredAt?.seconds || 0;
                        const hasSubsequentReplyFromOther = messages
                            .slice(idx + 1)
                            .some((m) => m.senderId !== currentUserId);

                        const isRead =
                            msg.read === true ||
                            msg.status === 'read' ||
                            hasSubsequentReplyFromOther ||
                            (msgSec > 0 && otherReadSec > 0 && msgSec <= otherReadSec + 5) ||
                            (jobMeta.lastMessageSenderId === currentUserId && jobMeta.lastMessageStatus === 'read');

                        const isDelivered =
                            isRead ||
                            msg.delivered === true ||
                            msg.status === 'delivered' ||
                            (msgSec > 0 && otherDeliveredSec > 0 && msgSec <= otherDeliveredSec + 5) ||
                            (jobMeta.lastMessageSenderId === currentUserId && jobMeta.lastMessageStatus === 'delivered');

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
                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-orange-100' : 'text-gray-400'}`}>
                                        <span className="text-[10px] opacity-80">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        {isMe && (
                                            !msg.createdAt?.seconds ? (
                                                <Clock className="w-3 h-3 text-orange-200" />
                                            ) : isRead ? (
                                                <span
                                                    title="Read"
                                                    className="inline-flex items-center justify-center bg-white px-1.5 py-0.5 rounded-full shadow-xs ml-0.5"
                                                >
                                                    <CheckCheck className="w-3.5 h-3.5 text-[#0066FF] stroke-[2.8]" />
                                                </span>
                                            ) : isDelivered ? (
                                                <span title="Delivered" className="inline-flex items-center">
                                                    <CheckCheck className="w-4 h-4 text-white/85 stroke-[2.2]" />
                                                </span>
                                            ) : (
                                                <span title="Sent" className="inline-flex items-center">
                                                    <Check className="w-3.5 h-3.5 text-white/80 stroke-[2.2]" />
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area (WhatsApp Style Pill + Categorized Service Emoji Drawer) */}
            {!readOnly ? (
                <div className="p-3 bg-[#f0f2f5] border-t border-gray-200">
                    {showEmojiPicker && (
                        <WhatsAppEmojiPicker
                            onSelectEmoji={(emoji) => {
                                setInput((prev) => `${prev}${emoji}`);
                                inputRef.current?.focus();
                            }}
                            onBackspace={() => {
                                setInput((prev) => Array.from(prev).slice(0, -1).join(""));
                                inputRef.current?.focus();
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    )}
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-orange-400 transition-all">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker((prev) => !prev)}
                                title="Emojis & Service Icons"
                                className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                                    showEmojiPicker
                                        ? "bg-orange-100 text-orange-600"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                }`}
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message"
                                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 px-2 py-2 focus:outline-none text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const nextMuted = !soundMuted;
                                    setSoundMuted(nextMuted);
                                    setChatSoundMuted(nextMuted);
                                    if (!nextMuted) {
                                        playIncomingChatSound(true);
                                    }
                                }}
                                title={soundMuted ? "Unmute Notification Tune" : "Notification Tune Active (Click to Mute)"}
                                className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                                    soundMuted
                                        ? "text-gray-400 hover:bg-gray-100"
                                        : "text-orange-600 hover:bg-orange-50"
                                }`}
                            >
                                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-md cursor-pointer shrink-0"
                        >
                            <Send className="w-5 h-5" />
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
