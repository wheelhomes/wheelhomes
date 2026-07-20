"use client";

import { useState } from "react";
import { X, CheckCircle, AlertTriangle, Check, Upload } from "lucide-react";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage } from "../../../lib/firebase";
import { compressImageToBase64 } from "../../../lib/image-utils";

interface CompleteJobModalProps {
    isOpen: boolean;
    job: any;
    onClose: () => void;
    onComplete: (type: 'full' | 'partial', data?: any) => Promise<void>;
}

export default function CompleteJobModal({ isOpen, job, onClose, onComplete }: CompleteJobModalProps) {
    const [completionType, setCompletionType] = useState<'full' | 'partial'>('full');
    const [partialReason, setPartialReason] = useState("");
    const [partialPhoto, setPartialPhoto] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen || !job) return null;

    const handleSubmit = async () => {
        if (completionType === 'full') {
            await onComplete('full');
        } else {
            if (!partialReason) {
                alert("Please provide a reason.");
                return;
            }
            if (!partialPhoto) {
                alert("Please upload photo evidence.");
                return;
            }

            setIsUploading(true);
            try {
                // Upload logic
                // Client-side compression (Free Mode)
                const base64Image = await compressImageToBase64(partialPhoto);

                // Use the base64 string directly
                const downloadURL = base64Image;

                await onComplete('partial', {
                    reason: partialReason,
                    photoProof: downloadURL
                });

            } catch (error) {
                console.error("Completion error:", error);
                alert(`Failed to complete: ${(error as any).message}`);
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Finish Job</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Toggle Switch */}
                <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
                    <button
                        onClick={() => setCompletionType('full')}
                        className={`
                            flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
                            ${completionType === 'full' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        <CheckCircle className={`w-4 h-4 ${completionType === 'full' ? 'fill-green-100 text-green-600' : ''}`} />
                        Fully Completed
                    </button>
                    <button
                        onClick={() => setCompletionType('partial')}
                        className={`
                            flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
                            ${completionType === 'partial' ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        <AlertTriangle className={`w-4 h-4 ${completionType === 'partial' ? 'fill-yellow-100 text-yellow-600' : ''}`} />
                        Partially Completed
                    </button>
                </div>

                {completionType === 'full' ? (
                    <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-20 h-20 bg-green-50 text-[#21C185] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
                            <Check className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Almost Done!</h3>
                        <p className="text-gray-500 mb-8 px-4">
                            Click 'Confirm Job Done' only when all work has been fully completed. The user will be notified to confirm and close the job.
                        </p>

                        <button
                            onClick={handleSubmit}
                            className="w-full py-3.5 bg-[#21C185] text-white font-bold rounded-xl hover:bg-[#1db077] transition-all shadow-lg shadow-green-200 text-sm tracking-wide uppercase"
                        >
                            Confirm Job Done
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-2 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                            <p className="text-sm text-yellow-800 font-medium leading-relaxed">
                                <strong>Compliance Check:</strong> To mark a job as Partial, you must provide a valid reason (e.g., missing parts) and photographic evidence for admin review.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Reason for Partial Status</label>
                            <textarea
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-sm transition-all"
                                placeholder="E.g. Waiting for materials, incorrect job scope..."
                                rows={3}
                                value={partialReason}
                                onChange={e => setPartialReason(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Photo Evidence</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={e => setPartialPhoto(e.target.files ? e.target.files[0] : null)}
                                />
                                {partialPhoto ? (
                                    <div className="text-green-600 font-medium flex flex-col items-center">
                                        <CheckCircle className="w-10 h-10 mb-2 fill-green-50" />
                                        <span className="text-sm underline decoration-wavy underline-offset-4">{partialPhoto.name}</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center group-hover:scale-105 transition-transform">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-200 transition-colors">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">Click to upload photo</span>
                                        <span className="text-xs text-gray-400 mt-1">Supports JPG, PNG</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isUploading}
                            className="w-full py-3.5 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-200 disabled:opacity-70 disabled:cursor-wait mt-4"
                        >
                            {isUploading ? "Uploading Proof..." : "Submit Partial Status"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
