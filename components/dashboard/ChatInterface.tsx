"use client";

import { useState } from "react";
import { Send, Paperclip, User } from "lucide-react";

interface Message {
    id: string;
    sender: "user" | "admin";
    text: string;
    timestamp: string;
}

interface ChatInterfaceProps {
    initialMessages?: Message[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialMessages = [] }) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputText, setInputText] = useState("");

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: inputText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages([...messages, newMessage]);
        setInputText("");

        // Simulate admin reply for demo
        setTimeout(() => {
            const adminReply: Message = {
                id: (Date.now() + 1).toString(),
                sender: "admin",
                text: "Thank you for the update. We have noted this.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
            setMessages(prev => [...prev, adminReply]);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-[500px] border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <User className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Admin Support</h3>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        No messages yet. Start a conversation with the admin.
                    </div>
                )}
                {messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${isUser
                                        ? "bg-orange-500 text-white rounded-br-none"
                                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                                    }`}
                            >
                                <p>{msg.text}</p>
                                <span className={`text-[10px] block mt-1 text-right opacity-80 ${isUser ? "text-orange-100" : "text-gray-500"}`}>
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
                <div className="relative flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        className="flex-1 bg-gray-50 text-gray-900 placeholder-gray-400 border-0 rounded-full py-2.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all text-sm"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="p-2.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
