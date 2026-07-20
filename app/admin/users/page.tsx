"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, where, getDocs, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import {
    Users, Search, Filter, Briefcase, Home, Shield, CheckCircle, XCircle, Clock, Eye, X, Check, FileText, Trash2, UserPlus,
    MapPin, Calendar, Camera
} from "lucide-react";
import { UserProfile } from "../../../types/user";
import DeleteUserModal from "../../../components/admin/DeleteUserModal";


export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [isCleanupLoading, setIsCleanupLoading] = useState(false);

    // Review Modal State
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isRejectMode, setIsRejectMode] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectedDocs, setRejectedDocs] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


    const [error, setError] = useState<string | null>(null);
    const [currentUid, setCurrentUid] = useState<string>("");

    const [currentUser, setCurrentUser] = useState<any>(null); // Track full user object

    useEffect(() => {
        // Effect 1: Monitor Auth State
        import("firebase/auth").then(({ getAuth }) => {
            const auth = getAuth();
            const unsubscribeAuth = auth.onAuthStateChanged(user => {
                setCurrentUser(user);
                if (user) setCurrentUid(user.uid);
            });
            return () => unsubscribeAuth();
        });
    }, []);

    useEffect(() => {
        // Effect 2: Fetch Data (Only if logged in)
        if (!currentUser) return;

        setIsLoading(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as UserProfile));
                setUsers(fetchedUsers);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching users:", error);
                setIsLoading(false);
                // Graceful error handling - avoid "Uncaught" noise if possible, but Firestore logs permissions anyway
                if (error.code === 'permission-denied') {
                    setError("You do not have permission to view users.");
                } else {
                    setError(error.message);
                }
            }
        );

        return () => unsubscribe();
    }, [currentUser]); // Re-run when auth state changes


    const handleCleanupMockData = async () => {
        if (!confirm("Delete all mock provider accounts?")) return;
        setIsCleanupLoading(true);
        const mockNames = ["Smith's Reliable Plumbing", "Connor Electric", "Ross Painting & Decor", "Sparkle Cleaning Co."];
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("businessName", "in", mockNames));
            const snapshot = await getDocs(q);
            await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "users", d.id))));
            alert(`Deleted ${snapshot.size} records.`);
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsCleanupLoading(false);
        }
    };

    // Document State for Review
    const [reviewDocs, setReviewDocs] = useState<{ govId?: string; passport?: string }>({});
    const [isFetchingDocs, setIsFetchingDocs] = useState(false);

    const handleOpenReview = async (user: UserProfile) => {
        setSelectedUser(user);
        setIsRejectMode(false);
        setRejectionReason("");
        setRejectedDocs([]);

        // Fetch Documents from Subcollection
        setIsFetchingDocs(true);
        setReviewDocs({}); // Reset

        try {
            const govIdSnap = await getDoc(doc(db, "users", user.uid, "documents", "govId"));
            const passportSnap = await getDoc(doc(db, "users", user.uid, "documents", "passport"));

            setReviewDocs({
                govId: govIdSnap.exists() ? govIdSnap.data().data : undefined,
                passport: passportSnap.exists() ? passportSnap.data().data : undefined
            });
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setIsFetchingDocs(false);
        }

        setIsReviewOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedUser) return;
        if (!confirm("Approve this user?")) return;

        setIsProcessing(true);
        try {
            let updates: any = {
                status: "approved",
                approvedAt: new Date().toISOString()
            };

            // Provider Logic (Keep existing)
            if (!selectedUser.customId && selectedUser.role === 'service_provider') {
                updates.customId = `SP-${Math.floor(100000 + Math.random() * 900000)}`;
            }

            // Provider Service Auto-populate
            if (selectedUser.role === 'service_provider' && selectedUser.applicationData?.services) {
                // Use the services array provided by the user
                updates.services = selectedUser.applicationData.services;

                // Fallback/Legacy support if array is empty but category exists (though we shouldn't need this with new flow)
                if (updates.services.length === 0 && selectedUser.applicationData.serviceCategory) {
                    updates.services = [selectedUser.applicationData.serviceCategory];
                }
            } else if (selectedUser.role === 'service_provider' && selectedUser.applicationData?.serviceCategory) {
                // Clean legacy fallback
                updates.services = [selectedUser.applicationData.serviceCategory];
            }


            await updateDoc(doc(db, "users", selectedUser.uid), updates);
            setIsReviewOpen(false);
            alert(`User Approved!`);
        } catch (err) {
            console.error(err);
            alert("Failed to approve user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedUser) return;
        if (!rejectionReason.trim()) {
            alert("Please provide a reason.");
            return;
        }

        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "users", selectedUser.uid), {
                status: "rejected",
                rejectionReason: rejectionReason,
                rejectedDocs: rejectedDocs,
                rejectedAt: new Date().toISOString()
            });
            setIsReviewOpen(false);
            alert("User Rejected & Notified.");
        } catch (err) {
            console.error(err);
            alert("Failed to reject user.");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRejectedDoc = (docType: string) => {
        setRejectedDocs(prev => prev.includes(docType) ? prev.filter(d => d !== docType) : [...prev, docType]);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            approved: "bg-green-100 text-green-800",
            pending_review: "bg-yellow-100 text-yellow-800 animate-pulse",
            rejected: "bg-red-100 text-red-800",
            restricted: "bg-red-900 text-white",
            unverified: "bg-gray-100 text-gray-800"
        };
        const icons = {
            approved: CheckCircle,
            pending_review: Clock,
            rejected: XCircle,
            restricted: Shield,
            unverified: Users
        };
        const Style = styles[status as keyof typeof styles] || styles.unverified;
        const Icon = icons[status as keyof typeof icons] || Users;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Style}`}>
                <Icon className="w-3 h-3 mr-1" /> {status.replace('_', ' ')}
            </span>
        );
    };

    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = user.fullName?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleDeleteClick = (user: UserProfile) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        setIsProcessing(true);
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, "users", userToDelete.uid));

            // Note: We cannot delete from Firebase Auth client-side without Admin SDK.

            setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            alert(`User ${userToDelete.fullName} has been deleted.`);
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    };


    if (error) return <div className="p-8 text-center text-red-600">Access Denied (Not Admin)</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <div className="flex gap-2">
                    <button onClick={handleCleanupMockData} disabled={isCleanupLoading} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-100">
                        {isCleanupLoading ? "Cleaning..." : "Clear Mocks"}
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <input
                    type="text" placeholder="Search users..."
                    className="w-full md:w-96 pl-4 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {["all", "service_provider", "user"].map(role => (
                        <button key={role} onClick={() => setRoleFilter(role)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${roleFilter === role ? "bg-white shadow-sm" : "text-gray-500"}`}>
                            {role.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{user.fullName}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </td>
                                <td className="p-4 capitalize">{user.role.replace('_', ' ')}</td>
                                <td className="p-4 uppercase text-xs">{getStatusBadge(user.status)}</td>
                                <td className="p-4 text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => handleDeleteClick(user)}
                                        title="Delete User"
                                        className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleOpenReview(user)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold">
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* REVIEW MODAL */}
            {isReviewOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50 items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Review Application</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span>{selectedUser.fullName}</span>
                                    <span className={`px-2 py-0.5 rounded textxs font-bold uppercase ${selectedUser.role === 'service_provider' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>
                                        {selectedUser.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setIsReviewOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* LEFT: PROFILE INFO */}
                                <div className="space-y-6">
                                    {selectedUser.role === 'service_provider' ? (
                                        // PROVIDER VIEW
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                                <Briefcase className="w-4 h-4 text-purple-600" /> Professional Profile
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between"><span className="text-gray-500">Business Name</span> <span className="font-medium">{selectedUser.businessName || 'N/A'}</span></div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Services</span>
                                                    <div className="font-medium text-right">
                                                        {selectedUser.applicationData?.services?.join(", ") || selectedUser.applicationData?.serviceCategory || 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between"><span className="text-gray-500">Experience</span> <span className="font-medium">{selectedUser.applicationData?.experience || '0'} Years</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Coverage</span> <span className="font-medium">{selectedUser.applicationData?.coverageArea || 'N/A'}</span></div>
                                            </div>
                                        </div>
                                    ) : (
                                        // USER VIEW
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                                <Users className="w-4 h-4 text-blue-600" /> Personal Details
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between"><span className="text-gray-500">Full Name</span> <span className="font-medium">{selectedUser.fullName}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Email</span> <span className="font-medium">{selectedUser.email}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Phone</span> <span className="font-medium">{selectedUser.phone}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Gender</span> <span className="font-medium">{selectedUser.gender || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">DOB</span> <span className="font-medium">{selectedUser.dob || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">Account</span> <span className="font-medium capitalize">{selectedUser.accountType?.replace('_', ' ') || '-'}</span></div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedUser.address && (
                                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                                <MapPin className="w-4 h-4 text-orange-600" /> Address
                                            </h3>
                                            <p className="text-sm text-gray-700">
                                                {selectedUser.address.street}<br />
                                                {selectedUser.address.city}, {selectedUser.address.state}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: DOCUMENTS */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                            <Shield className="w-4 h-4 text-green-600" /> Verification Documents
                                        </h3>

                                        <div className="space-y-6">
                                            {/* Gov ID */}
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Government ID</label>
                                                    {isRejectMode && <input type="checkbox" checked={rejectedDocs.includes('govId')} onChange={() => toggleRejectedDoc('govId')} className="w-4 h-4 text-red-600" />}
                                                </div>
                                                <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                                    {isFetchingDocs ? (
                                                        <div className="flex items-center justify-center h-full text-xs text-gray-500 animate-pulse">Loading Document...</div>
                                                    ) : (reviewDocs.govId || selectedUser.applicationData?.govIdUrl) ? (
                                                        <a href={reviewDocs.govId || selectedUser.applicationData?.govIdUrl} target="_blank" className="block w-full h-full">
                                                            <img src={reviewDocs.govId || selectedUser.applicationData?.govIdUrl} className="w-full h-full object-contain" />
                                                        </a>
                                                    ) : <div className="flex items-center justify-center h-full text-xs text-gray-400">Missing</div>}
                                                </div>
                                            </div>

                                            {/* Passport */}
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Passport Photo</label>
                                                    {isRejectMode && <input type="checkbox" checked={rejectedDocs.includes('passport')} onChange={() => toggleRejectedDoc('passport')} className="w-4 h-4 text-red-600" />}
                                                </div>
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                                    {isFetchingDocs ? (
                                                        <div className="flex items-center justify-center h-full text-xs text-gray-500 animate-pulse">Loading...</div>
                                                    ) : (reviewDocs.passport || selectedUser.applicationData?.passportUrl) ? (
                                                        <a href={reviewDocs.passport || selectedUser.applicationData?.passportUrl} target="_blank" className="block w-full h-full">
                                                            <img src={reviewDocs.passport || selectedUser.applicationData?.passportUrl} className="w-full h-full object-cover" />
                                                        </a>
                                                    ) : <div className="flex items-center justify-center h-full text-xs text-gray-400">Missing</div>}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isRejectMode && (
                                <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
                                    <label className="block text-sm font-bold text-red-800 mb-2">Rejection Reason</label>
                                    <textarea
                                        className="w-full p-3 border border-red-200 rounded-lg text-sm" rows={3}
                                        placeholder="Explain why..."
                                        value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            {isRejectMode ? (
                                <>
                                    <button onClick={() => setIsRejectMode(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                                    <button onClick={handleReject} disabled={isProcessing} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg shadow-sm">
                                        {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsRejectMode(true)} className="px-5 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg">Reject</button>
                                    <button onClick={handleApprove} disabled={isProcessing} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg shadow-lg">
                                        {isProcessing ? "Approving..." : "Approve User"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {userToDelete && (
                <DeleteUserModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDeleteUser}
                    user={userToDelete}
                    isProcessing={isProcessing}
                />
            )}
        </div>

    );
}
