"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // In a real app, we'd check the session/token here.
        // For this demo, we assume they just logged in and we check localStorage.
        const storedRole = localStorage.getItem("userRole");
        // We need the document ID to update it. 
        // We should have stored it in localStorage during login for this exact step.
        const storedId = localStorage.getItem("tempUserId");

        if (!storedId) {
            router.push("/signin");
        } else {
            setUserId(storedId);
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);

        try {
            if (!userId) throw new Error("No user session found.");

            // Update password in Firestore and remove 'isFirstLogin' flag (or implicitly just update tempPassword)
            // But wait, 'tempPassword' was our only password field.
            // We should update 'tempPassword' to the new one? (Insecure but consistent with current demo)
            // OR better: set 'password' field and nullify 'tempPassword'.
            // Let's set 'tempPassword' to the new one for now so the login logic still works 
            // (since login checks 'tempPassword').
            // Ideally login should check `password` OR `tempPassword`.

            // To keep it simple with existing login logic: Update `tempPassword` to new value.
            // And set a flag `isPasswordChanged: true`.

            const userRef = doc(db, "user_applications", userId);
            await updateDoc(userRef, {
                tempPassword: newPassword, // Updating the field used for login
                isFirstLogin: false
            });

            alert("Password changed successfully!");

            // Redirect to dashboard
            const role = localStorage.getItem("userRole");
            if (role === "service_provider") router.push("/dashboard/provider");
            else if (role === "agent") router.push("/dashboard/agent");
            else if (role === "buyer") router.push("/dashboard/buyer");
            else if (role === "user") router.push("/dashboard/user");
            else router.push("/");

        } catch (error: any) {
            console.error("Error updating password:", error);
            alert("Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
                    <p className="text-gray-500 mt-2">
                        For security reasons, please change your temporary system-generated password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? "text" : "password"}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <input
                            required
                            type={showPassword ? "text" : "password"}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-70"
                    >
                        {isLoading ? "Updating..." : "Update Password & Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
