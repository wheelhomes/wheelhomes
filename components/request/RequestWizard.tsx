"use client";

import { useState, useEffect, useMemo } from "react";
import {
    X,
    ArrowRight,
    MapPin,
    Clock,
    CheckCircle,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, addDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useServiceCategories, getLucideIcon } from "@/lib/service-categories";
import {
    NIGERIAN_STATES,
    useHodDirectory,
    detectClientState,
    findDesignatedHod,
    resolveAndRouteServiceRequest,
} from "@/lib/hod-routing";
import { sendHodJobDispatchEmailAction } from "@/app/actions/email";

interface RequestWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
    initialDescription?: string;
    userId: string;
}

// 2-Step Direct HOD Routing Flow (No manual provider picking)
const STEPS = [
    {
        title: "Select Service Category",
        desc: "Choose the department you need help from",
    },
    {
        title: "Problem Details & Smart Location",
        desc: "Your request routes directly to the Head of Department (HOD) in your state",
    },
];

const PREFERRED_TIME_OPTIONS = [
    "As soon as possible (Today)",
    "Morning (8:00 AM – 12:00 PM)",
    "Afternoon (12:00 PM – 4:00 PM)",
    "Evening (4:00 PM – 7:00 PM)",
    "Tomorrow Morning",
    "This Weekend",
];

