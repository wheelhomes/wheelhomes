"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Ban, ShieldCheck, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";
import { UserProfile } from "../../types/user";

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
    isProcessing: boolean;
    onSuspend: (user: UserProfile, reason: string) => Promise<void>;
    onReactivate: (user: UserProfile) => Promise<void>;
    onPermanentDelete: (user: UserProfile) => Promise<void>;
}

export default function DeleteUserModal({
    isOpen,
    onClose,
    user,
    isProcessing,
    onSuspend,
    onReactivate,
    onPermanentDelete
}: DeleteUserModalProps) {
    const isAlreadySuspended = user.status === 'suspended';
    const [activeTab, setActiveTab] = useState<'suspend' | 'delete'>('suspend');
    const [suspendReason, setSuspendReason] = useState("");
    const [confirmationText, setConfirmationText] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const strictRequiredText = user.fullName;

    const handleSuspendSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        await onSuspend(user, suspendReason || "Account suspended by platform administrator.");
    };

    const handleReactivateSubmit = async () => {
        setError("");
        await onReactivate(user);
    };

    const handleDeleteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (confirmationText !== strictRequiredText) {
            setError("Confirmation text does not match exactly.");
            return;
        }

        await onPermanentDelete(user);
        setConfirmationText("");
    };

    const presetReasons = [
        "Terms of Service violation",
        "Disputed or fraudulent activity",
        "Multiple customer complaints",
        "Unresponsive to clients / missed jobs",
        "Requested by account holder"
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gray-900 text-white p-6 flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                        <div className="p-2.5 bg-white/10 rounded-xl shrink-0">
                            <ShieldAlert className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">User Moderation</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Account: <span className="font-semibold text-white">{user.fullName}</span> ({user.email})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        disabled={isProcessing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Tabs (Tier 1 is Default) */}
                <div className="flex border-b border-gray-100 bg-gray-50 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('suspend')}
                        className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-2 border-b-2 ${
                            activeTab === 'suspend'
                                ? 'border-amber-500 text-amber-900 bg-white shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {isAlreadySuspended ? <RotateCcw className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-amber-600" />}
                        {isAlreadySuspended ? 'Tier 1: Reactivate Account' : 'Tier 1: Suspend Account'}
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Default Safe</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('delete')}
                        className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-2 border-b-2 ${
                            activeTab === 'delete'
                                ? 'border-red-600 text-red-900 bg-white shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        Tier 2: Permanent Delete
                        <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Secondary</span>
                    </button>
                </div>

                {/* TAB 1: TIER 1 (SUSPEND / REACTIVATE) */}
                {activeTab === 'suspend' && (
                    isAlreadySuspended ? (
                        /* Case: User is already suspended -> Offer Clean Reactivation */
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Ban className="w-5 h-5 text-amber-700 shrink-0" />
                                    <p className="font-bold text-sm text-amber-950">This account is currently SUSPENDED</p>
                                </div>
                                <p className="text-[11px] text-amber-800">
                                    <strong>Reason on file:</strong> {(user as any).suspensionReason || "Suspended by platform administrator."}
                                </p>
                                <p className="text-[11px] text-amber-800">
                                    Login access is currently revoked. Reactivating will restore their login access and re-publish any archived property listings.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReactivateSubmit}
                                    disabled={isProcessing}
                                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isProcessing ? "Reactivating..." : "Reactivate Account Now"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Case: User is active -> Offer Suspension */
                        <form onSubmit={handleSuspendSubmit} className="p-6 space-y-4">
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-xs text-amber-900 space-y-2">
                                <p className="font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Tier 1: Soft Delete & Suspension (Recommended)
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                                    <li>Instantly revokes login access across Web & Mobile via Firebase Authentication.</li>
                                    <li>Automatically hides active property listings from the marketplace.</li>
                                    <li><strong>Safely preserves historical order receipts and escrow audit logs</strong>.</li>
                                    <li>Can be reversed at any time with 1 click.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Suspension Reason
                                </label>
                                <textarea
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    placeholder="Explain why this account is being suspended..."
                                    rows={2}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                />

                                {/* Preset Reason Chips */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {presetReasons.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setSuspendReason(r)}
                                            className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-left"
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Ban className="w-4 h-4" />
                                    {isProcessing ? "Suspending..." : "Suspend Account"}
                                </button>
                            </div>
                        </form>
                    )
                )}

                {/* TAB 2: TIER 2 (SECONDARY PERMANENT HARD DELETE) */}
                {activeTab === 'delete' && (
                    <form onSubmit={handleDeleteSubmit} className="p-6 space-y-4">
                        <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-xs text-red-900 space-y-2">
                            <p className="font-bold flex items-center gap-1.5 text-red-700">
                                <AlertTriangle className="w-4 h-4 text-red-600" /> Irreversible Permanent Action
                            </p>
                            <p className="text-[11px] text-red-800 leading-relaxed">
                                This permanently erases the user from Firestore and <strong>Firebase Authentication</strong>, freeing their email address.
                            </p>
                            <p className="text-[11px] text-red-800 leading-relaxed">
                                Past completed jobs and transactions are preserved under <code>[Deleted User]</code> to maintain counterparty financial records.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700">
                                Type <strong>{strictRequiredText}</strong> to confirm permanent deletion:
                            </label>
                            <input
                                type="text"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder={strictRequiredText}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono text-xs"
                                autoFocus
                            />
                            {error && (
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                                    <X className="w-3 h-3" /> {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing || confirmationText !== strictRequiredText}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isProcessing ? "Erasing..." : "Permanently Erase"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
