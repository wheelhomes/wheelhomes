"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { UserProfile } from "../../types/user";

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    user: UserProfile;
    isProcessing: boolean;
}

export default function DeleteUserModal({ isOpen, onClose, onConfirm, user, isProcessing }: DeleteUserModalProps) {
    const [confirmationText, setConfirmationText] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const requiredText = "delete " + user.fullName.toLowerCase().split(' ')[0]; // e.g. "delete john" (simple first name check or full name?)
    // Let's make it simpler but safe: "DELETE" or just the full name? 
    // Plan said: "delete <username>" or just "<username>".
    // Let's do exact match of full name for maximum safety as requested.
    const strictRequiredText = user.fullName;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (confirmationText !== strictRequiredText) {
            setError("Confirmation text does not match exactly.");
            return;
        }

        await onConfirm();
        setConfirmationText(""); // Reset on success (if parent doesn't unmount immediately)
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="p-2 bg-red-100 rounded-lg shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Delete User Account</h2>
                            <p className="text-sm text-red-700 mt-1 font-medium">This action cannot be undone.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isProcessing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-sm text-gray-600 leading-relaxed">
                        You are about to permanently delete <strong>{user.fullName}</strong>.
                        Their profile data will be removed immediately.
                        <br /><br />
                        To confirm, please type <strong>{strictRequiredText}</strong> below:
                    </div>

                    <div className="space-y-2">
                        <input
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder={strictRequiredText}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono text-sm"
                            onPaste={(e) => e.preventDefault()} // Force typing? Maybe too annoying. Let's allow paste.
                            autoFocus
                        />
                        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                            <X className="w-3 h-3" /> {error}
                        </p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || confirmationText !== strictRequiredText}
                            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? "Deleting..." : "Delete User"} <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