export function RequestWizard({
    isOpen,
    onClose,
    initialCategory,
    initialDescription,
    userId,
}: RequestWizardProps) {
    const { activeCategories } = useServiceCategories();
    const { activeAssignments: hodAssignments } = useHodDirectory();

    const wizardCategories = useMemo(
        () =>
            activeCategories.map((c) => ({
                id: c.id,
                label: c.name,
                shortTitle: c.shortTitle,
                icon: getLucideIcon(c.iconKey),
                colorHex: c.colorHex,
            })),
        [activeCategories]
    );

    const shouldAutoAdvance = !!initialCategory && !!initialDescription;
    const [step, setStep] = useState(shouldAutoAdvance ? 2 : 1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [category, setCategory] = useState(initialCategory ? initialCategory.toLowerCase() : "");
    const [description, setDescription] = useState(initialDescription || "");
    const [location, setLocation] = useState("");
    const [preferredTime, setPreferredTime] = useState(PREFERRED_TIME_OPTIONS[0]);
    const [budget, setBudget] = useState("");

    // Auto-detected client profile & state
    const [userProfile, setUserProfile] = useState<Record<string, any> | null>(null);
    const [selectedStateName, setSelectedStateName] = useState<string>("Lagos");
    const [stateSourceLabel, setStateSourceLabel] = useState<string>("Auto-detected from your account");
    const [userOverrodeState, setUserOverrodeState] = useState(false);

    // Resolve matched category by id, name, or shortTitle
    const currentCategory = useMemo(() => {
        if (!category) return undefined;
        const q = category.toLowerCase();
        return (
            wizardCategories.find(
                (c) =>
                    c.id.toLowerCase() === q ||
                    c.label.toLowerCase() === q ||
                    c.shortTitle.toLowerCase() === q ||
                    c.label.toLowerCase().includes(q) ||
                    q.includes(c.shortTitle.toLowerCase())
            ) || wizardCategories[0]
        );
    }, [category, wizardCategories]);

    // Step 2 of HOD Routing: Automatically detect client's state from registered profile
    useEffect(() => {
        if (!isOpen || !userId) return;
        let active = true;

        const loadClientProfile = async () => {
            try {
                const snap = await getDoc(doc(db, "users", userId));
                if (!active) return;
                if (snap.exists()) {
                    const data = snap.data();
                    setUserProfile(data);

                    // Pre-fill street address from profile if user hasn't typed one yet
                    const savedAddr =
                        typeof data.address === "string" && data.address.trim()
                            ? data.address.trim()
                            : typeof data.location === "string" && data.location.trim()
                            ? data.location.trim()
                            : data.city && data.state
                            ? `${data.city}, ${data.state}`
                            : "";
                    if (savedAddr && !location) {
                        setLocation(savedAddr);
                    }

                    const detected = detectClientState(data, savedAddr);
                    setSelectedStateName(detected.stateName);
                    setStateSourceLabel(
                        detected.detectedFrom.startsWith("profile")
                            ? `Auto-detected from your registered profile (${detected.stateName})`
                            : `Auto-detected location (${detected.stateName})`
                    );
                }
            } catch (err) {
                console.warn("Could not read client profile for state detection:", err);
            }
        };

        loadClientProfile();
        return () => {
            active = false;
        };
    }, [isOpen, userId]);

    // Sync initial category/description props when modal opens
    useEffect(() => {
        if (isOpen) {
            const normalizedCategory = initialCategory ? initialCategory.toLowerCase() : "";
            setCategory(normalizedCategory);
            setDescription(initialDescription || "");
            setUserOverrodeState(false);
            setStep(normalizedCategory && initialDescription ? 2 : 1);
        }
    }, [isOpen, initialCategory, initialDescription]);

    // If user types an address containing a state/city and hasn't manually overridden the state dropdown, refine detection
    const handleAddressChange = (val: string) => {
        setLocation(val);
        if (!userOverrodeState && val.trim().length > 3) {
            const detected = detectClientState(userProfile, val);
            if (detected.detectedFrom === "typed_address") {
                setSelectedStateName(detected.stateName);
                setStateSourceLabel(`Detected from entered address (${detected.stateName})`);
            }
        }
    };

    // Live preview of the 1 designated HOD for (Selected Category + Detected State)
    const matchedRoutingPreview = useMemo(() => {
        if (!currentCategory) return null;
        return findDesignatedHod({
            assignments: hodAssignments,
            categories: activeCategories,
            serviceCategoryInput: currentCategory.label,
            stateInput: selectedStateName,
        });
    }, [currentCategory, selectedStateName, hodAssignments, activeCategories]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1) {
            if (!category) return alert("Please select a service category.");
        }
        setStep(2);
    };

    const handleBack = () => setStep(1);

    const handleSubmit = async () => {
        if (!description.trim()) return alert("Please describe what needs to be fixed.");
        if (!location.trim()) return alert("Please enter the property address.");

        setIsSubmitting(true);

        try {
            const routed = await resolveAndRouteServiceRequest({
                clientId: userId,
                clientName:
                    userProfile?.fullName ||
                    userProfile?.displayName ||
                    userProfile?.email ||
                    undefined,
                serviceCategoryInput: currentCategory?.label || category,
                description,
                addressText: location,
                preferredTime,
                explicitStateInput: selectedStateName,
                budget: Number(budget) || 0,
                photos: [],
                categories: activeCategories,
            });

            // Save to `job_requests` and mirror to `requests` with identical ID
            const docRef = await addDoc(collection(db, "job_requests"), routed.docData);
            await setDoc(doc(db, "requests", docRef.id), routed.docData).catch(() => {});

            // Notify ONLY the 1 designated HOD for this Category + State (In-App + Email)
            if (routed.hod && routed.hod.hodUid) {
                await addDoc(collection(db, "notifications"), {
                    userId: routed.hod.hodUid,
                    recipientId: routed.hod.hodUid,
                    title: `New ${routed.matchedCategoryName} Request in ${routed.matchedStateName} 🛠️`,
                    message: `${routed.docData.clientName} requested ${routed.matchedCategoryName} at ${routed.docData.location}. Review and dispatch your nearest assistant.`,
                    body: `${routed.docData.clientName} requested ${routed.matchedCategoryName} at ${routed.docData.location}. Review and dispatch your nearest assistant.`,
                    type: "info",
                    read: false,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    payload: { jobId: docRef.id },
                }).catch(() => {});

                let hodEmail = (routed.hod.hodEmail || "").trim();
                if (!hodEmail) {
                    const hodSnap = await getDoc(doc(db, "users", routed.hod.hodUid)).catch(() => null);
                    if (hodSnap && hodSnap.exists()) {
                        hodEmail = String(
                            hodSnap.data()?.email ||
                                hodSnap.data()?.applicationData?.email ||
                                ""
                        ).trim();
                    }
                }
                if (hodEmail) {
                    sendHodJobDispatchEmailAction({
                        email: hodEmail,
                        hodName: routed.hod.hodName,
                        categoryName: routed.matchedCategoryName,
                        stateName: routed.matchedStateName,
                        clientName: String(routed.docData.clientName || "Verified Client"),
                        location: String(routed.docData.location || routed.matchedStateName),
                        description: description.trim(),
                        preferredTime,
                    }).catch(() => {});
                }
            }

            alert(
                routed.hod
                    ? `Request routed directly to the ${routed.matchedStateName} ${routed.matchedCategoryName} Head of Department (${routed.hod.hodName}). They will assign the nearest technician to your location shortly!`
                    : `Request received for ${routed.matchedCategoryName} in ${routed.matchedStateName}! Our dispatch desk is assigning the nearest technician to your location.`
            );

            handleClose();
        } catch (error) {
            console.error(error);
            alert("Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setCategory("");
        setDescription("");
        setBudget("");
        setUserOverrodeState(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                            Step {step} of {STEPS.length} • Smart HOD Routing
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{STEPS[step - 1].title}</h2>
                        <p className="text-sm text-gray-500">{STEPS[step - 1].desc}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-100 w-full">
                    <div
                        className="h-full bg-emerald-600 transition-all duration-300 ease-out"
                        style={{ width: `${(step / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {/* STEP 1: SERVICE CATEGORY SELECTION */}
                    {step === 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {wizardCategories.map((cat) => {
                                const isSelected = currentCategory?.id === cat.id && !!category;
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id)}
                                        className={`
                                            group relative p-5 rounded-2xl border text-left transition-all hover:shadow-lg cursor-pointer
                                            ${
                                                isSelected
                                                    ? "border-emerald-600 bg-white ring-2 ring-emerald-600 ring-offset-2"
                                                    : "bg-white border-gray-100 hover:border-emerald-300"
                                            }
                                        `}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                                            style={{
                                                backgroundColor: `${cat.colorHex}18`,
                                                color: cat.colorHex,
                                            }}
                                        >
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-gray-900 block text-sm leading-snug">
                                            {cat.label}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-4 right-4 text-emerald-600">
                                                <CheckCircle className="w-5 h-5 fill-current" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* STEP 2: DETAILS + AUTO-DETECTED STATE + DIRECT HOD ROUTING */}
                    {step === 2 && (
                        <div className="space-y-5">
                            {/* Selected Service + Smart HOD Routing Banner */}
                            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {currentCategory && (
                                            <div
                                                className="p-2.5 rounded-xl bg-white shadow-sm"
                                                style={{ color: currentCategory.colorHex }}
                                            >
                                                <currentCategory.icon className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">
                                                Selected Department
                                            </p>
                                            <p className="text-gray-900 font-bold text-base">
                                                {currentCategory?.label}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                                    >
                                        Change Service
                                    </button>
                                </div>

                                {/* Smart Location & HOD Match Info */}
                                <div className="pt-3 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>{stateSourceLabel}</span>
                                        </div>
                                        <p className="text-xs text-emerald-800 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                            {matchedRoutingPreview?.hod ? (
                                                <span>
                                                    Routes directly to{" "}
                                                    <strong>
                                                        {matchedRoutingPreview.matchedStateName}{" "}
                                                        {currentCategory?.shortTitle} HOD (
                                                        {matchedRoutingPreview.hod.hodName})
                                                    </strong>{" "}
                                                    — who will send the nearest technician to you.
                                                </span>
                                            ) : (
                                                <span>
                                                    Routes directly to{" "}
                                                    <strong>
                                                        {selectedStateName} {currentCategory?.shortTitle} Department Desk
                                                    </strong>{" "}
                                                    — the nearest vetted technician in {selectedStateName} will be dispatched.
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        <label className="block text-[10px] font-bold uppercase text-emerald-800 mb-1">
                                            State Location
                                        </label>
                                        <select
                                            value={selectedStateName}
                                            onChange={(e) => {
                                                setSelectedStateName(e.target.value);
                                                setUserOverrodeState(true);
                                                setStateSourceLabel(`Location set to ${e.target.value} State`);
                                            }}
                                            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-gray-900"
                                        >
                                            {NIGERIAN_STATES.map((st) => (
                                                <option key={st.slug} value={st.name}>
                                                    {st.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Example: I need a plumber to fix my leaking kitchen pipe and toilet pipe..."
                                        className="w-full p-4 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] shadow-sm text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                        Street Address / Landmark in {selectedStateName}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => handleAddressChange(e.target.value)}
                                            placeholder={`e.g. 24 Admiralty Way, Lekki Phase 1, ${selectedStateName}`}
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                            Preferred Visit Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                value={preferredTime}
                                                onChange={(e) => setPreferredTime(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm font-medium text-gray-800"
                                            >
                                                {PREFERRED_TIME_OPTIONS.map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                            Estimated Budget in ₦ (Optional)
                                        </label>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            placeholder="Optional (e.g. 15000)"
                                            className="w-full p-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!category}
                            className={`
                                px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer
                                ${!category ? "bg-gray-300 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-800"}
                            `}
                        >
                            Continue
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait cursor-pointer"
                        >
                            {isSubmitting ? "Routing to Department HOD..." : "Send to Department HOD"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
