"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MapPin, DollarSign, Calendar } from "lucide-react";
import { RequestServices } from "@/lib/services/request-service";

interface RequestFormWizardProps {
    initialCategory: string;
}

export default function RequestFormWizard({ initialCategory }: RequestFormWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        serviceType: initialCategory || "",
        description: "",
        location: "", // Simplified for now
        budget: "",
        date: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const userId = localStorage.getItem("tempUserId") || "guest-user"; // Fallback

            await RequestServices.createRequest({
                userId,
                serviceId: formData.serviceType
                // We would map other fields here if RequestServices supports them loosely or update the service to support them
                // For now, assuming basic creation works and we update usage later or just create basic
            });

            // Redirect to dashboard
            router.push("/dashboard/user");
        } catch (error) {
            console.error("Submission failed", error);
            alert("Failed to submit request. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-2 w-12 rounded-full transition-colors ${i <= step ? 'bg-orange-500' : 'bg-gray-200'}`} />
                    ))}
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Step {step} of 3</span>
            </div>

            <div className="p-8">
                {/* Step 1: Details */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900">Tell us about the job</h2>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Category</label>
                            <input
                                type="text"
                                name="serviceType"
                                value={formData.serviceType}
                                onChange={handleChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 capitalize"
                                readOnly={!!initialCategory}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Describe what you need done..."
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Location & Time */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900">Where & When?</h2>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address / Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="123 Main St, Apt 4B"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Budget & Review */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900">Budget & Review</h2>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Budget (Optional)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-6">
                            <h3 className="font-bold text-orange-900 mb-2">Summary</h3>
                            <ul className="text-sm text-orange-800 space-y-1">
                                <li>Is <strong>{formData.serviceType}</strong> correct?</li>
                                <li>Located at <strong>{formData.location || "N/A"}</strong></li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="p-8 border-t border-gray-100 flex justify-between bg-gray-50/50">
                {step > 1 ? (
                    <button onClick={prevStep} className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                ) : (
                    <div></div>
                )}

                {step < 3 ? (
                    <button onClick={nextStep} className="flex items-center gap-2 bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-orange-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-orange-500 transition-transform active:scale-95 shadow-lg shadow-orange-200"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'} <Check className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
