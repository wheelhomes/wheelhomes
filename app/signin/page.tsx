"use client";

import Link from "next/link";
import { User, Lock, AlertCircle, ArrowRight, Eye, EyeOff, AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function SignInPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<{ type: "error" | "warning" | "info" | "rejected", message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            let emailToUse = identifier;

            // 1. Check if input is likely a Custom ID (no '@')
            if (!identifier.includes("@")) {
                // Must be a Login ID -> Resolve to Email
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("customId", "==", identifier));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw { code: "custom/user-not-found" };
                }

                // Found the user doc, get the email
                const userDoc = querySnapshot.docs[0].data();
                emailToUse = userDoc.email;
            }

            // 2. Firebase Auth Login (using resolved email)
            const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
            const user = credential.user;

            // 2. Fetch User Status from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
                // Edge case: Auth exists but Firestore doesn't (legacy or corrupt)
                // Try legacy check or fail safe
                throw new Error("User profile not found. Please contact support.");
            }

            const userData = userDoc.data();
            const status = userData.status;
            const role = userData.role;

            // 3. Status Based Routing
            if (status === 'rejected') {
                // Show Rejection Reason & Auto Logout
                const reason = userData.rejectionReason || "No reason provided.";
                setError({
                    type: "rejected",
                    message: reason
                });
                await signOut(auth); // Force logout so they can't access authorized routes
                setIsLoading(false);
                return;
            }

            if (status === 'pending_review') {
                router.push("/dashboard/pending");
                return;
            }

            if (status === 'unverified') {
                router.push("/verify-email");
                return;
            }

            if (status === 'verified') {
                // User verified email but hasn't completed registration
                // Redirect to Provider Registration (or role selection if we had it)
                router.push("/register/provider");
                return;
            }

            if (status === 'approved' || !status /* legacy users might not have status */) {
                // Store simulated session data for legacy components if needed, or rely on Auth Context
                localStorage.setItem("tempUserId", user.uid); // Keeping this for the Provider Dashboard compatibility
                localStorage.setItem("userName", userData.fullName);

                // Role Routing
                if (role === 'service_provider') router.push("/dashboard/provider");
                else if (role === 'agent') router.push("/dashboard/agent");
                else if (role === 'admin') router.push("/admin/dashboard");
                else router.push("/dashboard/user"); // Normal user default
            }

        } catch (err: any) {
            console.error("Login error:", err);
            let msg = "Authentication failed.";
            if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
            if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
            if (err.code === 'auth/wrong-password') msg = "Incorrect password.";

            setError({
                type: "error",
                message: msg
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Sign in to access your dashboard
                    </p>
                </div>

                {error && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 ${error.type === "error" ? "bg-red-50 text-red-700 border border-red-100" :
                        error.type === "rejected" ? "bg-red-50 text-red-800 border-2 border-red-100" :
                            "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                        {error.type === 'rejected' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                        <div>
                            {error.type === 'rejected' && <p className="font-bold text-xs uppercase mb-1">Application Rejected</p>}
                            <p className="font-medium text-sm leading-relaxed">{error.message}</p>

                            {error.type === 'rejected' && (
                                <button onClick={() => window.location.reload()} className="mt-3 text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm hover:bg-red-50 flex items-center gap-2">
                                    <RefreshCcw className="w-3 h-3" /> Try Again
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                                    placeholder="Enter Email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-500 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="appearance-none block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            {!isLoading && <ArrowRight className="h-5 w-5 text-orange-200 group-hover:text-white transition-colors" />}
                        </span>
                        {isLoading ? "Signing in..." : "Sign in"}
                    </button>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{" "}
                            <Link href="/signup" className="font-bold text-primary hover:text-orange-600 transition-colors">
                                Create new account
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
