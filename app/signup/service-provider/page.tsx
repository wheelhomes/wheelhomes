"use client";

import { useState, ChangeEvent, FormEvent, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Info, Upload, Image as ImageIcon, Lock, Eye, EyeOff, AlertCircle, X } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { sendAdminAlert } from "../../../lib/notifications";

function ServiceProviderForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State for form fields
    const [formData, setFormData] = useState({
        fullName: "",
        businessName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        services: [] as string[],
        description: "",
        location: "",
        passportPhoto: null as string | null,
        jobPhotos: [] as string[]
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resubmitDocId, setResubmitDocId] = useState<string | null>(null);

    // Refs for file inputs
    const passportInputRef = useRef<HTMLInputElement>(null);
    const jobInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkReapply = async () => {
            const isReapply = searchParams.get("reapply");
            const emailParam = searchParams.get("email");

            if (isReapply && emailParam) {
                try {
                    setIsLoading(true);
                    const q = query(
                        collection(db, "user_applications"),
                        where("data.email", "==", emailParam)
                    );
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const docSnapshot = querySnapshot.docs[0];
                        const data = docSnapshot.data();

                        setResubmitDocId(docSnapshot.id);
                        setFormData({
                            ...data.data,
                            password: "",
                            confirmPassword: "",
                            passportPhoto: data.data.passportPhoto || null,
                            jobPhotos: data.data.jobPhotos || []
                        });
                        setIsResubmitting(true);
                    }
                } catch (e) {
                    console.error("Failed to load existing application", e);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        checkReapply();
    }, [searchParams]);

    const servicesList = [
        "Plumbing", "Electrical", "Carpentry", "Painting",
        "AC Repair", "Cleaning", "Moving", "Landscaping"
    ];

    const handleServiceChange = (service: string) => {
        setFormData(prev => {
            const currentServices = prev.services;
            if (currentServices.includes(service)) {
                return { ...prev, services: currentServices.filter(s => s !== service) };
            } else {
                return { ...prev, services: [...currentServices, service] };
            }
        });
    };

    // Helper to compress image
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Max dimensions
                    const MAX_WIDTH = 600;
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG at 0.6 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handlePassportUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const compressed = await compressImage(file);
                setFormData(prev => ({ ...prev, passportPhoto: compressed }));
            } catch (err) {
                alert("Error processing image. Please try another file.");
            }
        }
    };

    const handleJobPhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const remainingSlots = 3 - formData.jobPhotos.length;

            if (files.length > remainingSlots) {
                alert(`You can only upload ${remainingSlots} more photos.`);
                return;
            }

            const newPhotos: string[] = [];
            for (const file of files) {
                try {
                    const compressed = await compressImage(file);
                    newPhotos.push(compressed);
                } catch (err) {
                    console.error("Error processing file", err);
                }
            }

            setFormData(prev => ({
                ...prev,
                jobPhotos: [...prev.jobPhotos, ...newPhotos]
            }));
        }
    };

    const removeJobPhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            jobPhotos: prev.jobPhotos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (!formData.passportPhoto) {
            alert("Please upload a passport photograph.");
            return;
        }

        if (formData.jobPhotos.length < 3) {
            alert("Please upload at least 3 job photographs.");
            return;
        }

        setIsLoading(true);
        try {
            // Manually construct the data object to prevent ANY unwanted fields
            const dbData = {
                fullName: formData.fullName,
                businessName: formData.businessName || "",
                email: formData.email,
                phone: formData.phone,
                // Do NOT include password or confirmPassword
                services: formData.services || [],
                description: formData.description || "",
                location: formData.location || "",
                passportPhoto: formData.passportPhoto || null,
                jobPhotos: formData.jobPhotos || [],
                role: "service_provider"
            };

            console.log("Submitting data:", dbData);

            const dataToSave = {
                submittedAt: new Date().toISOString(),
                status: "pending",
                rejectionReason: null,
                data: dbData
            };

            if (isResubmitting && resubmitDocId) {
                // Update existing document
                console.log("Updating existing doc:", resubmitDocId);
                const docRef = doc(db, "user_applications", resubmitDocId);
                await updateDoc(docRef, dataToSave);
                alert("Application Resubmitted Successfully!");
            } else {
                // Create new document
                console.log("Creating new doc in user_applications");

                // NEW: Check for duplicate email
                const q = query(
                    collection(db, "user_applications"),
                    where("data.email", "==", formData.email)
                );
                const existingSnapshot = await getDocs(q);

                if (!existingSnapshot.empty) {
                    const existingApp = existingSnapshot.docs[0].data();
                    alert(`An application with email ${formData.email} already exists (Status: ${existingApp.status}).`);
                    setIsLoading(false);
                    return;
                }

                // Add a timeout to detect hangs
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out after 10 seconds. Check your network or valid config.")), 10000)
                );

                await Promise.race([
                    addDoc(collection(db, "user_applications"), dataToSave),
                    timeoutPromise
                ]);

                // Send Notification to Admin
                await sendAdminAlert(
                    "New Provider Application",
                    `${formData.fullName} has applied as a Service Provider.`,
                    "info",
                    "/admin/approvals"
                );

                console.log("Document created successfully");
                alert("Application Submitted! An admin will review your request shortly.");
            }

            router.push("/");
        } catch (error: any) {
            console.error("FULL ERROR DETAILS:", error);
            console.error("ERROR CODE:", error.code);
            console.error("ERROR MESSAGE:", error.message);

            let errorMessage = error.message || "Unknown error occurred";
            if (error.code === 'permission-denied') {
                errorMessage = "Permission Denied: Check your Firestore Database Rules.";
            } else if (error.code === 'unavailable') {
                errorMessage = "Network Error: Cannot reach Firestore (offline).";
            }

            alert(`Error: ${errorMessage}. Check console for details.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            {/* Header */}
            <div className="max-w-3xl mx-auto mb-8 relative">
                <button
                    onClick={() => router.back()}
                    className="absolute left-0 top-0 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="text-center pt-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {isResubmitting ? "Update Your Application" : "Register as a Service Provider"}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {isResubmitting ? "Correct the issues and resubmit for approval" : "Join our network of trusted professionals"}
                    </p>
                </div>
            </div>

            {isResubmitting && (
                <div className="max-w-3xl mx-auto mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">Resubmitting Application</h4>
                        <p className="text-sm text-blue-700 mt-1">We've pre-filled your information. Please update the necessary fields and submit again.</p>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <p className="text-lg font-semibold">Processing...</p>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                                placeholder="Enter your full name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Name
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                                placeholder="Optional — e.g., FixIt Plumbing Services"
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="email"
                                // Disable email editing if resubmitting to ensure we match the record
                                disabled={isResubmitting}
                                className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm ${isResubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                                placeholder="Enter your email address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            {isResubmitting && <p className="text-xs text-gray-400 mt-1">Email cannot be changed during resubmission.</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="tel"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                You'll receive your login credentials via email after admin approval
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        required={!isResubmitting && formData.password === ""} // Only required if new or changing
                                        type={showPassword ? "text" : "password"}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        required={!isResubmitting && formData.password === ""}
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-4">
                            Select Service Offered <span className="text-red-500 mr-1">*</span>
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                            {servicesList.map((service) => (
                                <label key={service} className="flex items-center space-x-3 cursor-pointer group">
                                    <span className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 transition-colors cursor-pointer"
                                            checked={formData.services.includes(service)}
                                            onChange={() => handleServiceChange(service)}
                                        />
                                    </span>
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{service}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Service Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm resize-none"
                            placeholder="Tell us briefly what you do"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-sm"
                            placeholder="Enter your city or service area"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    {/* Passport Photo */}
                    <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            Passport Photograph <span className="text-red-500 mr-1">*</span>
                            <Info className="w-4 h-4 text-gray-400" />
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            ref={passportInputRef}
                            onChange={handlePassportUpload}
                            className="hidden"
                        />

                        {formData.passportPhoto ? (
                            <div className="relative w-32 h-32 mx-auto">
                                <img
                                    src={formData.passportPhoto}
                                    alt="Passport"
                                    className="w-full h-full object-cover rounded-xl border border-gray-200"
                                />
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, passportPhoto: null }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => passportInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-orange-500 transition-colors mb-3" />
                                <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900">Click to upload passport photo</span>
                                <span className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP (max 5MB)</span>
                            </div>
                        )}
                    </div>

                    {/* Job Photos */}
                    <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            Recent Job Photographs (3 Required) <span className="text-red-500 mr-1">*</span>
                            <Info className="w-4 h-4 text-gray-400" />
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={jobInputRef}
                            onChange={handleJobPhotoUpload}
                            className="hidden"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Display Uploaded Photos */}
                            {formData.jobPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-[4/3] group">
                                    <img
                                        src={photo}
                                        alt={`Job ${index + 1}`}
                                        className="w-full h-full object-cover rounded-xl border border-gray-200"
                                    />
                                    <button
                                        onClick={() => removeJobPhoto(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {/* Upload Button Placeholder (if less than 3) */}
                            {formData.jobPhotos.length < 3 && (
                                <div
                                    onClick={() => jobInputRef.current?.click()}
                                    className="aspect-[4/3] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <ImageIcon className="w-6 h-6 text-gray-300 group-hover:text-orange-500 transition-colors mb-2" />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-600">Click to upload</span>
                                    <span className="text-[10px] text-gray-300">({3 - formData.jobPhotos.length} remaining)</span>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            Upload photos of completed projects to showcase your work quality
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg active:scale-[0.99] duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isResubmitting ? "Resubmit Application" : "Register as Service Provider"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default function ServiceProviderSignup() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ServiceProviderForm />
        </Suspense>
    );
}
