import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Loader2, MessageSquare } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
    role?: string; // 'user' | 'provider' | 'admin'
}

interface ChatInterfaceProps {
    requestId: string;
    currentUserId?: string;
    currrentUserName?: string;
    currentUserRole?: 'user' | 'provider' | 'admin';
    providerName?: string;
    readOnly?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    requestId,
    currentUserId,
    currrentUserName = "User",
    currentUserRole = 'user',
    providerName,
    readOnly = false
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch Messages
    useEffect(() => {
        if (!requestId) return;
        setIsLoading(true);

        const q = query(
            collection(db, "job_requests", requestId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(fetchedMessages);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [requestId]);

    const handleSend = async () => {
        if (!input.trim() || readOnly || !currentUserId) return;

        try {
            await addDoc(collection(db, "job_requests", requestId, "messages"), {
                text: input,
                senderId: currentUserId,
                senderName: currrentUserName,
                role: currentUserRole,
                createdAt: serverTimestamp()
            });
            setInput('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-[#EFEAE2] rounded-xl overflow-hidden border border-gray-200">
            {/* Header (Optional, if providerName provided) */}
            {providerName && (
                <div className="bg-[#005C4B] text-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                            <span className="text-sm">{providerName.charAt(0)}</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">{providerName}</h3>
                            {/* Online status could go here */}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-10">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chat...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                        <MessageSquare className="w-12 h-12 mb-2" />
                        <p className="text-sm">No messages yet</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // Determine alignment:
                        // If it's MY message (matched by ID), align right.
                        // OR if I am the User and the message role is 'user', align right (legacy check).
                        const isMe = msg.senderId === currentUserId;

                        // Styling based on role/sender
                        const isSystem = msg.id === 'system'; // Future proof

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm relative text-sm ${isMe
                                            ? 'bg-[#E7FFDB] rounded-tr-none text-gray-900'
                                            : 'bg-white rounded-tl-none text-gray-900'
                                        }`}
                                >
                                    {/* Sender Name for Group Context (like Admin viewing) */}
                                    {!isMe && (
                                        <p className="text-[10px] font-bold text-orange-600 mb-0.5">
                                            {msg.senderName || "Provider"}
                                        </p>
                                    )}

                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[10px] text-gray-500">
                                            {msg.createdAt?.seconds
                                                ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : 'Sending...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!readOnly ? (
                <div className="bg-[#F0F2F5] px-4 py-3 flex items-center gap-3">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                        <Smile className="w-6 h-6" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 bg-white rounded-lg px-4 py-2 shadow-sm">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message"
                            className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder-gray-500 p-0 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        className={`${input.trim() ? 'bg-[#005C4B] text-white' : 'text-gray-400 bg-transparent'} p-2 rounded-full transition-all duration-200`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Read Only Mode
                    </p>
                </div>
            )}
        </div>
    );
};
