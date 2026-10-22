"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Mail, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, LogOut, KeyRound } from "lucide-react";
import { isEmailVerifiedGlobally, resolveUserDestination } from "@/lib/auth-helpers";

export default function VerifyEmailPage() {
    const router = useRouter();
    const isNavigatingRef = useRef(false);
    const [isVerifyingCode, setIsVerifyingCode] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [otpInput, setOtpInput] = useState("");
    const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; message: string } | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Route user to appropriate destination after successful verification
    const navigateAfterVerification = useCallback(async (uid: string) => {
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;

        setIsVerified(true);
        setFeedback({
            type: 'success',
            message: "Success! Your email address has been verified."
        });

        try {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.exists() ? snap.data() : {};
            const mergedData = { ...data, emailVerified: true };
            const targetRoute = resolveUserDestination(auth.currentUser, mergedData);

            setTimeout(() => {
                router.replace(targetRoute);
            }, 800);
        } catch (err) {
            console.error("Error finalizing email verification destination:", err);
            setTimeout(() => {
                router.replace("/role-selection");
            }, 800);
        }
    }, [router]);

    // Track cooldown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // Check query params for one-click verification link (?code=123456&uid=...)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get('code');
        const uidParam = params.get('uid');

        if (codeParam && uidParam) {
            (async () => {
                setIsVerifyingCode(true);
                try {
                    const snap = await getDoc(doc(db, "users", uidParam));
                    if (snap.exists()) {
                        const data = snap.data();
                        const storedOtp = data.verificationOtp;

                        if (storedOtp && String(storedOtp.code).trim() === codeParam.trim()) {
                            if (storedOtp.expiresAt && Date.now() > storedOtp.expiresAt) {
                                setFeedback({
                                    type: 'error',
                                    message: "This verification link has expired. Please request a new code below."
                                });
                                setIsVerifyingCode(false);
                                return;
                            }
                            await navigateAfterVerification(uidParam);
                            return;
                        }
                    }
                    setFeedback({
                        type: 'error',
                        message: "Invalid or already used verification link."
                    });
                } catch (err: any) {
                    console.error("Link verification error:", err);
                    setFeedback({
                        type: 'error',
                        message: "Could not verify link. Please try entering the 6-digit code manually."
                    });
                } finally {
                    setIsVerifyingCode(false);
                }
            })();
        }
    }, [navigateAfterVerification]);

    // Initial auth state check
    useEffect(() => {
        let isMounted = true;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push("/signin");
                return;
            }
            if (isMounted) {
                setUserEmail(user.email || "");
                if (user.displayName) {
                    setUserName(user.displayName);
                }
            }
            // Check user document for name and verification status
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.fullName && isMounted) {
                        setUserName(data.fullName);
                    }
                    if (isEmailVerifiedGlobally(user, data)) {
                        await navigateAfterVerification(user.uid);
                    }
                }
            } catch (e) {
                console.error("Error reading initial user verification status:", e);
            }
        });
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [router, navigateAfterVerification]);

    // Verify 6-digit OTP code entered by user
    const handleVerifyOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = otpInput.replace(/\s+/g, '');
        if (code.length !== 6) {
            setFeedback({
                type: 'warning',
                message: "Please enter the complete 6-digit verification code."
            });
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            router.push("/signin");
            return;
        }

        setIsVerifyingCode(true);
        setFeedback(null);

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ code }),
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                setFeedback({
                    type: 'error',
                    message: resData.error || "Incorrect verification code. Please check your email and try again."
                });
                setIsVerifyingCode(false);
                return;
            }

            // Valid code - complete verification
            await navigateAfterVerification(user.uid);
        } catch (error: any) {
            console.error("Error verifying OTP:", error);
            setFeedback({
                type: 'error',
                message: error.message || "Failed to verify code. Please try again."
            });
            setIsVerifyingCode(false);
        }
    };

    // Resend verification email and generate new OTP
    const resendVerificationEmail = async () => {
        if (cooldown > 0 || isResending) return;
        const user = auth.currentUser;
        if (!user || !user.email) {
            router.push("/signin");
            return;
        }

        setIsResending(true);
        setFeedback(null);

        try {

            // 3. Resolve user's real name (state -> auth -> firestore -> email prefix)
            let recipientName = (userName || user.displayName || '').trim();
            if (!recipientName) {
                try {
                    const snap = await getDoc(doc(db, "users", user.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        recipientName = (data.fullName || data.name || '').trim();
                        if (recipientName) setUserName(recipientName);
                    }
                } catch (e) {
                    console.warn("Could not fetch user name for resend email:", e);
                }
            }

            // 4. Dispatch email via Brevo / Gmail SMTP
            const idToken = await user.getIdToken();
            const response = await fetch('/api/auth/send-verification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({})
            });

            const resData = await response.json();

            // 4. Background Firebase native email fallback
            sendEmailVerification(user).catch(e => console.warn("Firebase default link error:", e));

            if (resData.success) {
                setFeedback({
                    type: 'info',
                    message: `A new 6-digit code and direct activation link have been sent to ${user.email}. Please check your inbox!`
                });
            } else {
                setFeedback({
                    type: 'info',
                    message: `Verification code generated! Please check your inbox at ${user.email}.`
                });
            }

            setCooldown(60); // 60-second cooldown
        } catch (e: any) {
            console.error("Resend Error:", e);
            setFeedback({
                type: 'error',
                message: e.message || "Could not resend email. Please try again later."
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.push("/signin");
        } catch (e) {
            console.error("Sign out error:", e);
            router.push("/signin");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center p-8 sm:p-10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all ${
                    isVerified ? "bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100" : "bg-blue-50 text-blue-600 shadow-md shadow-blue-50"
                }`}>
                    {isVerified ? <CheckCircle2 className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                    {isVerified ? "Email Verified" : "Verify your Email"}
                </h1>

                {!isVerified && (
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-semibold text-slate-800 break-all">{userEmail || "your email"}</span> to activate your account.
                    </p>
                )}

                {feedback && (
                    <div className={`mb-6 p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 text-left border ${
                        feedback.type === 'success'
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : feedback.type === 'warning'
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : feedback.type === 'error'
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}>
                        {feedback.type === 'error' || feedback.type === 'warning' ? (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{feedback.message}</span>
                    </div>
                )}

                {!isVerified ? (
                    <div className="space-y-5">
                        {/* 6-Digit OTP Form */}
                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                            <div className="text-left">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Enter 6-Digit Code
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="000000"
                                        autoComplete="one-time-code"
                                        className="w-full text-center tracking-[10px] text-2xl font-mono font-bold py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900 placeholder:text-slate-300 placeholder:tracking-[10px]"
                                    />
                                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isVerifyingCode || otpInput.length !== 6}
                                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                {isVerifyingCode ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Verifying Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Verify Code</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Resend & Sign out actions */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={resendVerificationEmail}
                                disabled={cooldown > 0 || isResending}
                                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? "Sending code..." : "Resend Code"}
                            </button>

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-1 transition-colors"
                            >
                                <LogOut className="w-3 h-3" />
                                <span>Wrong email? Sign out</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm animate-pulse">Redirecting to next step...</p>
                )}
            </div>
        </div>
    );
}
