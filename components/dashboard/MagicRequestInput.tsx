"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader } from "lucide-react";

interface MagicRequestInputProps {
    onAnalyze: (text: string) => Promise<void>;
    isLoading: boolean;
}

export default function MagicRequestInput({ onAnalyze, isLoading }: MagicRequestInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        await onAnalyze(input);
    };

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white relative overflow-hidden shadow-lg">
            {/* Contextual Background Decorations */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <h2 className="text-lg font-bold">Magic Request</h2>
                </div>

                <p className="text-indigo-100 text-sm mb-4">
                    Describe your problem (e.g., "My kitchen sink is leaking") and AI will handle the rest.
                </p>

                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your request here..."
                        className="w-full pl-6 pr-14 py-4 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-bold"
                    >
                        {isLoading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowRight className="w-5 h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
