"use client";

import { useState } from "react";
import { X, Clock } from "lucide-react";

interface StartJobModalProps {
    isOpen: boolean;
    job: any;
    onClose: () => void;
    onStart: (eta: string, note: string) => Promise<void>;
}

export default function StartJobModal({ isOpen, job, onClose, onStart }: StartJobModalProps) {
    const [estimatedTime, setEstimatedTime] = useState("");
    const [startNote, setStartNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen || !job) return null;

    const handleSubmit = async () => {
        if (!estimatedTime) {
            alert("Please select an estimated completion time.");
            return;
        }
        setIsLoading(true);
        await onStart(estimatedTime, startNote);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Start Job</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <p className="text-sm text-gray-600 mb-4">You are about to start <strong>{job.serviceType}</strong> for {job.clientName}. Please provide an estimated duration.</p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Expected Completion Time</label>
                        <div className="flex flex-wrap gap-2">
                            {['30 mins', '1 hour', '2 hours', '5 hours', '24 hours'].map(time => (
                                <button
                                    key={time}
                                    onClick={() => setEstimatedTime(time)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${estimatedTime === time ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Note (Optional)</label>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                            placeholder="Any important notes about the job..."
                            rows={3}
                            value={startNote}
                            onChange={e => setStartNote(e.target.value)}
                        />
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg flex gap-3 items-start border border-gray-100">
                        <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <strong>Legal Note:</strong> Estimated time is a professional estimate and may change due to site conditions. Updates should be communicated via chat.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Starting..." : "Confirm Start"}
                </button>
            </div>
        </div>
    );
}
