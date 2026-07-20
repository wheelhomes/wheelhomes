"use client";

import { useState, useEffect } from "react";
import {
    X, ArrowRight, ArrowLeft, MapPin, Camera, AlertTriangle,
    Zap, Clock, Calendar, CheckCircle, Search, Sparkles, Droplet, Wrench, Thermometer
} from "lucide-react";
import { db, storage } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { ProviderSelectionList, Provider } from "./ProviderSelectionList";

interface RequestWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
    initialDescription?: string;
    userId: string;
}

// Updated Categories with Lucide Icons directly
const CATEGORIES = [
    { id: "plumbing", label: "Plumbing", icon: Droplet, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "electrical", label: "Electrical", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50" },
    { id: "cleaning", label: "Cleaning", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50" },
    { id: "repairs", label: "Repairs", icon: Wrench, color: "text-orange-500", bg: "bg-orange-50" },
    { id: "hvac", label: "HVAC / AC", icon: Thermometer, color: "text-cyan-500", bg: "bg-cyan-50" },
    { id: "gardening", label: "Gardening", icon: MapPin, color: "text-green-500", bg: "bg-green-50" }
];

// Steps: 1. Category, 2. Providers, 3. Details
const STEPS = [
    { title: "Service Type", desc: "Choose the type of service you need" },
    { title: "Select Provider", desc: "Select a preferred provider or continue" },
    { title: "Request Details", desc: "Tell us what needs to be fixed" }
];

export function RequestWizard({ isOpen, onClose, initialCategory, initialDescription, userId }: RequestWizardProps) {
    const router = useRouter();

    // Determine initial step: if we have both category and description (Magic Request), jump to Step 3
    const shouldAutoAdvance = !!initialCategory && !!initialDescription;
    const [step, setStep] = useState(shouldAutoAdvance ? 3 : 1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [category, setCategory] = useState(initialCategory ? initialCategory.toLowerCase() : "");
    const [description, setDescription] = useState(initialDescription || "");
    const [location, setLocation] = useState("");
    const [budget, setBudget] = useState("");
    const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
    const [selectedProviders, setSelectedProviders] = useState<Provider[]>([]);

    // Sync state with props when opening
    useEffect(() => {
        if (isOpen) {
            const normalizedCategory = initialCategory ? initialCategory.toLowerCase() : "";
            setCategory(normalizedCategory);
            setDescription(initialDescription || "");

            // Auto-advance logic
            if (normalizedCategory && initialDescription) {
                // Try to find the "Best Rated" provider for this category
                const fetchBestProvider = async () => {
                    try {
                        const categoryLabel = CATEGORIES.find(c => c.id === normalizedCategory)?.label;
                        if (!categoryLabel) return;

                        // Simple query: role=provider, has service, sort: rating desc
                        // Note: requires index. If index missing, might fail. 
                        // For safety/speed in this demo without index management, we can query top 10 and sort client side if needed, 
                        // or just try common query. 
                        // Let's rely on "where" filters first. Firestore needs composite index for where+orderBy.
                        // Avoiding orderBy to prevent "index required" error break for now (unless I'm sure).
                        // Actually, let's just get a few matches and pick the winner.

                        const q = query(
                            collection(db, "users"),
                            where("role", "==", "service_provider"),
                            where("services", "array-contains", categoryLabel),
                            limit(10)
                        );

                        const snap = await getDocs(q);
                        if (!snap.empty) {
                            const fetched = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Provider));
                            // Client-side sort to avoid index issues
                            fetched.sort((a: Provider, b: Provider) => (b.rating || 0) - (a.rating || 0));

                            const best = fetched[0];
                            if (best) {
                                setSelectedProviderIds([best.id]);
                                setSelectedProviders([best]);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to auto-select best provider", e);
                        // Fallback to auto-assign (empty selection) explicitly handled by default state
                    }
                };

                fetchBestProvider();
                setStep(3);
            } else if (normalizedCategory) {
                // If only category is provided (e.g. manual click on tile elsewhere), maybe go to step 2?
                // For now, let's keep it safe. 
            } else {
                setStep(1);
            }
        }
    }, [isOpen, initialCategory, initialDescription]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1) {
            if (!category) return alert("Please select a service category.");
        }
        if (step === 2) {
            // Screen 2 Rule: "Continue - Assign Any Available Provider"
            // If they modify selection, it's captured in selectedProviderIds
            // If empty, it means auto-assign. We allow proceeding.
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        if (!description) return alert("Please describe your issue.");
        if (!location) return alert("Please enter the location.");

        setIsSubmitting(true);

        try {
            const hasSpecificProviders = selectedProviderIds.length > 0;
            const docData = {
                clientId: userId,
                category,
                serviceType: CATEGORIES.find(c => c.id === category)?.label || category,
                description,
                location,
                budget: Number(budget) || 0,
                status: hasSpecificProviders ? 'pending' : 'open',
                // 'pending' if sent to specific (needs accept), 'open' if broadcast to all (auto-assign pool)
                providerId: hasSpecificProviders ? selectedProviderIds[0] : null,
                invitedProviderIds: selectedProviderIds,
                autoAssign: !hasSpecificProviders,
                createdAt: new Date().toISOString(),
                photos: []
            };

            await addDoc(collection(db, "job_requests"), docData);

            alert(hasSpecificProviders
                ? "Request sent to selected providers!"
                : "Request received! We will looking for a provider for you."
            );

            handleClose();
            // Optionally redirect to "My Requests"
            // router.push("/dashboard/user/requests"); 

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
        setLocation("");
        setBudget("");
        setSelectedProviderIds([]);
        setSelectedProviders([]);
        onClose();
    };

    // Helper to get category details
    const currentCategory = CATEGORIES.find(c => c.id === category);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1">
                            Step {step} of {STEPS.length}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{STEPS[step - 1].title}</h2>
                        <p className="text-sm text-gray-500">{STEPS[step - 1].desc}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 bg-white rounded-full hover:bg-gray-100 border border-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-100 w-full">
                    <div
                        className="h-full bg-green-500 transition-all duration-300 ease-out"
                        style={{ width: `${(step / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">

                    {/* SCREEN 1: CATEGORY SELECTION */}
                    {step === 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`
                                        group relative p-6 rounded-2xl border text-left transition-all hover:shadow-lg
                                        ${category === cat.id
                                            ? 'border-green-500 bg-white ring-2 ring-green-500 ring-offset-2'
                                            : 'bg-white border-gray-100 hover:border-green-300'}
                                    `}
                                >
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110
                                        ${cat.bg} ${cat.color}
                                    `}>
                                        <cat.icon className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-gray-900 block text-lg">{cat.label}</span>
                                    {category === cat.id && (
                                        <div className="absolute top-4 right-4 text-green-500">
                                            <CheckCircle className="w-5 h-5 fill-current" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* SCREEN 2: PROVIDER SELECTION */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className={`p-2 rounded-lg ${currentCategory?.bg} ${currentCategory?.color}`}>
                                    {currentCategory && <currentCategory.icon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Service Selected</p>
                                    <p className="text-gray-900 font-bold text-lg">{currentCategory?.label}</p>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="ml-auto text-sm text-green-600 font-medium hover:underline"
                                >
                                    Change
                                </button>
                            </div>

                            <ProviderSelectionList
                                serviceType={currentCategory?.label || ""}
                                selectedIds={selectedProviderIds}
                                onSelectionChange={(ids, providers) => {
                                    setSelectedProviderIds(ids);
                                    setSelectedProviders(providers);
                                }}
                            />
                        </div>
                    )}

                    {/* SCREEN 3: DETAILS */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Read Only Context */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service</label>
                                    <p className="font-bold text-gray-900">{currentCategory?.label}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 relative group">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Provider</label>
                                    <div className="flex justify-between items-center">
                                        {selectedProviderIds.length > 0 ? (
                                            <div>
                                                <p className="font-bold text-green-600">{selectedProviderIds.length} Selected</p>
                                                {selectedProviders.length === 1 && (
                                                    <p className="text-xs text-gray-500 font-medium truncate max-w-[120px]">
                                                        {selectedProviders[0].businessName || selectedProviders[0].fullName}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="font-bold text-orange-500">Auto-Assign</p>
                                        )}
                                        <button
                                            onClick={() => setStep(2)}
                                            className="text-xs font-bold text-gray-400 hover:text-green-600 underline"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Issue Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe what needs to be fixed..."
                                        className="w-full p-4 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500 min-h-[140px] shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Property Address / Location <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                            placeholder="e.g. 123 Main St, Lagos"
                                            className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Budget (Optional)</label>
                                    <input
                                        type="number"
                                        value={budget}
                                        onChange={e => setBudget(e.target.value)}
                                        placeholder="Enter amount in ₦"
                                        className="w-full p-3.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                                    />
                                </div>

                                {/* Placeholder for Media Upload */}
                                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-white hover:bg-gray-50 cursor-pointer transition-colors h-32">
                                    <Camera className="w-6 h-6 mb-2" />
                                    <span className="text-xs font-medium">Add Photos / Videos (Optional)</span>
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
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            Back
                        </button>
                    ) : <div></div>} {/* Spacer */}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            className={`
                                px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2
                                ${!category ? 'bg-gray-300 cursor-not-allowed hidden' : 'bg-gray-900 hover:bg-gray-800'}
                            `}
                        >
                            {step === 2 && selectedProviderIds.length === 0 ? "Continue - Auto Assign" : "Next"}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Request"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
