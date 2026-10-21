"use client";

import { useState, useEffect, useRef } from "react";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    ShieldCheck,
    Lock,
    Bell,
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    ExternalLink,
    FileText,
    Camera,
    Shield,
    Clock,
    AlertTriangle,
    UploadCloud
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { compressImageToBase64 } from "@/lib/image-utils";
import Link from "next/link";

export default function ProviderSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Passport photo upload state
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoSuccess, setPhotoSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password reset state
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Profile state
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        serviceCategory: "",
        secondaryService: "",
        experience: "",
        coverageArea: "",
        city: "",
        state: "",
        bio: "",
        // Notification preferences
        notifJobDispatches: true,
        notifChatMessages: true,
        notifEmailSummaries: false,
    });

    const [activeTab, setActiveTab] = useState<"profile" | "verification" | "security" | "notifications">("profile");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                const unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const appData = data.applicationData || {};
                        setUser({ uid: currentUser.uid, ...data });

                        setFormData({
                            fullName: data.fullName || currentUser.displayName || "",
                            phone: data.phone || data.phoneNumber || "",
                            serviceCategory: data.serviceCategory || appData.serviceCategory || (data.services && data.services[0]) || "Plumbing",
                            secondaryService: (data.services && data.services.length > 1 ? data.services[1] : (appData.secondaryService || "")),
                            experience: data.experience || appData.experience || "",
                            coverageArea: data.coverageArea || appData.coverageArea || "",
                            city: data.city || data.address?.city || "",
                            state: data.state || data.address?.state || "Lagos",
                            bio: data.bio || data.description || appData.bio || "",
                            notifJobDispatches: data.notificationPreferences?.jobDispatches ?? true,
                            notifChatMessages: data.notificationPreferences?.chatMessages ?? true,
                            notifEmailSummaries: data.notificationPreferences?.emailSummaries ?? false,
                        });
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.warn("Settings user fetch error:", err);
                    setIsLoading(false);
                });

                return () => unsubDoc();
            } else {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;

        setIsSaving(true);
        setErrorMessage(null);
        setSaveSuccess(false);

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                fullName: formData.fullName,
                phone: formData.phone,
                serviceCategory: formData.serviceCategory,
                services: [formData.serviceCategory, ...(formData.secondaryService ? [formData.secondaryService] : [])],
                experience: formData.experience,
                coverageArea: formData.coverageArea,
                city: formData.city,
                state: formData.state,
                bio: formData.bio,
                // Mirror to applicationData for backwards compatibility across older web/mobile views
                "applicationData.serviceCategory": formData.serviceCategory,
                "applicationData.secondaryService": formData.secondaryService,
                "applicationData.experience": formData.experience,
                "applicationData.coverageArea": formData.coverageArea,
                "applicationData.bio": formData.bio,
                notificationPreferences: {
                    jobDispatches: formData.notifJobDispatches,
                    chatMessages: formData.notifChatMessages,
                    emailSummaries: formData.notifEmailSummaries,
                },
                updatedAt: new Date().toISOString(),
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err: any) {
            console.error("Failed to update profile settings:", err);
            setErrorMessage(err.message || "Failed to update profile settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendPasswordReset = async () => {
        if (!user?.email) return;
        setIsSendingReset(true);
        setResetSent(false);
        setErrorMessage(null);

        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetSent(true);
            setTimeout(() => setResetSent(false), 6000);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setErrorMessage("Failed to send password reset email: " + (err.message || "Please check your email."));
        } finally {
            setIsSendingReset(false);
        }
    };

    const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !user?.uid) return;
        const file = e.target.files[0];
        setIsUploadingPhoto(true);
        setErrorMessage(null);
        setPhotoSuccess(false);

        try {
            const compressedBase64 = await compressImageToBase64(file);
            const userRef = doc(db, "users", user.uid);
            const now = new Date().toISOString();

            await updateDoc(userRef, {
                passportUrl: compressedBase64,
                photoURL: compressedBase64,
                "applicationData.passportUrl": compressedBase64,
                updatedAt: now,
            });

            try {
                await setDoc(doc(db, "users", user.uid, "documents", "passport"), {
                    data: compressedBase64,
                    type: "passport",
                    uploadedAt: now,
                    mimeType: "image/jpeg",
                }, { merge: true });
            } catch (_) {}

            setUser((prev: any) => ({
                ...prev,
                passportUrl: compressedBase64,
                photoURL: compressedBase64,
                applicationData: {
                    ...(prev?.applicationData || {}),
                    passportUrl: compressedBase64,
                }
            }));

            setPhotoSuccess(true);
            setTimeout(() => setPhotoSuccess(false), 5000);
        } catch (err: any) {
            console.error("Failed to upload passport photo:", err);
            setErrorMessage("Failed to upload passport photograph: " + (err.message || "Please select a valid image."));
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
                    <span>Loading Account Settings...</span>
                </div>
            </div>
        );
    }

    const appData = user?.applicationData || {};
    const isVerified = user?.status === "approved";
    const isPending = user?.status === "pending_review" || user?.status === "pending";
    const isRejected = user?.status === "rejected";
    const idType = user?.idType || appData.idType || "Government Issued ID";

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12">
            {/* Page Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    {/* Interactive Avatar with Camera Upload */}
                    <div className="relative group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-md overflow-hidden flex-shrink-0 relative">
                            {user?.photoURL || user?.passportUrl || appData.passportUrl ? (
                                <img
                                    src={user.photoURL || user.passportUrl || appData.passportUrl}
                                    alt="Passport Photograph"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                (formData.fullName || "SP").slice(0, 2).toUpperCase()
                            )}
                            {isUploadingPhoto && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            title="Change Passport Photograph"
                            className="absolute -bottom-1 -right-1 p-1.5 bg-gray-900 hover:bg-black text-white rounded-xl shadow-md border-2 border-white transition-all transform hover:scale-110 cursor-pointer disabled:opacity-50"
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePassportUpload}
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {formData.fullName || "Service Partner"}
                            </h1>
                            {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Verified Provider</span>
                                </span>
                            ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>KYC In Review</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Verification Required</span>
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {user?.email} • {formData.serviceCategory || "Artisan Specialist"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/provider/profile"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <span>View Public Portfolio</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </Link>
                </div>
            </div>

            {/* Notifications / Alerts */}
            {photoSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-semibold">Passport photograph updated successfully and synced across Web & Mobile!</p>
                </div>
            )}

            {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-semibold">Account settings successfully saved and synced across Web & Mobile!</p>
                </div>
            )}

            {resetSent && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-semibold">Password reset link sent to {user?.email}. Please check your inbox.</p>
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("profile")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                            activeTab === "profile"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <User className="mr-2 h-4 w-4" />
                        Profile & Trade
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("verification")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                            activeTab === "verification"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <Shield className="mr-2 h-4 w-4" />
                        Verification & KYC
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("security")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                            activeTab === "security"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <Lock className="mr-2 h-4 w-4" />
                        Security & Login
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("notifications")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors cursor-pointer ${
                            activeTab === "notifications"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <Bell className="mr-2 h-4 w-4" />
                        Notification Alerts
                    </button>
                </nav>
            </div>

            {/* TAB 1: PROFILE & TRADE FORM */}
            {activeTab === "profile" && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-gray-700" />
                                Professional Information & Trade Details
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                These details appear on your public service partner card and are used to dispatch relevant job requests.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Full Name / Business Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900"
                                        placeholder="e.g. John Okoro"
                                    />
                                    <User className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Primary Contact Phone
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900"
                                        placeholder="e.g. 08012345678"
                                    />
                                    <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            {/* Primary Trade Specialization */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Primary Trade Specialization
                                </label>
                                <select
                                    value={formData.serviceCategory}
                                    onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900 bg-white"
                                >
                                    <option value="Plumbing">Plumbing Services</option>
                                    <option value="Electrical">Electrical Repairs & Installation</option>
                                    <option value="Carpentry">Carpentry & Woodwork</option>
                                    <option value="Painting">Painting & Wall Finishing</option>
                                    <option value="AC & HVAC">Air Conditioning & HVAC</option>
                                    <option value="Cleaning">Deep Cleaning & Fumigation</option>
                                    <option value="Masonry">Masonry & Tiling</option>
                                    <option value="Generator Repair">Generator Repair & Maintenance</option>
                                    <option value="Roofing">Roofing & Leak Fixing</option>
                                    <option value="General Maintenance">General Artisan Maintenance</option>
                                </select>
                            </div>

                            {/* Secondary Trade */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Secondary Trade / Additional Skill
                                </label>
                                <input
                                    type="text"
                                    value={formData.secondaryService}
                                    onChange={(e) => setFormData({ ...formData, secondaryService: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900"
                                    placeholder="e.g. Water Heater Installation, Inverter Setup"
                                />
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Years of Professional Experience
                                </label>
                                <input
                                    type="text"
                                    value={formData.experience}
                                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900"
                                    placeholder="e.g. 5+ Years"
                                />
                            </div>

                            {/* Coverage Areas */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Service Coverage Areas & Towns
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.coverageArea}
                                        onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900"
                                        placeholder="e.g. Lekki, Ikoyi, Victoria Island, Ikeja"
                                    />
                                    <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Craftsmanship Bio & Introduction
                            </label>
                            <textarea
                                rows={4}
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium text-gray-900 resize-none"
                                placeholder="Describe your artisan expertise, standard response time, and dedication to high-quality service..."
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving Changes...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Save Profile Settings</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* TAB 2: VERIFICATION & KYC */}
            {activeTab === "verification" && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                KYC Identity & Compliance Status
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Certified verification by Wheel of Comfort guarantees client trust and instant dispatch access.
                            </p>
                        </div>

                        <Link
                            href="/register/provider?mode=update"
                            className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
                        >
                            <span>Update Documents</span>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ID Document Tile */}
                        <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{idType}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Government Issued Identification</div>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified
                            </span>
                        </div>

                        {/* Passport Photo Tile */}
                        <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {user?.photoURL || user?.passportUrl || appData.passportUrl ? (
                                        <img
                                            src={user.photoURL || user.passportUrl || appData.passportUrl}
                                            alt="Passport Photo"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Camera className="w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">Biometric Passport Photo</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Verified facial recognition avatar</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Change Photo</span>
                                </button>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Verified
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-amber-700" />
                            Annual Compliance Assurance
                        </p>
                        <p className="text-amber-800">
                            Your artisan credential allows you to claim and execute open dispatch jobs across your designated service territory. If your legal documents expire, you can re-upload them at any time through the KYC update portal.
                        </p>
                    </div>
                </div>
            )}

            {/* TAB 3: SECURITY & PASSWORD */}
            {activeTab === "security" && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-gray-700" />
                            Account Security & Access Credentials
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Manage your login credentials, password recovery, and authenticated sessions.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-sm font-bold text-gray-900">Password & Authentication</div>
                            <div className="text-xs text-gray-500">
                                Registered login address: <span className="font-semibold text-gray-700">{user?.email}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendPasswordReset}
                            disabled={isSendingReset}
                            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                        >
                            {isSendingReset ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sending Link...</span>
                                </>
                            ) : (
                                <>
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Send Password Reset Email</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                        <div className="text-sm font-bold text-gray-900">Security Best Practices</div>
                        <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                            <li>Keep your Wheel of Comfort password unique and never share client dispatches with unverified third parties.</li>
                            <li>Two-Factor identity protection is active on client fund transfers and escrow disbursements.</li>
                            <li>Always check customer job addresses in the Job Market before accepting a dispatch.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* TAB 4: NOTIFICATIONS & DISPATCH ALERTS */}
            {activeTab === "notifications" && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-gray-700" />
                            Dispatch & Communication Preferences
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Configure how and when you receive instant dispatches, job invites, and client chat notifications.
                        </p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {/* Dispatch Alerts */}
                        <div className="py-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-900">New Job Dispatch Alerts</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Instant sound and banner notification when a client request matching your trade is posted.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.notifJobDispatches}
                                    onChange={(e) => setFormData({ ...formData, notifJobDispatches: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                            </label>
                        </div>

                        {/* Direct Chat Notifications */}
                        <div className="py-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-900">Direct Client Chat Messages</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Receive real-time notifications when a homeowner messages you on an active job.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.notifChatMessages}
                                    onChange={(e) => setFormData({ ...formData, notifChatMessages: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                            </label>
                        </div>

                        {/* Email Summaries */}
                        <div className="py-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-900">Weekly Earnings & Settlement Summaries</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Receive a weekly summary email detailing completed jobs, customer ratings, and net payouts.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.notifEmailSummaries}
                                    onChange={(e) => setFormData({ ...formData, notifEmailSummaries: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Updating Preferences...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Save Notification Preferences</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
