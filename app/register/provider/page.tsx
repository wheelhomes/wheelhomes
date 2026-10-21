"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { doc, updateDoc, onSnapshot, collection, addDoc } from "firebase/firestore";
import {
    Briefcase,
    MapPin,
    BadgeCheck,
    Upload,
    ArrowRight,
    User,
    Camera,
    Trash2,
    Plus,
    CheckCircle2,
    AlertCircle,
    FileText,
    ShieldCheck,
    Clock,
    Sparkles
} from "lucide-react";
import { compressImageToBase64 } from "../../../lib/image-utils";
import { sendPendingReviewEmailAction } from "@/app/actions/email";
import { isEmailVerifiedGlobally } from "@/lib/auth-helpers";

// 13 Canonical Service Categories matching Mobile 1:1
const SERVICE_CATEGORIES = [
    "General Maintenance",
    "Plumbing & Pipefitting",
    "Electrical & Wiring",
    "Carpentry & Woodwork",
    "Painting & Wall Finishes",
    "HVAC & AC Repair",
    "Masonry, Tiling & Flooring",
    "Roofing & Ceiling",
    "Cleaning & Fumigation",
    "Welding & Metal Fabrication",
    "Landscaping & Gardening",
    "Appliance Repair",
    "Solar & Inverter Systems"
];

// 4 Canonical Government ID Options matching Mobile 1:1
const ID_OPTIONS = [
    {
        id: "National Identity Number (NIN)",
        title: "National Identity Number (NIN)",
        subtitle: "NIN slip, digital NIN, or NIMC card",
        badge: "Recommended"
    },
    {
        id: "Driver's License",
        title: "Driver's License",
        subtitle: "FRSC issued valid driver license"
    },
    {
        id: "International Passport",
        title: "International Passport",
        subtitle: "Valid biometric passport data page"
    },
    {
        id: "Voter's Card (INEC PVC)",
        title: "Voter's Card (INEC PVC)",
        subtitle: "Permanent voter card with visible VIN"
    }
];

interface JobPhotoItem {
    id: string;
    isRemote: boolean;
    url: string;
    file?: File;
}

