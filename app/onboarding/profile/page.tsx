"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, MapPin, Calendar, ArrowRight, Home } from "lucide-react";
import NaijaStates from 'naija-state-local-government';

interface OnboardingData {
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    dob: string;
    street: string;
    state: string;
    city: string; // LGA
    accountType: 'home_owner' | 'tenant';
}

export default function ProfileOnboardingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [states, setStates] = useState<string[]>([]);
    const [lgas, setLgas] = useState<string[]>([]);

    // Read-only + Editable Data
    const [formData, setFormData] = useState<OnboardingData>({
        fullName: "",
        email: "",
        phone: "",
        gender: "",
        dob: "",
        street: "",
        state: "",
        city: "",
        accountType: 'home_owner'
    });

    useEffect(() => {
        // Load States on Mount
        try {
            const allStates = NaijaStates.states();
            setStates(allStates);
        } catch (e) {
            console.error("Failed to load states", e);
            // Fallback mock if library fails (or if using different version)
            setStates(["Lagos", "Abuja", "Rivers", "Ogun", "Oyo"]);
        }

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                router.push("/signin");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setFormData(prev => ({
                        ...prev,
                        fullName: data.fullName || user.displayName || "",
                        email: data.email || user.email || "",
                        phone: data.phone || ""
                    }));
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Update LGAs when State changes
    useEffect(() => {
        if (formData.state) {
            try {
                const fetchedLgas = NaijaStates.lgas(formData.state).lgas;
                setLgas(fetchedLgas || []);
            } catch (e) {
                console.error("Failed to load LGAs", e);
                setLgas([]);
            }
        } else {
            setLgas([]);
        }
    }, [formData.state]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset city if state changes
            ...(name === 'state' ? { city: "" } : {})
        }));
    };

    const handleAccountTypeSelect = (type: 'home_owner' | 'tenant') => {
        setFormData(prev => ({ ...prev, accountType: type }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const user = auth.currentUser;
        if (!user) return;

        if (!formData.gender || !formData.dob) {
            alert("Please fill in all required fields.");
            setIsSaving(false);
            return;
        }

        try {
            await updateDoc(doc(db, "users", user.uid), {
                gender: formData.gender,
                dob: formData.dob,
                address: {
                    street: formData.street,
                    state: formData.state,
                    city: formData.city
                },
                accountType: formData.accountType,
                // Do not change status yet, next step is documents
            });

            router.push("/onboarding/documents");
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile. Please try again.");
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 px-8 py-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-gray-400 text-sm mt-1">Please provide your details to access Wheel of Comfort services.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">

                    {/* SECTION 1: BASIC INFO (READ ONLY) */}
                    <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                            Basic Information <span className="text-gray-400 font-normal ml-1">(Read-only)</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                                <div className="text-gray-900 font-medium bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed select-none">
                                    {formData.fullName}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                                <div className="text-gray-900 font-medium bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed select-none">
                                    {formData.email}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
                                <div className="text-gray-900 font-medium bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 cursor-not-allowed select-none">
                                    {formData.phone}
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
                            ✳️ These details were provided during sign-up and cannot be changed here.
                        </p>
                    </section>

                    {/* SECTION 2: PERSONAL DETAILS */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                            Personal Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            {/* DOB */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Date of Birth</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b pb-1">Residential Address</h3>

                            {/* State & City Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City / LGA</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                            disabled={!formData.state}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                                        >
                                            <option value="">Select City</option>
                                            {lgas.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Street */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Street Address</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. 123 Comfort Avenue"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Account Type */}
                        <div className="mt-8">
                            <label className="block text-sm font-bold text-gray-900 mb-3">Account Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleAccountTypeSelect('home_owner')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.accountType === 'home_owner'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 bg-white hover:border-orange-200'
                                        }`}
                                >
                                    <Home className={`w-6 h-6 ${formData.accountType === 'home_owner' ? 'text-orange-600' : 'text-gray-400'}`} />
                                    <span className="font-bold text-sm">Home Owner</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAccountTypeSelect('tenant')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${formData.accountType === 'tenant'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 bg-white hover:border-orange-200'
                                        }`}
                                >
                                    <User className={`w-6 h-6 ${formData.accountType === 'tenant' ? 'text-orange-600' : 'text-gray-400'}`} />
                                    <span className="font-bold text-sm">Tenant</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {isSaving ? "Saving..." : "Continue to Verification"} <ArrowRight className="w-5 h-5" />
                    </button>

                </form>
            </div>
        </div>
    );
}
