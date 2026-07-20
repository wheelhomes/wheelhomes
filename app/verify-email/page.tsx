"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { sendEmailVerification, reload } from "firebase/auth";
import { Mail, CheckCircle, ArrowRight, RefreshCw, ExternalLink } from "lucide-react";

export default function VerifyEmailPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push("/signin");
            } else {
                setUserEmail(user.email || "");
                if (user.emailVerified) handleVerificationSuccess(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    const checkVerification = async () => {
        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Force refresh of the token/user object to get latest emailVerified status
            await user.reload();

            if (user.emailVerified) {
                await handleVerificationSuccess(user.uid);
            } else {
                setMessage("Email not verified yet. Please check your inbox (and spam).");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error checking verification:", error);
            setMessage("Error checking status. Please try again.");
            setIsLoading(false);
        }
    };

    const handleVerificationSuccess = async (uid: string) => {
        setIsVerified(true);
        setMessage("Success! Email Verified.");

        // Update Firestore status
        await updateDoc(doc(db, "users", uid), { status: "verified" });

        // Proceed to next step
        setTimeout(() => {
            router.push("/role-selection");
        }, 1500);
    };

    const resendEmail = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                await sendEmailVerification(user);
                alert("Verification link resent! Check your inbox.");
            } catch (e: any) {
                console.error("Resend Error:", e);
                alert(`Error: ${e.message} (Code: ${e.code})`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isVerified ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                    {isVerified ? <CheckCircle className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {isVerified ? "Email Verified" : "Verify your Email"}
                </h1>

                {!isVerified && (
                    <p className="text-gray-500 mb-8">
                        We sent a secure link to <span className="font-bold text-gray-900">{userEmail}</span>.<br />
                        Click the link in the email to activate your account.
                    </p>
                )}

                {message && (
                    <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${isVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                        {message}
                    </div>
                )}

                {!isVerified && (
                    <div className="space-y-4">
                        <button
                            onClick={checkVerification}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? "Checking Status..." : "I've Clicked the Link"} <ArrowRight className="w-5 h-5" />
                        </button>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <button className="text-gray-500 text-sm hover:text-gray-900 flex items-center gap-1 mx-auto mb-2" onClick={resendEmail}>
                                <RefreshCw className="w-3 h-3" /> Resend Link
                            </button>

                            <button
                                onClick={() => handleVerificationSuccess(auth.currentUser?.uid || "")}
                                className="text-xs text-orange-400 hover:text-orange-600 font-medium underline mt-4"
                            >
                                [Developer Bypass]: Skip Email Verification
                            </button>
                            <p className="text-xs text-gray-400 mt-1">Use this if emails are delayed (Google Free Tier Latency)</p>
                        </div>
                    </div>
                )}

                {isVerified && (
                    <p className="text-gray-500 animate-pulse">Redirecting you to registration...</p>
                )}
            </div>
        </div>
    );
}