export default function RegisterProviderPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Form fields (100% consistent with Mobile)
    const [formData, setFormData] = useState({
        primaryService: "General Maintenance",
        secondaryService: "",
        experience: "",
        coverageArea: "",
        bio: "",
        idType: "National Identity Number (NIN)",
    });

    // Verification Documents state
    const [idFile, setIdFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [passportPreview, setPassportPreview] = useState<string | null>(null);

    // Proof of Work / Job Photos state (3-5 photos required)
    const [jobPhotos, setJobPhotos] = useState<JobPhotoItem[]>([]);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const jobInputRef = useRef<HTMLInputElement>(null);
    const [isUpdateMode, setIsUpdateMode] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIsUpdateMode(params.get('mode') === 'update');
        }
    }, []);

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.replace("/signin");
                return;
            }
            if (unsubDoc) unsubDoc();

            // Real-time listener: if user completes onboarding on mobile, web automatically moves to pending review!
            unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUser(data);

                    if (!isEmailVerifiedGlobally(currentUser, data)) {
                        router.replace("/verify-email");
                        return;
                    }

                    if (data.status === 'pending_review' || data.status === 'pending') {
                        if (!isUpdateMode) {
                            router.replace("/dashboard/pending");
                            return;
                        }
                    }
                    if (data.status === 'approved') {
                        if (!isUpdateMode) {
                            router.replace("/dashboard/provider");
                            return;
                        }
                    }
                    if (data.status === 'restricted') {
                        router.replace("/dashboard/provider/settings");
                        return;
                    }

                    // Pre-fill form from existing profile or cross-device progress
                    const appData = data.applicationData || {};
                    const resolvedCategory = data.serviceCategory || appData.serviceCategory || appData.primaryService;
                    const resolvedIdType = data.idType || appData.idType;
                    const resolvedBio = data.bio || data.description || appData.bio || appData.description;
                    const resolvedExperience = data.experience || appData.experience;
                    const resolvedCoverage = data.coverageArea || appData.coverageArea;

                    setFormData(prev => ({
                        ...prev,
                        primaryService: resolvedCategory && SERVICE_CATEGORIES.includes(resolvedCategory) ? resolvedCategory : prev.primaryService,
                        secondaryService: appData.secondaryService || prev.secondaryService,
                        experience: resolvedExperience ? String(resolvedExperience) : prev.experience,
                        coverageArea: resolvedCoverage || prev.coverageArea,
                        bio: resolvedBio || prev.bio,
                        idType: resolvedIdType && ID_OPTIONS.some(o => o.id === resolvedIdType) ? resolvedIdType : prev.idType,
                    }));

                    // Pre-fill remote documents if available and no local file picked
                    if (!idFile && (data.govIdUrl || appData.govIdUrl)) {
                        setIdPreview(data.govIdUrl || appData.govIdUrl);
                    }
                    if (!passportFile && (data.passportUrl || appData.passportUrl)) {
                        setPassportPreview(data.passportUrl || appData.passportUrl);
                    }

                    // Pre-fill existing job photos from mobile/previous session
                    const remoteJobPhotos = data.jobPhotos || appData.jobPhotos;
                    if (Array.isArray(remoteJobPhotos) && remoteJobPhotos.length > 0) {
                        setJobPhotos(prev => {
                            // Keep any locally added items, and append missing remote ones
                            const localItems = prev.filter(p => !p.isRemote);
                            const remoteItems: JobPhotoItem[] = remoteJobPhotos.map((url: string, idx: number) => ({
                                id: `remote-${idx}-${url.slice(-10)}`,
                                isRemote: true,
                                url,
                            }));
                            // Avoid duplicating existing URLs
                            const seenUrls = new Set(prev.map(p => p.url));
                            const uniqueRemote = remoteItems.filter(r => !seenUrls.has(r.url));
                            return prev.length === 0 ? remoteItems : [...prev, ...uniqueRemote].slice(0, 5);
                        });
                    }
                }
            }, (err) => console.error("Error listening to provider document:", err));
        });

        return () => {
            if (unsubDoc) unsubDoc();
            unsubscribe();
        };
    }, [router]);

    // Handle Gov ID file selection
    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIdFile(file);
            setIdPreview(URL.createObjectURL(file));
        }
    };

    // Handle Passport Photo selection
    const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPassportFile(file);
            setPassportPreview(URL.createObjectURL(file));
        }
    };

    // Handle Proof of Work / Job Photos selection (up to 5)
    const handleJobPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const availableSlots = 5 - jobPhotos.length;

        if (availableSlots <= 0) {
            alert("Maximum 5 proof of work photos allowed.");
            return;
        }

        const newItems: JobPhotoItem[] = files.slice(0, availableSlots).map((file, idx) => ({
            id: `local-${Date.now()}-${idx}`,
            isRemote: false,
            url: URL.createObjectURL(file),
            file,
        }));

        setJobPhotos(prev => [...prev, ...newItems].slice(0, 5));
        if (jobInputRef.current) jobInputRef.current.value = "";
    };

    const removeJobPhoto = (id: string) => {
        setJobPhotos(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        if (!agreeToTerms) {
            alert("Please accept the terms and authenticity declaration to continue.");
            return;
        }

        if (!idPreview) {
            alert("Please upload your Government Identification document.");
            return;
        }

        if (!passportPreview) {
            alert("Please upload your recent Passport Photograph / Headshot.");
            return;
        }

        if (jobPhotos.length < 3) {
            alert(`Please upload at least 3 Proof of Work photos (currently ${jobPhotos.length} of 3 required).`);
            return;
        }

        if (!formData.bio.trim()) {
            alert("Please enter a brief trade bio to describe your experience and craftsmanship.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Process Government ID
            let finalGovIdUrl = idPreview;
            if (idFile) {
                try {
                    finalGovIdUrl = await compressImageToBase64(idFile);
                } catch (err: any) {
                    console.error("ID Processing Failed:", err);
                    alert(`Failed to process Government ID: ${err.message || "Please select a valid image"}`);
                    setIsLoading(false);
                    return;
                }
            }

            // 2. Process Passport Photo
            let finalPassportUrl = passportPreview;
            if (passportFile) {
                try {
                    finalPassportUrl = await compressImageToBase64(passportFile);
                } catch (err: any) {
                    console.error("Passport Processing Failed:", err);
                    alert(`Failed to process Passport Photo: ${err.message || "Please select a valid image"}`);
                    setIsLoading(false);
                    return;
                }
            }

            // 3. Process Proof of Work Job Photos
            const finalJobPhotoUrls: string[] = [];
            for (const item of jobPhotos) {
                if (item.isRemote) {
                    finalJobPhotoUrls.push(item.url);
                } else if (item.file) {
                    try {
                        const compressed = await compressImageToBase64(item.file);
                        finalJobPhotoUrls.push(compressed);
                    } catch (err) {
                        console.warn("Could not compress job photo:", err);
                    }
                }
            }

            if (finalJobPhotoUrls.length < 3) {
                alert("Please ensure at least 3 valid proof of work photos are processed.");
                setIsLoading(false);
                return;
            }

            const now = new Date().toISOString();
            const services = [formData.primaryService, formData.secondaryService].filter(Boolean);
            const cleanBio = formData.bio.trim();
            const cleanExperience = formData.experience.trim();
            const cleanCoverage = formData.coverageArea.trim();

            // 4. Update User Document with 100% Mobile Parity Schema
            await updateDoc(doc(db, "users", currentUser.uid), {
                role: "service_provider",
                status: isUpdateMode ? "approved" : "pending_review",
                rejectionReason: null,
                rejectedDocs: [],
                serviceCategory: formData.primaryService,
                services: services,
                bio: cleanBio,
                description: cleanBio,
                experience: cleanExperience,
                coverageArea: cleanCoverage,
                idType: formData.idType,
                govIdUrl: finalGovIdUrl,
                passportUrl: finalPassportUrl,
                jobPhotos: finalJobPhotoUrls,
                kycSubmittedAt: now,
                applicationData: {
                    idType: formData.idType,
                    serviceCategory: formData.primaryService,
                    primaryService: formData.primaryService,
                    secondaryService: formData.secondaryService,
                    services: services,
                    bio: cleanBio,
                    description: cleanBio,
                    experience: cleanExperience,
                    coverageArea: cleanCoverage,
                    govIdUrl: finalGovIdUrl,
                    passportUrl: finalPassportUrl,
                    jobPhotos: finalJobPhotoUrls,
                    submittedAt: now,
                    hasDocuments: true
                }
            });

            // 5. Add in-app notification (mirrors mobile)
            try {
                await addDoc(collection(db, "notifications"), {
                    userId: currentUser.uid,
                    recipientId: currentUser.uid,
                    title: "Onboarding Successful 🎉",
                    message: "Your onboarding documents have been submitted. Your account is currently under pending review.",
                    body: "Your onboarding documents have been submitted. Your account is currently under pending review.",
                    type: "info",
                    read: false,
                    isRead: false,
                    createdAt: now,
                    link: "/dashboard/pending"
                });
            } catch (notifErr) {
                console.warn("Notification dispatch notice:", notifErr);
            }

            // 6. Dispatch pending review confirmation email to applicant
            const candidateEmail = currentUser.email || user?.email;
            if (candidateEmail) {
                sendPendingReviewEmailAction(candidateEmail, user?.fullName || currentUser.displayName || 'Service Provider')
                    .catch(err => console.warn('[Register Provider] Notice: Pending review email dispatch:', err));
            }

            // 7. Transition appropriately
            if (isUpdateMode) {
                alert("KYC documents and profile updated successfully!");
                router.replace("/dashboard/provider/profile");
            } else {
                router.replace("/dashboard/pending");
            }

        } catch (error) {
            console.error("Registration error:", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const hasMetMinimumJobPhotos = jobPhotos.length >= 3;
    const remainingForMin = Math.max(0, 3 - jobPhotos.length);

    return (
        <div className="min-h-screen bg-gray-50 pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Header */}
                    <div className="bg-gray-900 px-8 py-7 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <Briefcase className="w-6 h-6 text-amber-400" /> Provider Registration & Verification
                                </h1>
                                <p className="text-gray-400 text-sm mt-1">
                                    Complete your professional profile, proof of work, and identity credentials
                                </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                    <span>{isUpdateMode ? "Document & KYC Update" : "Verification Application"}</span>
                                </div>
                                {isUpdateMode && (
                                    <button
                                        type="button"
                                        onClick={() => router.push("/dashboard/provider")}
                                        className="px-3.5 py-1 rounded-full text-xs font-bold border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        Back to Dashboard
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                        {/* Rejection Notice Banner if application was rejected */}
                        {user?.status === 'rejected' && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-left animate-in slide-in-from-top-2 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-red-100 rounded-xl text-red-600 flex-shrink-0">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase mb-2">
                                            Changes Requested by Compliance
                                        </div>
                                        <h3 className="text-base font-bold text-red-950">Action Required on Your Application</h3>
                                        <p className="text-sm text-red-800 mt-1">
                                            The compliance team reviewed your submission and requested the following updates:
                                        </p>
                                        {user?.rejectionReason && (
                                            <div className="mt-3 p-3.5 bg-white rounded-xl border border-red-200 text-sm font-semibold text-red-950 shadow-sm">
                                                &quot;{user.rejectionReason}&quot;
                                            </div>
                                        )}
                                        <p className="text-xs text-red-700 mt-3 font-medium">
                                            💡 Your previous information and uploaded documents have been pre-filled below. Please update the necessary documents or trade information and click &quot;Re-Submit Application&quot; at the bottom.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1. Verified Personal Details */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200/80">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" /> Personal Details (Verified)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                                    <div className="font-semibold text-gray-900 text-sm truncate">{user?.fullName || "Loading..."}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                                    <div className="font-semibold text-gray-900 text-sm truncate">{user?.email || "Loading..."}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
                                    <div className="font-semibold text-gray-900 text-sm truncate">{user?.phone || "Loading..."}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Trade Profile & Professional Details */}
                        <div className="space-y-6">
                            <div className="border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-600" /> Trade Profile & Experience
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Tell homeowners and verification officers about your craftsmanship and trade category
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Primary Trade Category <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm font-medium text-gray-900 shadow-sm"
                                        value={formData.primaryService}
                                        onChange={(e) => setFormData({ ...formData, primaryService: e.target.value })}
                                        required
                                    >
                                        {SERVICE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Secondary Service <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <select
                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm font-medium text-gray-900 shadow-sm"
                                        value={formData.secondaryService}
                                        onChange={(e) => setFormData({ ...formData, secondaryService: e.target.value })}
                                    >
                                        <option value="">None / Single Specialization</option>
                                        {SERVICE_CATEGORIES
                                            .filter(c => c !== formData.primaryService)
                                            .map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Years of Experience <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm text-gray-900 shadow-sm"
                                            placeholder="e.g. 5"
                                            value={formData.experience}
                                            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Service Coverage Area <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm text-gray-900 shadow-sm"
                                            placeholder="e.g. Lagos Island, Lekki, Victoria Island, Ikeja"
                                            value={formData.coverageArea}
                                            onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Trade Bio & Practical Experience <span className="text-rose-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Mention your specific craftsmanship, tools, licenses, and previous completed projects.
                                    </p>
                                    <textarea
                                        rows={4}
                                        className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm text-gray-900 shadow-sm leading-relaxed"
                                        placeholder="e.g. Over 5 years of certified residential and commercial plumbing experience. Specializing in pipe leak detection, bathroom fittings, solar water heaters, and borehole connections."
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Proof of Work & Job Photos (Portfolio: Min 3, Max 5) */}
                        <div className="space-y-4 pt-2">
                            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-indigo-600" /> Proof of Work & Job Photos
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload 3 to 5 clear photos of repairs, installations, or completed trade projects
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto bg-indigo-50 border border-indigo-200 text-indigo-700">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{jobPhotos.length} of 5 Photos ({hasMetMinimumJobPhotos ? "Min Reached ✓" : `${remainingForMin} more required`})</span>
                                </div>
                            </div>

                            {/* Job Photos Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {jobPhotos.map((item, idx) => (
                                    <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-sm">
                                        <img
                                            src={item.url}
                                            alt={`Work proof ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                                            {idx < 3 ? `Proof #${idx + 1} *` : `Proof #${idx + 1}`}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeJobPhoto(item.id)}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all sm:opacity-0 group-hover:opacity-100"
                                            title="Remove photo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Photo Button / Tile */}
                                {jobPhotos.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => jobInputRef.current?.click()}
                                        className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer ${
                                            hasMetMinimumJobPhotos
                                                ? "border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-gray-600"
                                                : "border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-amber-800"
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                                            <Plus className={`w-5 h-5 ${hasMetMinimumJobPhotos ? "text-indigo-600" : "text-amber-600"}`} />
                                        </div>
                                        <span className="text-xs font-bold">Add Work Photo</span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">
                                            {hasMetMinimumJobPhotos ? `${5 - jobPhotos.length} left` : `${remainingForMin} more for min`}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <input
                                ref={jobInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleJobPhotosChange}
                            />

                            {!hasMetMinimumJobPhotos && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>
                                        Verification requires a minimum of <strong>3 work proof photos</strong> before submission. Please upload {remainingForMin} more photo{remainingForMin > 1 ? "s" : ""}.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 4. Identity Verification Documents */}
                        <div className="space-y-6 pt-2">
                            <div className="border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <BadgeCheck className="w-4 h-4 text-emerald-600" /> Government Identity Verification
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose your ID document type and upload a clear photograph of your credential
                                </p>
                            </div>

                            {/* ID Type Selection Cards (matching Mobile 1:1) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Select ID Document Type <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {ID_OPTIONS.map(opt => {
                                        const isSelected = formData.idType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, idType: opt.id })}
                                                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-600 bg-blue-50/50 shadow-sm"
                                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                    isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                                                }`}>
                                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                                                            {opt.title}
                                                        </span>
                                                        {opt.badge && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                                                {opt.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{opt.subtitle}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Gov ID & Passport Upload Boxes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gov ID Document */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        {formData.idType} <span className="text-rose-500">*</span>
                                    </label>
                                    {idPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50/20 p-2">
                                            <div className="h-44 w-full rounded-lg overflow-hidden relative bg-black/5">
                                                <img src={idPreview} alt="Gov ID Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between px-1">
                                                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ID Document Attached
                                                </span>
                                                <label htmlFor="gov-id-input" className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                                                    Change Photo
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                            <label htmlFor="gov-id-input" className="cursor-pointer flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">Upload {formData.idType}</span>
                                                <span className="text-xs text-gray-500 mt-1">PNG, JPG, or JPEG up to 10MB</span>
                                            </label>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="gov-id-input"
                                        onChange={handleIdChange}
                                    />
                                </div>

                                {/* Passport Photograph / Headshot */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Recent Passport Photograph / Selfie <span className="text-rose-500">*</span>
                                    </label>
                                    {passportPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50/20 p-2">
                                            <div className="h-44 w-full rounded-lg overflow-hidden relative bg-black/5">
                                                <img src={passportPreview} alt="Passport Photo Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between px-1">
                                                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Headshot Attached
                                                </span>
                                                <label htmlFor="passport-photo-input" className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                                                    Change Photo
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                            <label htmlFor="passport-photo-input" className="cursor-pointer flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                                                    <Camera className="w-6 h-6" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">Upload Recent Headshot</span>
                                                <span className="text-xs text-gray-500 mt-1">Clear face photo against neutral background</span>
                                            </label>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="passport-photo-input"
                                        onChange={handlePassportChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 5. Declaration & Compliance Acceptance */}
                        <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-200/80 flex items-start gap-3.5">
                            <input
                                type="checkbox"
                                id="terms-declaration"
                                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                required
                            />
                            <label htmlFor="terms-declaration" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                                <strong>Authenticity & Platform Compliance Declaration:</strong> I declare that all information, certificates, identification documents, and trade work samples submitted are genuine and accurate. I understand that off-platform transactions are prohibited and all bookings, communications, and client settlements must be processed on Wheel of Comfort.
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    <span>Compressing & Submitting Application...</span>
                                </>
                            ) : (
                                <>
                                    <span>{user?.status === 'rejected' ? "Re-Submit Application for Review" : "Submit Application for Review"}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
