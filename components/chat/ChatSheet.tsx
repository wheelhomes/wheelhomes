"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare, Loader2, Smile, Volume2, VolumeX, Check, CheckCheck, Clock, Phone } from "lucide-react";
import { requestOnlineCall } from "@/lib/call-service";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { formatRequestCode } from "@/lib/job-utils";
import { WhatsAppEmojiPicker } from "./WhatsAppEmojiPicker";
import {
    isChatSoundMuted,
    setChatSoundMuted,
    playIncomingChatSound,
    playOutgoingChatSound,
} from "@/lib/chat-sound";

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
    status?: "sent" | "delivered" | "read";
    delivered?: boolean;
    read?: boolean;
}

interface ChatSheetProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    currentUserId: string;
    currentUserName: string;
    recipientName: string; // The name of the person we are chatting with
}

export default function ChatSheet({ isOpen, onClose, jobId, currentUserId, currentUserName, recipientName }: ChatSheetProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
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

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Fetch Messages & Sync Read Receipts
    useEffect(() => {
        if (!isOpen || !jobId) return;
        setIsLoading(true);
        initialLoadDoneRef.current = false;
        prevCountRef.current = 0;

        const jobRef = doc(db, "job_requests", jobId);
        const markedReadIds = new Set<string>();
        const unsubJob = onSnapshot(
            jobRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data() || {};
                    setJobMeta(data);
                    if (
                        data.lastMessageSenderId &&
                        data.lastMessageSenderId !== currentUserId &&
                        data.lastMessageStatus !== "read"
                    ) {
                        updateDoc(jobRef, {
                            providerLastDeliveredAt: serverTimestamp(),
                            providerLastReadAt: serverTimestamp(),
                            lastMessageStatus: "read",
                        }).catch(() => {});
                    }
                }
            },
            () => {}
        );

        const q = query(
            collection(db, "job_requests", jobId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedMessages = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                } as Message));

                if (
                    initialLoadDoneRef.current &&
                    fetchedMessages.length > prevCountRef.current
                ) {
                    const newest = fetchedMessages[fetchedMessages.length - 1];
                    if (newest && newest.senderId !== currentUserId) {
                        playIncomingChatSound();
                    }
                }
                initialLoadDoneRef.current = true;
                prevCountRef.current = fetchedMessages.length;

                setMessages(fetchedMessages);
                setIsLoading(false);

                // Mark any incoming messages as READ since ChatSheet is open
                const unreadIncoming = fetchedMessages.filter(
                    (m) =>
                        m.senderId !== currentUserId &&
                        !markedReadIds.has(m.id) &&
                        (!m.read || m.status !== "read")
                );
                if (unreadIncoming.length > 0) {
                    unreadIncoming.forEach((m) => markedReadIds.add(m.id));
                    updateDoc(jobRef, {
                        providerLastDeliveredAt: serverTimestamp(),
                        providerLastReadAt: serverTimestamp(),
                        lastMessageStatus: "read",
                    }).catch(() => {});
                }
            },
            (err) => {
                console.warn("ChatSheet listener notice:", err);
                setIsLoading(false);
            }
        );

        return () => {
            unsubJob();
            unsubscribe();
        };
    }, [isOpen, jobId, currentUserId, "whatsapp-ticks-v2"]);

    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if (!text || !jobId || !currentUserId) return;

        try {
            setNewMessage("");
            setShowEmojiPicker(false);
            playOutgoingChatSound();
            const jobRef = doc(db, "job_requests", jobId);
            await Promise.all([
                addDoc(collection(db, "job_requests", jobId, "messages"), {
                    text,
                    senderId: currentUserId,
                    senderName: currentUserName,
                    role: "provider",
                    status: "sent",
                    delivered: false,
                    read: false,
                    createdAt: serverTimestamp()
                }),
                updateDoc(jobRef, {
                    lastMessage: text,
                    lastMessageSenderId: currentUserId,
                    lastMessageSenderName: currentUserName,
                    lastMessageStatus: "sent",
                    lastMessageTime: serverTimestamp(),
                    providerLastDeliveredAt: serverTimestamp(),
                    providerLastReadAt: serverTimestamp(),
                }).catch(() => {}),
            ]);

            // Notify the client
            try {
                const jobSnap = await getDoc(jobRef);
                if (jobSnap.exists()) {
                    const jd = jobSnap.data();
                    const clientId = jd.clientId || jd.userId;
                    const reqCode = formatRequestCode({ id: jobId, ...jd });
                    if (clientId && clientId !== currentUserId) {
                        await addDoc(collection(db, "notifications"), {
                            userId: clientId,
                            recipientId: clientId,
                            title: `New Message from ${currentUserName} (#${reqCode}) 💬`,
                            message: text,
                            body: text,
                            type: "chat_message",
                            read: false,
                            isRead: false,
                            createdAt: new Date().toISOString(),
                            payload: { jobId, requestCode: reqCode },
                        });
                    }
                }
            } catch (_) {}
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    };

    if (!isOpen) return null;

    const discoveredClientName = messages.find(
        (m) =>
            m.senderId !== currentUserId &&
            m.senderName &&
            !["User", "Client", "Unknown Client", "You"].includes(m.senderName.trim())
    )?.senderName;

    const cleanRecipientName =
        recipientName && !["Unknown Client", "Client"].includes(recipientName.trim())
            ? recipientName
            : discoveredClientName || `Client (#${formatRequestCode(jobId)})`;

    return (
        <div className="fixed inset-0 z-[60] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-0 bg-black/30 pointer-events-auto transition-opacity"
                onClick={onClose}
            ></div>

            {/* Sheet */}
            <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{cleanRecipientName}</h3>
                            <p className="text-xs text-green-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span>Active Chat • #{formatRequestCode(jobId)}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const snap = await getDoc(doc(db, "job_requests", jobId));
                                    const jd: any = snap.data() || {};
                                    const otherId =
                                        (jd.clientId || jd.userId) === currentUserId
                                            ? jd.providerId || jd.hodId
                                            : jd.clientId || jd.userId;
                                    if (!otherId) {
                                        alert("Could not find the other party for this job.");
                                        return;
                                    }
                                    requestOnlineCall({
                                        calleeId: otherId,
                                        calleeName: cleanRecipientName,
                                        jobId,
                                        requestCode: formatRequestCode({ id: jobId, ...jd }),
                                    });
                                } catch {
                                    alert("Could not start the call. Please try again.");
                                }
                            }}
                            title="Online Voice Call"
                            className="p-2 rounded-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
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
                            className={`p-2 rounded-full transition-colors cursor-pointer ${
                                soundMuted
                                    ? "text-gray-400 hover:bg-gray-100"
                                    : "text-orange-600 bg-orange-50 hover:bg-orange-100"
                            }`}
                        >
                            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading chat...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-4">
                            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">No messages yet.</p>
                            <p className="text-xs">Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUserId;
                            const senderLabel =
                                !isMe && msg.senderName && !["User", "You"].includes(msg.senderName)
                                    ? msg.senderName
                                    : cleanRecipientName;

                            const msgSec = msg.createdAt?.seconds || 0;
                            const clientReadSec = jobMeta.clientLastReadAt?.seconds || 0;
                            const clientDeliveredSec = jobMeta.clientLastDeliveredAt?.seconds || 0;
                            const hasSubsequentReplyFromOther = messages
                                .slice(idx + 1)
                                .some((m) => m.senderId !== currentUserId);

                            const isRead =
                                msg.read === true ||
                                msg.status === "read" ||
                                hasSubsequentReplyFromOther ||
                                (msgSec > 0 && clientReadSec > 0 && msgSec <= clientReadSec + 5) ||
                                (jobMeta.lastMessageSenderId === currentUserId && jobMeta.lastMessageStatus === "read");

                            const isDelivered =
                                isRead ||
                                msg.delivered === true ||
                                msg.status === "delivered" ||
                                (msgSec > 0 && clientDeliveredSec > 0 && msgSec <= clientDeliveredSec + 5) ||
                                (jobMeta.lastMessageSenderId === currentUserId && jobMeta.lastMessageStatus === "delivered");

                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                            ? 'bg-orange-600 text-white rounded-br-none shadow-sm'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        {!isMe && (
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1">
                                                {senderLabel}
                                            </p>
                                        )}
                                        <p>{msg.text}</p>
                                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-orange-100' : 'text-gray-400'}`}>
                                            <span className="text-[10px]">
                                                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
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
                <div className="relative z-10 p-3 bg-[#f0f2f5] border-t border-gray-200">
                    {showEmojiPicker && (
                        <WhatsAppEmojiPicker
                            onSelectEmoji={(emoji) => {
                                setNewMessage((prev) => `${prev}${emoji}`);
                                inputRef.current?.focus();
                            }}
                            onBackspace={() => {
                                setNewMessage((prev) => Array.from(prev).slice(0, -1).join(""));
                                inputRef.current?.focus();
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    )}
                    <form onSubmit={sendMessage} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-400 transition-all">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker((prev) => !prev)}
                                title="Emojis & Service Icons"
                                className={`p-2 rounded-full transition-colors cursor-pointer ${
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
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message"
                                autoFocus
                                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 px-2 py-2 focus:outline-none text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="w-11 h-11 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
