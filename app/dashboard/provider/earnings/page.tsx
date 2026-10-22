"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Clock, ShieldCheck, Wallet, Briefcase } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { formatJobBudget } from "@/lib/job-utils";

export default function ProviderEarningsPage() {
    const [providerId, setProviderId] = useState<string | null>(null);
    const [completedJobs, setCompletedJobs] = useState<any[]>([]);
    const [inProgressJobs, setInProgressJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setProviderId(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!providerId) return;

        const q = query(
            collection(db, "job_requests"),
            where("providerId", "==", providerId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const all: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const completed = all.filter(j => 
                ['fully_completed', 'completed'].includes(j.status) && 
                !j.isArchived && 
                j.status !== 'archived'
            );
            const inProgress = all.filter(j => 
                ['accepted', 'in_progress', 'awaiting_confirmation'].includes(j.status) && 
                !j.isArchived && 
                j.status !== 'archived'
            );

            // Deduplicate defensively
            const uniqueCompleted = completed.filter((job, index, self) =>
                index === self.findIndex((t) => (
                    t.clientName === job.clientName && 
                    (t.budget ?? t.price) === (job.budget ?? job.price) && 
                    t.serviceType === job.serviceType
                ))
            );
            const uniqueInProgress = inProgress.filter((job, index, self) =>
                index === self.findIndex((t) => (
                    t.clientName === job.clientName && 
                    (t.budget ?? t.price) === (job.budget ?? job.price) && 
                    t.serviceType === job.serviceType
                ))
            );

            setCompletedJobs(uniqueCompleted);
            setInProgressJobs(uniqueInProgress);
            setIsLoading(false);
        }, (err) => {
            console.warn("Earnings query notice:", err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [providerId]);

    const totalEarned = completedJobs.reduce((acc, j) => acc + (Number(j.budget ?? j.price) || 0), 0);
    const inEscrow = inProgressJobs.reduce((acc, j) => acc + (Number(j.budget ?? j.price) || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
                <p className="text-gray-500 text-sm mt-1">Track your job settlements, completed work revenue, and escrow balances.</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Earned</div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                        ₦{totalEarned.toLocaleString()}
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> From {completedJobs.length} completed {completedJobs.length === 1 ? 'job' : 'jobs'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Secured In Escrow</div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                        ₦{inEscrow.toLocaleString()}
                    </div>
                    <p className="text-xs text-amber-700 font-medium mt-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Across {inProgressJobs.length} active {inProgressJobs.length === 1 ? 'job' : 'jobs'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Protection</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                        100% Guaranteed
                    </div>
                    <p className="text-xs text-blue-700 font-medium mt-2">
                        Client funds pre-authorized before job dispatch
                    </p>
                </div>
            </div>

            {/* Payout History / Completed Jobs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Job Settlement History</h2>
                        <p className="text-xs text-gray-500">Record of all completed jobs and released earnings</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-gray-400 font-medium">Loading settlement records...</div>
                ) : completedJobs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-800">No completed jobs yet</h3>
                        <p className="text-xs text-gray-500 mt-1">Accept jobs from the Job Market and complete them to build your earnings record.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/70 text-xs text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 pl-6">Job Description</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4">Settled Date</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {completedJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-gray-900">{job.serviceType}</div>
                                            <div className="text-xs text-gray-400 truncate max-w-xs">{job.description}</div>
                                        </td>
                                        <td className="p-4 text-gray-700 font-medium">
                                            {job.clientName || "Client"}
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">
                                            {job.actualEndTime ? new Date(job.actualEndTime).toLocaleDateString() : (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent')}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle className="w-3 h-3" /> Settled
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right font-extrabold text-emerald-700">
                                            {formatJobBudget(job.budget, job.price)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
