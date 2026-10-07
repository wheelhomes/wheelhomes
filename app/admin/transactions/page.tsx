"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import {
    CreditCard,
    Search,
    ShieldCheck,
    CheckCircle,
    Clock,
    AlertCircle,
    ArrowUpRight,
    DollarSign,
    Lock,
    Unlock,
    RotateCcw,
    Eye,
    X,
    User,
    Briefcase,
    ExternalLink
} from "lucide-react";

interface Transaction {
    id: string;
    reference: string;
    userId: string;
    jobId?: string;
    amount: number;
    status: 'escrow_held' | 'released' | 'refunded' | 'completed' | string;
    paymentMethod?: string;
    paymentGateway?: string;
    gatewayMode?: string;
    currency?: string;
    title?: string;
    description?: string;
    createdAt?: any;
    releasedAt?: any;
    refundedAt?: any;
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [txToRelease, setTxToRelease] = useState<Transaction | null>(null);
    const [isReleasing, setIsReleasing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "transactions"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Transaction[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    reference: data.reference || `REF_${doc.id.slice(0, 8)}`,
                    userId: data.userId || "Unknown User",
                    jobId: data.jobId,
                    amount: Number(data.amount || 0),
                    status: (data.status || "escrow_held").toLowerCase(),
                    paymentMethod: data.paymentMethod || "Card",
                    paymentGateway: data.paymentGateway || "paystack",
                    gatewayMode: data.gatewayMode || "test",
                    currency: data.currency || "NGN",
                    title: data.title || "Service Escrow Payment",
                    description: data.description || "",
                    createdAt: data.createdAt,
                    releasedAt: data.releasedAt,
                    refundedAt: data.refundedAt
                };
            });

            // Sort newest first
            list.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            setTransactions(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Release Escrow Action
    const handleReleaseEscrow = async () => {
        if (!txToRelease) return;
        setIsReleasing(true);
        const releasedAt = new Date().toISOString();

        try {
            // 1. Update Transaction Document
            await updateDoc(doc(db, "transactions", txToRelease.id), {
                status: "released",
                releasedAt: releasedAt
            });

            // 2. If associated with a job, update the job document
            if (txToRelease.jobId) {
                // Check mobile 'requests' first
                const reqRef = doc(db, "requests", txToRelease.jobId);
                const reqSnap = await getDoc(reqRef);

                let clientUserId = txToRelease.userId;

                if (reqSnap.exists()) {
                    clientUserId = reqSnap.data().userId || clientUserId;
                    await updateDoc(reqRef, {
                        paymentStatus: "released",
                        paymentReleasedAt: releasedAt,
                        status: "completed"
                    });
                } else {
                    // Try web 'job_requests'
                    const jobReqRef = doc(db, "job_requests", txToRelease.jobId);
                    const jobReqSnap = await getDoc(jobReqRef);
                    if (jobReqSnap.exists()) {
                        clientUserId = jobReqSnap.data().clientId || clientUserId;
                        await updateDoc(jobReqRef, {
                            paymentStatus: "released",
                            paymentReleasedAt: releasedAt,
                            status: "fully_completed"
                        });
                    }
                }

                // 3. Send Client Notification
                if (clientUserId) {
                    try {
                        await addDoc(collection(db, "notifications"), {
                            userId: clientUserId,
                            recipientId: clientUserId,
                            title: "Escrow Payment Released ✅",
                            message: `Funds of ₦${txToRelease.amount.toLocaleString()} for "${txToRelease.title}" have been approved and released to the service provider.`,
                            type: "escrow",
                            isRead: false,
                            createdAt: releasedAt,
                            payload: { jobId: txToRelease.jobId, reference: txToRelease.reference }
                        });
                    } catch (nErr) {
                        console.error("Error writing notification:", nErr);
                    }
                }
            }

            setTxToRelease(null);
            alert("Escrow funds released successfully!");
        } catch (err) {
            console.error("Error releasing escrow:", err);
            alert("Failed to release escrow funds.");
        } finally {
            setIsReleasing(false);
        }
    };

    // Calculate Summary Metrics
    const totalVolume = transactions.reduce((acc, tx) => acc + tx.amount, 0);
    const escrowHeldVolume = transactions
        .filter(tx => tx.status === "escrow_held")
        .reduce((acc, tx) => acc + tx.amount, 0);
    const releasedVolume = transactions
        .filter(tx => tx.status === "released" || tx.status === "completed")
        .reduce((acc, tx) => acc + tx.amount, 0);
    const heldCount = transactions.filter(tx => tx.status === "escrow_held").length;

    // Filter Logic
    const filteredTx = transactions.filter(tx => {
        const matchesSearch =
            tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.jobId && tx.jobId.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus =
            filterStatus === "all" ||
            tx.status === filterStatus ||
            (filterStatus === "released" && (tx.status === "released" || tx.status === "completed"));

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "escrow_held":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                        <Lock className="w-3 h-3" /> Escrow Held
                    </span>
                );
            case "released":
            case "completed":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Released
                    </span>
                );
            case "refunded":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                        <RotateCcw className="w-3 h-3" /> Refunded
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 capitalize w-fit">
                        {status.replace('_', ' ')}
                    </span>
                );
        }
    };

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-orange-600" />
                        Transactions & Escrow Audit
                    </h1>
                    <p className="text-gray-500 mt-1">Real-time financial audit, escrow vault monitoring, and provider payout approvals.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Volume</p>
                        <h3 className="text-2xl font-extrabold text-gray-900 mt-1">₦{totalVolume.toLocaleString()}</h3>
                    </div>
                    <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Held in Escrow</p>
                        <h3 className="text-2xl font-extrabold text-amber-600 mt-1">₦{escrowHeldVolume.toLocaleString()}</h3>
                        <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{heldCount} Active Escrow(s)</p>
                    </div>
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <Lock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Released Payouts</p>
                        <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">₦{releasedVolume.toLocaleString()}</h3>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Unlock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transactions</p>
                        <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{transactions.length}</h3>
                    </div>
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    {(["all", "escrow_held", "released", "refunded"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${filterStatus === status
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                                }`}
                        >
                            {status === "all" ? "All Payments" : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search reference, job ID, user..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference & Date</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Job / Service</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                                            <span>Loading escrow transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTx.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-400">
                                        No transactions match your search or filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredTx.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono font-bold text-gray-900 text-xs">
                                                {tx.reference}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-"}
                                            </div>
                                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 ${tx.gatewayMode === 'live' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {tx.gatewayMode?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 text-sm max-w-xs truncate">{tx.title}</div>
                                            {tx.jobId && (
                                                <div className="text-xs text-orange-600 font-mono">Job: #{tx.jobId.slice(0, 8)}</div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-mono text-xs text-gray-600">
                                                {tx.userId.slice(0, 10)}...
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs font-semibold text-gray-800 capitalize">{tx.paymentMethod}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-mono">{tx.paymentGateway}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-extrabold text-gray-900 text-base">
                                                ₦{tx.amount.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(tx.status)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {tx.status === 'escrow_held' && (
                                                    <button
                                                        onClick={() => setTxToRelease(tx)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 transition-all flex items-center gap-1"
                                                    >
                                                        <Unlock className="w-3.5 h-3.5" /> Release
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedTx(tx)}
                                                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Details Modal */}
            {selectedTx && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Transaction Audit</h3>
                                <p className="font-mono text-xs text-gray-500 mt-0.5">{selectedTx.reference}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Transaction Amount</p>
                                    <h2 className="text-2xl font-extrabold text-gray-900 mt-1">₦{selectedTx.amount.toLocaleString()}</h2>
                                </div>
                                <div>{getStatusBadge(selectedTx.status)}</div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Service / Title</span>
                                    <span className="font-semibold text-gray-900">{selectedTx.title}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Client / Payer UID</span>
                                    <span className="font-mono text-xs text-gray-800">{selectedTx.userId}</span>
                                </div>
                                {selectedTx.jobId && (
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-500">Associated Job ID</span>
                                        <span className="font-mono text-xs text-orange-600 font-bold">{selectedTx.jobId}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Payment Gateway</span>
                                    <span className="font-bold uppercase text-gray-800">{selectedTx.paymentGateway} ({selectedTx.gatewayMode})</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Payment Method</span>
                                    <span className="capitalize text-gray-800 font-medium">{selectedTx.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Date Secured</span>
                                    <span className="text-gray-800 font-medium">{selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : 'N/A'}</span>
                                </div>
                                {selectedTx.releasedAt && (
                                    <div className="flex justify-between py-1 border-b border-gray-50">
                                        <span className="text-gray-500">Date Released</span>
                                        <span className="text-emerald-700 font-semibold">{new Date(selectedTx.releasedAt).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {selectedTx.description && (
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-600">
                                    <p className="font-bold text-gray-700 mb-1">Audit Log / Note:</p>
                                    {selectedTx.description}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            {selectedTx.status === 'escrow_held' ? (
                                <button
                                    onClick={() => {
                                        setTxToRelease(selectedTx);
                                        setSelectedTx(null);
                                    }}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                                >
                                    <Unlock className="w-4 h-4" /> Release Funds Now
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setSelectedTx(null)}
                                className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Escrow Release Confirmation Modal */}
            {txToRelease && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                            <Unlock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Authorize Escrow Release?</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            You are about to release <span className="font-extrabold text-emerald-700">₦{txToRelease.amount.toLocaleString()}</span> to the assigned service provider for job: <span className="font-semibold text-gray-800">"{txToRelease.title}"</span>.
                        </p>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4 text-xs text-amber-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>This action cannot be undone. Funds will be released for payout and the customer will be notified.</span>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setTxToRelease(null)}
                                disabled={isReleasing}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReleaseEscrow}
                                disabled={isReleasing}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                            >
                                {isReleasing ? "Authorizing..." : "Confirm & Release Funds"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
