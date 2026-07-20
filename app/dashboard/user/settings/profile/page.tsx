"use client";

import { useState, useEffect } from "react";
import { User, MapPin, Mail, Phone, Calendar, Save, Loader2 } from "lucide-react";
import { db } from "../../../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import NaijaStates from 'naija-state-local-government';

interface ProfileData {
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    dob: string;
    accountType: string;
    address: {
        street: string;
        city: string;
        state: string;
    };
}

export default function ProfileSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState<ProfileData>({
        fullName: "",
        email: "",
        phone: "",
        gender: "",
        dob: "",
        accountType: "home_owner",
        address: { street: "", city: "", state: "" }
    });

    const [states, setStates] = useState<string[]>([]);
    const [lgas, setLgas] = useState<string[]>([]);

    useEffect(() => {
        setStates(NaijaStates.states());

        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUser({ uid: currentUser.uid, ...data });
                        setFormData({
                            fullName: data.fullName || "",
                            email: data.email || currentUser.email || "",
                            phone: data.phone || "",
                            gender: data.gender || "",
                            dob: data.dob || "",
                            accountType: data.accountType || "home_owner",
                            address: {
                                street: data.address?.street || "",
                                city: data.address?.city || "",
                                state: data.address?.state || ""
                            }
                        });

                        // Load LGAs if state exists
                        if (data.address?.state) {
                            setLgas(NaijaStates.lgas(data.address.state).lgas || []);
                        }
                    }
                } catch (error) {
                    console.error("Error loading profile:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Should be handled by middleware/layout, but safety fallback
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: string, value: string) => {
        if (field === 'state') {
            const lgaData = NaijaStates.lgas(value);
            setLgas(lgaData?.lgas || []);
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, state: value, city: "" } // Reset city/lga
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, [field]: value }
            }));
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                fullName: formData.fullName,
                phone: formData.phone,
                // gender: formData.gender, // Gender usually immutable or specific request
                // dob: formData.dob, // DOB usually immutable
                address: formData.address,
                // Do not update email without auth verification flow
            });
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

    return (
        <div className="divide-y divide-gray-100">
            {/* Header */}
            <div className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Details</h2>
                <p className="text-sm text-gray-500">Update your photo and personal details here.</p>

                {/* Avatar Placeholder */}
                <div className="mt-6 flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm text-2xl font-bold text-gray-400">
                        {formData.fullName.charAt(0)}
                    </div>
                    {/* Future: Image Upload Here */}
                    <button className="text-sm font-semibold text-gray-900 hover:text-gray-700 border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm">
                        Change Photo
                    </button>
                </div>
            </div>

            {/* Form Fields */}
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleChange("fullName", e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={formData.email}
                                disabled
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Account Type</label>
                        <select
                            value={formData.accountType}
                            disabled
                            className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed appearance-none"
                        >
                            <option value="home_owner">Home Owner</option>
                            <option value="tenant">Tenant</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Gender</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.gender}
                                disabled
                                className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed capitalize"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="date"
                                value={formData.dob}
                                disabled
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-600" /> Address Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Street Address</label>
                            <input
                                type="text"
                                value={formData.address.street}
                                onChange={(e) => handleAddressChange("street", e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">State</label>
                            <select
                                value={formData.address.state}
                                onChange={(e) => handleAddressChange("state", e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                            >
                                <option value="">Select State...</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">City / LGA</label>
                            <select
                                value={formData.address.city}
                                onChange={(e) => handleAddressChange("city", e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition-all"
                                disabled={!formData.address.state}
                            >
                                <option value="">Select City...</option>
                                {lgas.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50"
                    onClick={handleSave}
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </div>
    );
}
