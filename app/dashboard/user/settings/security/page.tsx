"use client";

import { useState, useEffect } from "react";
import { Lock, Mail, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function SecuritySettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSendResetEmail = async () => {
        if (!user?.email) return;
        setIsSending(true);
        setErrorMessage(null);
        setIsSent(false);

        try {
            await sendPasswordResetEmail(auth, user.email);
            setIsSent(true);
            setTimeout(() => setIsSent(false), 6000);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setErrorMessage(err.message || "Failed to send reset link. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-12 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900 mb-2" />
                <p className="text-sm">Loading security settings...</p>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-700" />
                    Security & Credentials
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Manage password recovery, credentials, and authentication security for your Wheel of Comfort account.
                </p>
            </div>

            {isSent && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>A password reset link has been dispatched to <strong>{user?.email}</strong>. Check your inbox.</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">Account Password</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Linked authentication address: <strong className="text-gray-700">{user?.email}</strong>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={isSending}
                    className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                    {isSending ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Email...</span>
                        </>
                    ) : (
                        <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send Password Reset Email</span>
                        </>
                    )}
                </button>
            </div>

            <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Session & Data Protection
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                    Wheel of Comfort uses secure HTTPS encryption and Firebase Authentication. Always verify service personnel through official in-app status confirmations before opening your doors or making service payments.
                </p>
            </div>
        </div>
    );
}
