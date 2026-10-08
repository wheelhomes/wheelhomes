"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Lock, User, ArrowRight, X, Eye, EyeOff, Check, Shield } from "lucide-react";


export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const getPasswordStrength = (pass: string) => {
        const criteria = {
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[^A-Za-z0-9]/.test(pass),
        };

        let score = 0;
        if (criteria.length) score++;
        if (criteria.upper) score++;
        if (criteria.number) score++;
        if (criteria.special) score++;

        let label = "Too weak";
        let colorClass = "bg-red-500";
        let textClass = "text-red-500";
        if (score === 2) {
            label = "Fair";
            colorClass = "bg-orange-500";
            textClass = "text-orange-500";
        } else if (score === 3) {
            label = "Good";
            colorClass = "bg-amber-500";
            textClass = "text-amber-500";
        } else if (score === 4) {
            label = "Strong";
            colorClass = "bg-emerald-500";
            textClass = "text-emerald-600";
        }

        return { score, percent: (score / 4) * 100, label, colorClass, textClass, criteria };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long");
            setIsLoading(false);
            return;
        }

        if (!/[A-Z]/.test(formData.password)) {
            setError("Password must contain at least one uppercase letter (A-Z)");
            setIsLoading(false);
            return;
        }

        if (!/[0-9]/.test(formData.password)) {
            setError("Password must contain at least one number (0-9)");
            setIsLoading(false);
            return;
        }

        if (!/[^A-Za-z0-9]/.test(formData.password)) {
            setError("Password must contain at least one special character (e.g. @, $, !, %, *, ?)");
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Send Real Verification Link
            await sendEmailVerification(user);

            // 3. Create User Doc (Step 1 Data)
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: formData.email,
                fullName: formData.fullName,
                phone: formData.phone,
                status: "unverified", // Step 2 Requirement
                role: "pending_role_selection", // Determined later or strictly 'service_provider' if this is provider-only flow
                createdAt: new Date().toISOString()
            });

            // 3. Send/Simulate OTP (Step 2 Trigger)
            // In a real app we'd trigger a cloud function here (not on free tier).


            // For MVP, we redirect to Verify Page which simulates receiving it.

            router.push("/verify-email");


        } catch (err: any) {
            console.error("Signup Error:", err);
            // Friendly error messages
            if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered. Please sign in.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message || "Failed to create account.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 text-center bg-gray-900 text-white">
                    <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
                    <p className="text-gray-400 text-sm mt-2">Join Wheel of Comfort today.</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 flex items-center gap-2">
                            <X className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="fullName"
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="phone"
                                    type="tel"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="+234..."
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm"
                                    placeholder="Create password (e.g. 1@Asdmddmdn)"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password Strength Progress Bar & Format Guide */}
                            {formData.password && (
                                <div className="mt-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Password Strength:</span>
                                        <span className={`font-bold ${passwordStrength.textClass}`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-1.5 w-full bg-gray-200/80 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 rounded-full ${passwordStrength.colorClass}`}
                                            style={{ width: `${passwordStrength.percent}%` }}
                                        />
                                    </div>

                                    {/* Format Checklist */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                                        <div className={`flex items-center gap-1.5 ${passwordStrength.criteria.length ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordStrength.criteria.length ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                                {passwordStrength.criteria.length ? "✓" : "•"}
                                            </span>
                                            <span>Min 8 characters</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordStrength.criteria.upper ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordStrength.criteria.upper ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                                {passwordStrength.criteria.upper ? "✓" : "•"}
                                            </span>
                                            <span>1 uppercase (A-Z)</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordStrength.criteria.number ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordStrength.criteria.number ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                                {passwordStrength.criteria.number ? "✓" : "•"}
                                            </span>
                                            <span>1 number (0-9)</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${passwordStrength.criteria.special ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordStrength.criteria.special ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                                                {passwordStrength.criteria.special ? "✓" : "•"}
                                            </span>
                                            <span>1 symbol (@, $, !)</span>
                                        </div>
                                    </div>
                                    <div className="pt-1 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100">
                                        <span>Format example:</span>
                                        <span className="font-mono font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px]">
                                            1@Asdmddmdn
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm ${
                                        formData.confirmPassword && formData.password !== formData.confirmPassword
                                            ? "border-red-400 bg-red-50/30"
                                            : "border-gray-200"
                                    }`}
                                    placeholder="Re-enter password to confirm"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Already have an account? <Link href="/signin" className="text-orange-600 font-bold hover:underline">Log In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
