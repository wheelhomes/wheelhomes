"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { CheckCircle, Search, Bug, Wrench, Loader2, User } from "lucide-react";

export default function AdminDebugPage() {
    // Tab State: 'debug' or 'approvals'
    const [tab, setTab] = useState<'debug' | 'approvals'>('approvals');

    // Debug State
    const [email, setEmail] = useState("");
    const [debugResult, setDebugResult] = useState<any>(null);
    const [loadingDebug, setLoadingDebug] = useState(false);

    // Approval State
    const [applications, setApplications] = useState<any[]>([]);
    const [loadingApps, setLoadingApps] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (tab === 'approvals') {
            fetchApplications();
        }
    }, [tab]);

    const fetchApplications = async () => {
        setLoadingApps(true);
        try {
            const q = query(collection(db, "user_applications"), where("status", "==", "pending"));
            const snap = await getDocs(q);
            setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching apps:", error);
        } finally {
            setLoadingApps(false);
        }
    };

    const handleApprove = async (app: any) => {
        setProcessingId(app.id);
        try {
            // 1. PRE-CHECK: Duplicate User in 'users' collection
            const qCheck = query(collection(db, "users"), where("email", "==", app.data.email));
            const existingUsers = await getDocs(qCheck);
            if (!existingUsers.empty) {
                alert(`STOP: A user with email ${app.data.email} already exists! ID: ${existingUsers.docs[0].id}`);
                setProcessingId(null);
                return;
            }

            // 1. Prepare User Data
            const userData: any = {
                ...app.data,
                role: 'service_provider',
                status: 'approved',
                approvedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                rating: 5.0,
                reviewCount: 0
            };

            // 2. AUTO-POPULATE SERVICES FOR INSTANT VISIBILITY
            if (app.data?.serviceCategory) {
                const rawCategory = app.data.serviceCategory;
                const normalizedServices = new Set<string>();

                normalizedServices.add(rawCategory);
                if (rawCategory === "Plumbing") normalizedServices.add("Plumber");
                if (rawCategory === "Plumber") normalizedServices.add("Plumbing");
                if (rawCategory === "Electrical") normalizedServices.add("Electrician");
                if (rawCategory === "Electrician") normalizedServices.add("Electrical");
                if (rawCategory === "Carpentry") normalizedServices.add("Carpenter");
                if (rawCategory === "Carpenter") normalizedServices.add("Carpentry");
                if (rawCategory === "Painting") normalizedServices.add("Painter");
                if (rawCategory === "Painter") normalizedServices.add("Painting");
                if (rawCategory === "Cleaning") normalizedServices.add("Cleaner");
                if (rawCategory === "Cleaner") normalizedServices.add("Cleaning");
                if (rawCategory === "Gardening") normalizedServices.add("Gardener");
                if (rawCategory === "Gardener") normalizedServices.add("Gardening");
                if (rawCategory === "HVAC / AC" || rawCategory === "HVAC") normalizedServices.add("AC Repair");

                userData.services = Array.from(normalizedServices);
            }

            // 3. Create User Document
            const userRef = doc(collection(db, "users"));
            await setDoc(userRef, userData);

            // 4. Mark Application as Approved
            await updateDoc(doc(db, "user_applications", app.id), {
                status: 'approved',
                approvedAt: new Date().toISOString(),
                createdUserId: userRef.id
            });

            alert(`Approved ${app.data?.fullName}! They are now visible in the marketplace.`);
            fetchApplications();

        } catch (error) {
            console.error("Approval failed", error);
            alert("Failed to approve.");
        } finally {
            setProcessingId(null);
        }
    };

    // --- Debug Functions ---

    const handleDebug = async () => {
        if (!email) return;
        setLoadingDebug(true);
        setDebugResult(null);
        try {
            const qUsers = query(collection(db, "users"), where("email", "==", email));
            const snapUsers = await getDocs(qUsers);
            const usersData = snapUsers.docs.map(d => ({ id: d.id, _collection: 'users', ...d.data() }));

            const qApps = query(collection(db, "user_applications"), where("data.email", "==", email));
            const snapApps = await getDocs(qApps);
            const appsData = snapApps.docs.map(d => ({ id: d.id, _collection: 'user_applications', ...d.data() }));

            setDebugResult({ users: usersData, applications: appsData });
        } catch (error: any) {
            console.error(error);
            setDebugResult({ error: error.message });
        } finally {
            setLoadingDebug(false);
        }
    };

    const fixUserServices = async (uid: string, correctServices: string[]) => {
        try {
            await updateDoc(doc(db, "users", uid), {
                services: correctServices,
                role: 'service_provider',
                status: 'approved'
            });
            alert("Fixed! Services updated to: " + correctServices.join(", "));
            handleDebug();
        } catch (e) {
            alert("Fix failed: " + e);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bug className="w-8 h-8 text-purple-600" />
                Admin Utility
            </h1>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setTab('approvals')}
                    className={`px-4 py-2 font-bold ${tab === 'approvals' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}
                >
                    Pending Approvals
                </button>
                <button
                    onClick={() => setTab('debug')}
                    className={`px-4 py-2 font-bold ${tab === 'debug' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}
                >
                    Debugger
                </button>
            </div>

            {/* TAB: APPROVALS */}
            {tab === 'approvals' && (
                <div>
                    {loadingApps ? (
                        <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div>
                    ) : applications.length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 rounded-xl">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="font-bold text-gray-900">All Caught Up!</h3>
                            <p className="text-gray-500">No pending applications.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {applications.map(app => (
                                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                        <User className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{app.data?.fullName}</h3>
                                        <p className="text-sm text-gray-500">{app.data?.businessName}</p>
                                        <div className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                                            Category: {app.data?.serviceCategory}
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => handleApprove(app)}
                                            disabled={!!processingId}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-bold shadow-sm"
                                        >
                                            {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Approve & Publish
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: DEBUG */}
            {tab === 'debug' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex gap-4">
                        <input
                            className="flex-1 p-3 border rounded-xl"
                            placeholder="Enter provider email (e.g. djohnvpn@gmail.com)"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <button
                            onClick={handleDebug}
                            className="px-6 bg-gray-900 text-white font-bold rounded-xl flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" /> Debug
                        </button>
                    </div>

                    {loadingDebug && <div>Scanning database...</div>}

                    {debugResult && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">User Collection Record</h2>
                                {debugResult.users.length === 0 ? (
                                    <p className="text-red-500 font-bold">❌ NOT FOUND in 'users' collection</p>
                                ) : (
                                    debugResult.users.map((u: any) => (
                                        <div key={u.id} className="space-y-2">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div><span className="font-bold">ID:</span> {u.id}</div>
                                                <div><span className="font-bold">Role:</span> {u.role}</div>
                                                <div><span className="font-bold">Status:</span> {u.status}</div>
                                                <div className={u.services && u.services.length > 0 ? "text-green-600" : "text-red-600 font-bold"}>
                                                    <span className="font-bold text-gray-900">Services:</span> {JSON.stringify(u.services)}
                                                </div>
                                            </div>

                                            {(!u.services || u.services.length === 0) && (
                                                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                    <p className="text-sm font-bold text-yellow-800 mb-2">⚠️ Issue Detected: Missing Services Array</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => fixUserServices(u.id, ["Plumbing", "Plumber"])}
                                                            className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1"
                                                        >
                                                            <Wrench className="w-3 h-3" /> Force add "Plumbing"
                                                        </button>
                                                        <button
                                                            onClick={() => fixUserServices(u.id, ["Electrical", "Electrician"])}
                                                            className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded flex items-center gap-1"
                                                        >
                                                            <Wrench className="w-3 h-3" /> Force add "Electrical"
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
