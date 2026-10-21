"use client";

import { useState, useEffect, useRef } from "react";
import { User, Briefcase, MapPin, Phone, Mail, Award, CheckCircle2, ShieldCheck, Camera, FileText, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { compressImageToBase64 } from "@/lib/image-utils";
import Link from "next/link";

export default function ProviderProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
                const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
                    if (snap.exists()) {
                        setProfile(snap.data());
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.warn("Profile fetch notice:", err);
                    setIsLoading(false);
                });
                return () => unsub();
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !userId) return;
        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const compressed = await compressImageToBase64(file);
            const userRef = doc(db, "users", userId);
            const now = new Date().toISOString();
            await updateDoc(userRef, {
                passportUrl: compressed,
                photoURL: compressed,
                "applicationData.passportUrl": compressed,
                updatedAt: now,
            });

            try {
                await setDoc(doc(db, "users", userId, "documents", "passport"), {
                    data: compressed,
                    type: "passport",
                    uploadedAt: now,
                    mimeType: "image/jpeg",
                }, { merge: true });
            } catch (_) {}
        } catch (err: any) {
            console.error("Failed to update passport photo:", err);
            alert("Failed to update photo: " + (err.message || "Please try another image"));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center text-gray-400 font-medium">Loading profile details...</div>;
    }

    const appData = profile?.applicationData || {};
    const category = profile?.serviceCategory || appData.serviceCategory || (profile?.services && profile.services[0]) || "General Maintenance";
    const secondary = profile?.services && profile.services.length > 1 ? profile.services[1] : (appData.secondaryService || "None");
    const experience = profile?.experience || appData.experience || "Not specified";
    const coverageArea = profile?.coverageArea || appData.coverageArea || profile?.city || "General Coverage";
    const bio = profile?.bio || profile?.description || appData.bio || "No professional bio provided.";
    const jobPhotos: string[] = profile?.jobPhotos || appData.jobPhotos || [];
    const hasGovId = !!(profile?.govIdUrl || appData.govIdUrl);
    const hasPassport = !!(profile?.passportUrl || appData.passportUrl);
    const idType = profile?.idType || appData.idType || "Government Issued ID";

    return (
        <div className="max-w-5xl mx-auto space-y-8 font-sans">
            {/* Header / Identity Card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-3xl shadow-md overflow-hidden flex-shrink-0 relative">
                        {profile?.photoURL || profile?.passportUrl || appData.passportUrl ? (
                            <img src={profile.photoURL || profile.passportUrl || appData.passportUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            (profile?.fullName || "SP").slice(0, 2).toUpperCase()
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Change Passport Photo"
                        className="absolute -bottom-1 -right-1 p-2 bg-gray-900 hover:bg-black text-white rounded-xl shadow-md border-2 border-white transition-all transform hover:scale-110 cursor-pointer disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                    />
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{profile?.fullName || "Service Partner"}</h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-center md:self-auto">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified Specialist</span>
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gray-400" /> {profile?.email}</span>
                        {profile?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" /> {profile?.phone}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {coverageArea}</span>
                    </div>
                </div>

                <Link
                    href="/register/provider?mode=update"
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                    <span>Update KYC Profile</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </Link>
            </div>

            {/* Trade & Professional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-orange-600" /> Trade Specialization
                    </h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Primary Trade</span>
                            <span className="font-bold text-gray-900">{category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Secondary Trade</span>
                            <span className="font-bold text-gray-900">{secondary}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-gray-500">Experience</span>
                            <span className="font-bold text-gray-900">{experience} {experience.toString().includes('year') ? '' : 'Years'}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500">Coverage Locations</span>
                            <span className="font-bold text-gray-900">{coverageArea}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" /> Professional Bio & Craftsmanship
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                        &quot;{bio}&quot;
                    </p>
                </div>
            </div>

            {/* Verification Dossier */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600" /> Compliance & Identity Dossier
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Documents verified by the Wheel of Comfort security and compliance desk</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-900">{idType}</div>
                                <div className="text-[11px] text-gray-500">Government Identification</div>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                        </span>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
                                <Camera className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-900">Passport Photograph</div>
                                <div className="text-[11px] text-gray-500">Biometric facial identity</div>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                        </span>
                    </div>
                </div>

                {/* Proof of Work Photos Gallery */}
                {jobPhotos.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Proof of Work Portfolio ({jobPhotos.length} Photos)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {jobPhotos.map((url, i) => (
                                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-xs group">
                                    <img
                                        src={url}
                                        alt={`Work Sample ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
