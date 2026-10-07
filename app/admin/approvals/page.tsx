"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, getDoc, addDoc, doc, setDoc, updateDoc, onSnapshot, orderBy } from "firebase/firestore";
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Search,
    Filter,
    Briefcase,
    Phone,
    Mail,
    MapPin,
    Eye,
    ExternalLink,
    ShieldCheck,
    ChevronRight,
    User,
    Sparkles,
    RefreshCw,
    Wrench,
    FileText,
    Image as ImageIcon,
    ThumbsUp,
    ThumbsDown,
    AlertTriangle,
    X,
    Building,
    Check,
    Layers,
    BadgeCheck,
    Calendar,
    ArrowUpRight,
    Smartphone,
    Globe
} from "lucide-react";
import { sendRejectionEmailAction, sendApprovalEmailAction } from "@/app/actions/email";

interface ApplicationRecord {

    id: string;
    source: 'web' | 'mobile';
    rawCollection: 'user_applications' | 'users';
    submittedAt?: string;
    status: 'pending' | 'approved' | 'rejected' | string;
    rejectionReason?: string | null;
    approvedAt?: string;
    createdUserId?: string;
    data: {
        fullName?: string;
        businessName?: string;
        email?: string;
        phone?: string;
        services?: string[];
        serviceCategory?: string;
        description?: string;
        location?: string;
        passportPhoto?: string | null;
        govIdPhoto?: string | null;
        idType?: string;
        jobPhotos?: string[];
        role?: string;
        state?: string;
        city?: string;
        address?: string;
        experienceYears?: string | number;
        rating?: number;
        reviewCount?: number;
    };
}

export default function AdminApprovalsPage() {
    // Navigation / View Tabs
    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState("");

    // Data State
    const [applications, setApplications] = useState<ApplicationRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal State: Review Dossier
    const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
    const [isDossierOpen, setIsDossierOpen] = useState(false);

    // Modal State: Rejection / Request Changes
    const [appToReject, setAppToReject] = useState<ApplicationRecord | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [quickReason, setQuickReason] = useState("");

    // Lightbox State for Image Zoom
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Diagnostics / Sync Panel toggle
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [diagEmail, setDiagEmail] = useState("");
    const [diagResult, setDiagResult] = useState<any>(null);
    const [loadingDiag, setLoadingDiag] = useState(false);

    // Real-time listener for applications (Unified Web & Mobile)
    useEffect(() => {
        setIsLoading(true);
        let webList: ApplicationRecord[] = [];
        let mobileList: ApplicationRecord[] = [];

        const mergeAndSetApps = () => {
            // Deduplicate by email if exists in both
            const emailSet = new Set<string>();
            const combined: ApplicationRecord[] = [];

            // Add web apps first
            for (const app of webList) {
                if (app.data?.email) emailSet.add(app.data.email.toLowerCase());
                combined.push(app);
            }

            // Add mobile apps if not already present or if distinct
            for (const app of mobileList) {
                const em = (app.data?.email || '').toLowerCase();
                if (!em || !emailSet.has(em)) {
                    combined.push(app);
                }
            }

            // Sort newest first
            combined.sort((a, b) => {
                const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return dateB - dateA;
            });

            setApplications(combined);
            setIsLoading(false);
            setIsRefreshing(false);
        };

        // 1. Web Applications Listener ('user_applications')
        const appsRef = collection(db, "user_applications");
        const unsubWeb = onSnapshot(appsRef, (snapshot) => {
            webList = snapshot.docs.map(doc => {
                const raw = doc.data();
                const payload = raw.data || {};
                const resolvedEmail = (payload.email || raw.email || raw.emailAddress || "").trim();
                const resolvedName = payload.fullName || raw.fullName || raw.displayName || "Service Provider";
                return {
                    id: doc.id,
                    source: 'web' as const,
                    rawCollection: 'user_applications' as const,
                    submittedAt: raw.submittedAt || raw.createdAt,
                    status: (raw.status || 'pending').toLowerCase(),
                    rejectionReason: raw.rejectionReason || null,
                    approvedAt: raw.approvedAt,
                    createdUserId: raw.createdUserId,
                    data: {
                        ...payload,
                        fullName: resolvedName,
                        businessName: payload.businessName || raw.businessName || resolvedName,
                        email: resolvedEmail,
                        phone: payload.phone || raw.phone || "",
                        services: payload.services || raw.services || [],
                        serviceCategory: payload.serviceCategory || raw.serviceCategory || (raw.services && raw.services[0]) || (payload.services && payload.services[0]),
                        description: payload.description || raw.description || "",
                        location: payload.location || raw.location || "",
                        passportPhoto: payload.passportPhoto || raw.passportPhoto || null,
                        jobPhotos: payload.jobPhotos || raw.jobPhotos || [],
                        role: payload.role || raw.role || 'service_provider'
                    }
                };
            });
            mergeAndSetApps();
        }, (error) => {
            console.error("Error fetching web applications:", error);
            setIsLoading(false);
        });

        // 2. Mobile Service Provider Registrations Listener ('users' role == 'service_provider')
        const mobileProvidersQuery = query(collection(db, "users"), where("role", "==", "service_provider"));
        const unsubMobile = onSnapshot(mobileProvidersQuery, (snapshot) => {
            mobileList = snapshot.docs
                .filter(doc => {
                    const u = doc.data();
                    const rawStatus = (u.status || '').toLowerCase();
                    // Do NOT show users who are still in onboarding (unverified).
                    // Only show applications that have been submitted (pending_review)
                    // or already reviewed (approved, rejected, restricted).
                    return rawStatus === 'pending_review' || rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'restricted';
                })
                .map(doc => {
                    const u = doc.data();
                    const rawStatus = (u.status || 'pending_review').toLowerCase();
                    let normalizedStatus = rawStatus;
                    if (rawStatus === 'pending_review') {
                        normalizedStatus = 'pending';
                    }

                    const appData = u.applicationData || {};
                    const resolvedEmail = (u.email || appData.email || u.mail || "").trim();

                    return {
                        id: doc.id,
                        source: 'mobile' as const,
                        rawCollection: 'users' as const,
                        submittedAt: appData.submittedAt || u.createdAt || new Date().toISOString(),
                        status: normalizedStatus,
                        rejectionReason: u.rejectionReason || null,
                        approvedAt: u.approvedAt,
                        createdUserId: doc.id,
                        data: {
                            fullName: u.fullName || u.displayName || "Mobile Provider",
                            businessName: u.businessName || u.fullName,
                            email: resolvedEmail,
                            phone: u.phone || "",
                            services: u.services || (u.serviceCategory ? [u.serviceCategory] : []) || (appData.services || (appData.serviceCategory ? [appData.serviceCategory] : [])),
                            serviceCategory: u.serviceCategory || appData.serviceCategory || (u.services && u.services[0]) || "General Maintenance",
                            description: u.bio || u.description || appData.bio || appData.description || "",
                            location: u.city ? `${u.city}, ${u.state || ''}` : (u.address || u.location || "Nigeria"),
                            passportPhoto: appData.passportUrl || u.passportPhoto || u.photoURL || null,
                            govIdPhoto: appData.govIdUrl || null,
                            idType: appData.idType || "Government Issued ID",
                            jobPhotos: u.jobPhotos || appData.jobPhotos || [],
                            role: 'service_provider',
                            rating: u.rating || 5.0,
                            reviewCount: u.reviewCount || 0
                        }
                    };
                });
            mergeAndSetApps();
        }, (err) => {
            console.warn("Mobile providers listener notice:", err.message);
        });


        return () => {
            unsubWeb();
            unsubMobile();
        };
    }, []);

    // Manual refresh action
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            const snapWeb = await getDocs(query(collection(db, "user_applications")));
            const webList: ApplicationRecord[] = snapWeb.docs.map(d => {
                const raw = d.data();
                const payload = raw.data || {};
                const resolvedEmail = (payload.email || raw.email || raw.emailAddress || "").trim();
                const resolvedName = payload.fullName || raw.fullName || raw.displayName || "Service Provider";
                return {
                    id: d.id,
                    source: 'web' as const,
                    rawCollection: 'user_applications' as const,
                    submittedAt: raw.submittedAt || raw.createdAt,
                    status: (raw.status || 'pending').toLowerCase(),
                    rejectionReason: raw.rejectionReason || null,
                    approvedAt: raw.approvedAt,
                    createdUserId: raw.createdUserId,
                    data: {
                        ...payload,
                        fullName: resolvedName,
                        businessName: payload.businessName || raw.businessName || resolvedName,
                        email: resolvedEmail,
                        phone: payload.phone || raw.phone || "",
                        services: payload.services || raw.services || [],
                        serviceCategory: payload.serviceCategory || raw.serviceCategory || (raw.services && raw.services[0]) || (payload.services && payload.services[0]),
                        description: payload.description || raw.description || "",
                        location: payload.location || raw.location || "",
                        passportPhoto: payload.passportPhoto || raw.passportPhoto || null,
                        jobPhotos: payload.jobPhotos || raw.jobPhotos || [],
                        role: payload.role || raw.role || 'service_provider'
                    }
                };
            });

            const snapMobile = await getDocs(query(collection(db, "users"), where("role", "==", "service_provider")));
            const emailSet = new Set(webList.map(w => (w.data?.email || '').toLowerCase()));
            const mobileList: ApplicationRecord[] = [];

            for (const d of snapMobile.docs) {
                const u = d.data();
                const em = (u.email || '').toLowerCase();
                if (em && emailSet.has(em)) continue;

                const rawStatus = (u.status || '').toLowerCase();
                // Exclude users still in onboarding (unverified)
                if (rawStatus === 'unverified') continue;
                if (!['pending_review', 'approved', 'rejected', 'restricted'].includes(rawStatus)) continue;

                let normalizedStatus = rawStatus;
                if (rawStatus === 'pending_review') {
                    normalizedStatus = 'pending';
                }
                const appData = u.applicationData || {};
                const resolvedEmail = (u.email || appData.email || u.mail || "").trim();

                mobileList.push({
                    id: d.id,
                    source: 'mobile' as const,
                    rawCollection: 'users' as const,
                    submittedAt: appData.submittedAt || u.createdAt || new Date().toISOString(),
                    status: normalizedStatus,
                    rejectionReason: u.rejectionReason || null,
                    approvedAt: u.approvedAt,
                    createdUserId: d.id,
                    data: {
                        fullName: u.fullName || u.displayName || "Mobile Provider",
                        businessName: u.businessName || u.fullName,
                        email: resolvedEmail,
                        phone: u.phone || "",
                        services: u.services || (u.serviceCategory ? [u.serviceCategory] : []) || (appData.services || (appData.serviceCategory ? [appData.serviceCategory] : [])),
                        serviceCategory: u.serviceCategory || appData.serviceCategory || (u.services && u.services[0]) || "General Maintenance",
                        description: u.bio || u.description || appData.bio || appData.description || "",
                        location: u.city ? `${u.city}, ${u.state || ''}` : (u.address || u.location || "Nigeria"),
                        passportPhoto: appData.passportUrl || u.passportPhoto || u.photoURL || null,
                        govIdPhoto: appData.govIdUrl || null,
                        idType: appData.idType || "Government Issued ID",
                        jobPhotos: u.jobPhotos || appData.jobPhotos || [],
                        role: 'service_provider',
                        rating: u.rating || 5.0,
                        reviewCount: u.reviewCount || 0
                    }
                });
            }

            const combined = [...webList, ...mobileList];
            combined.sort((a, b) => {
                const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return dateB - dateA;
            });
            setApplications(combined);
        } catch (e) {
            console.error("Manual refresh error:", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Metric Calculations
    const pendingCount = applications.filter(a => a.status === 'pending').length;
    const approvedCount = applications.filter(a => a.status === 'approved').length;
    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

    // Filter Logic
    const filteredApps = applications.filter(app => {
        // Status filter
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;

        // Category filter
        if (categoryFilter !== 'all') {
            const cat = (app.data?.serviceCategory || '').toLowerCase();
            const services = (app.data?.services || []).map(s => s.toLowerCase());
            const target = categoryFilter.toLowerCase();
            if (cat !== target && !services.includes(target)) return false;
        }

        // Search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            const name = (app.data?.fullName || '').toLowerCase();
            const biz = (app.data?.businessName || '').toLowerCase();
            const mail = (app.data?.email || '').toLowerCase();
            const ph = (app.data?.phone || '').toLowerCase();
            const loc = (app.data?.location || '').toLowerCase();
            const cat = (app.data?.serviceCategory || '').toLowerCase();

            return name.includes(term) || biz.includes(term) || mail.includes(term) || ph.includes(term) || loc.includes(term) || cat.includes(term);
        }

        return true;
    });

    // Handle One-Click Approve & Publish
    const handleApprove = async (app: ApplicationRecord) => {
        setProcessingId(app.id);
        try {
            const nowIso = new Date().toISOString();

            // Normalise Services for instant marketplace visibility
            const rawCategory = app.data?.serviceCategory || (app.data?.services && app.data.services[0]) || "General Maintenance";
            const normalizedServices = new Set<string>(app.data?.services || []);
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

            // Resolve email address with comprehensive fallbacks
            let candidateEmail = (app.data?.email || (app as any).email || "").trim();
            const candidateName = app.data?.fullName || app.data?.businessName || "Service Provider";

            if (!candidateEmail && app.id) {
                try {
                    const snap = await getDoc(doc(db, app.rawCollection, app.id));
                    if (snap.exists()) {
                        const d = snap.data();
                        candidateEmail = (d.email || d.data?.email || d.applicationData?.email || "").trim();
                    }
                } catch (e) {
                    console.warn("[Admin Approvals] Could not fetch doc for email fallback:", e);
                }
            }

            console.log(`[Admin Approvals] Approving provider ${candidateName} (ID: ${app.id}, email: "${candidateEmail}")`);

            // Trigger approval email notification asynchronously
            if (candidateEmail) {
                console.log(`[Admin Approvals] Dispatching approval email to "${candidateEmail}"...`);
                sendApprovalEmailAction(candidateEmail, candidateName)
                    .then(res => {
                        console.log(`[Admin Approvals] ✅ Approval email result for ${candidateEmail}:`, res);
                    })
                    .catch(err => {
                        console.error("[Admin Approvals] ❌ Failed to dispatch approval email:", err);
                    });
            } else {
                console.warn("[Admin Approvals] ⚠️ Cannot send approval email: No recipient email address could be resolved for this provider.");
            }

            // Branch 1: If from mobile ('users' collection)
            if (app.rawCollection === 'users') {
                const userUpdate: any = {
                    status: 'approved',
                    approvedAt: nowIso,
                    rejectionReason: null,
                    services: Array.from(normalizedServices),
                    serviceCategory: rawCategory,
                    rating: app.data?.rating || 5.0,
                    reviewCount: app.data?.reviewCount || 0,
                    updatedAt: nowIso
                };

                await updateDoc(doc(db, "users", app.id), userUpdate);

                // Dispatch in-app notification
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: app.id,
                        recipientId: app.id,
                        title: "Account Approved! 🎉",
                        message: "Your Wheelhomes Service Provider account has been approved and is now active.",
                        body: "Your Wheelhomes Service Provider account has been approved and is now active.",
                        type: "success",
                        read: false,
                        isRead: false,
                        createdAt: nowIso,
                        link: "/dashboard"
                    });
                } catch (notifErr) {
                    console.warn("[Admin Approvals] Notice: In-app notification creation skipped:", notifErr);
                }

                if (selectedApp?.id === app.id) {
                    setIsDossierOpen(false);
                    setSelectedApp(null);
                }
                return;
            }

            // Branch 2: If from web ('user_applications' collection)
            const appEmail = candidateEmail || app.data?.email || "";
            let existingUserId: string | null = null;
            if (appEmail) {
                const qCheck = query(collection(db, "users"), where("email", "==", appEmail));
                const existingSnap = await getDocs(qCheck);
                if (!existingSnap.empty) {
                    existingUserId = existingSnap.docs[0].id;
                }
            }

            const userData: any = {
                fullName: app.data?.fullName || "Verified Provider",
                businessName: app.data?.businessName || app.data?.fullName || "Professional Service",
                email: appEmail,
                phone: app.data?.phone || "",
                role: 'service_provider',
                status: 'approved',
                services: Array.from(normalizedServices),
                serviceCategory: rawCategory,
                description: app.data?.description || "",
                location: app.data?.location || "Nigeria",
                passportPhoto: app.data?.passportPhoto || null,
                jobPhotos: app.data?.jobPhotos || [],
                rating: 5.0,
                reviewCount: 0,
                completedJobs: 0,
                approvedAt: nowIso,
                updatedAt: nowIso
            };

            let finalUserId = existingUserId;

            if (existingUserId) {
                await updateDoc(doc(db, "users", existingUserId), userData);
            } else {
                userData.createdAt = nowIso;
                const newUserRef = doc(collection(db, "users"));
                await setDoc(newUserRef, userData);
                finalUserId = newUserRef.id;
            }

            // Update user_applications record
            await updateDoc(doc(db, "user_applications", app.id), {
                status: 'approved',
                approvedAt: nowIso,
                createdUserId: finalUserId,
                rejectionReason: null
            });

            // Dispatch in-app notification for the newly approved or existing user
            if (finalUserId) {
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: finalUserId,
                        recipientId: finalUserId,
                        title: "Account Approved! 🎉",
                        message: "Your Wheelhomes Service Provider account has been approved and is now active.",
                        body: "Your Wheelhomes Service Provider account has been approved and is now active.",
                        type: "success",
                        read: false,
                        isRead: false,
                        createdAt: nowIso,
                        link: "/dashboard"
                    });
                } catch (notifErr) {
                    console.warn("[Admin Approvals] Notice: In-app notification creation skipped:", notifErr);
                }
            }

            if (selectedApp?.id === app.id) {
                setIsDossierOpen(false);
                setSelectedApp(null);
            }

        } catch (error: any) {
            console.error("Approval error:", error);
            alert("Approval action failed: " + (error.message || "Unknown error"));
        } finally {
            setProcessingId(null);
        }
    };

    // Handle Rejection / Request Changes
    const handleRejectSubmit = async () => {
        if (!appToReject) return;
        const finalReason = quickReason ? `${quickReason}${rejectionReason ? ` - ${rejectionReason}` : ''}` : rejectionReason;
        if (!finalReason.trim()) {
            alert("Please specify a reason or select a preset tag.");
            return;
        }

        setProcessingId(appToReject.id);
        try {
            const nowIso = new Date().toISOString();

            // Resolve email for rejection
            let candidateEmail = (appToReject.data?.email || (appToReject as any).email || "").trim();
            const candidateName = appToReject.data?.fullName || appToReject.data?.businessName || "Service Provider";

            if (!candidateEmail && appToReject.id) {
                try {
                    const snap = await getDoc(doc(db, appToReject.rawCollection, appToReject.id));
                    if (snap.exists()) {
                        const d = snap.data();
                        candidateEmail = (d.email || d.data?.email || d.applicationData?.email || "").trim();
                    }
                } catch (e) {
                    console.warn("[Admin Reject] Could not fetch doc for email fallback:", e);
                }
            }

            console.log(`[Admin Reject] Sending rejection email → to: "${candidateEmail}", name: "${candidateName}", reason: "${finalReason.trim()}"`);
            if (candidateEmail) {
                sendRejectionEmailAction(candidateEmail, candidateName, finalReason.trim())
                    .then(res => console.log("[Admin Reject] Email action result:", res))
                    .catch(err => console.warn("Notice: Email notification skipped or pending RESEND_API_KEY setup:", err));
            }

            if (appToReject.rawCollection === 'users') {
                await updateDoc(doc(db, "users", appToReject.id), {
                    status: 'rejected',
                    rejectionReason: finalReason.trim(),
                    rejectedAt: nowIso
                });

                // In-app notification for rejected user
                try {
                    await addDoc(collection(db, "notifications"), {
                        userId: appToReject.id,
                        recipientId: appToReject.id,
                        title: "Document Verification Update ⚠️",
                        message: `Your verification documents require changes: ${finalReason.trim()}`,
                        body: `Your verification documents require changes: ${finalReason.trim()}`,
                        type: "warning",
                        read: false,
                        isRead: false,
                        createdAt: nowIso,
                        link: "/settings/verification"
                    });
                } catch (notifErr) {
                    console.warn("[Admin Reject] Notice: In-app notification creation skipped:", notifErr);
                }
            } else {
                await updateDoc(doc(db, "user_applications", appToReject.id), {
                    status: 'rejected',
                    rejectionReason: finalReason.trim(),
                    rejectedAt: nowIso
                });
            }

            setIsRejectModalOpen(false);
            setAppToReject(null);
            setRejectionReason("");
            setQuickReason("");

            if (selectedApp?.id === appToReject.id) {
                setIsDossierOpen(false);
                setSelectedApp(null);
            }
        } catch (e: any) {
            console.error("Rejection error:", e);
            alert("Failed to submit rejection: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    // Diagnostics Handler
    const handleRunDiagnostics = async () => {
        if (!diagEmail.trim()) return;
        setLoadingDiag(true);
        setDiagResult(null);
        try {
            const qUsers = query(collection(db, "users"), where("email", "==", diagEmail.trim()));
            const snapUsers = await getDocs(qUsers);
            const users = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));

            const qApps = query(collection(db, "user_applications"), where("data.email", "==", diagEmail.trim()));
            const snapApps = await getDocs(qApps);
            const apps = snapApps.docs.map(d => ({ id: d.id, ...d.data() }));

            setDiagResult({ users, apps });
        } catch (err: any) {
            console.error(err);
            setDiagResult({ error: err.message });
        } finally {
            setLoadingDiag(false);
        }
    };

    // Available categories for filtering
    const categories = [
        "All",
        "Plumbing",
        "Electrical",
        "HVAC",
        "Carpentry",
        "Painting",
        "Cleaning",
        "Gardening"
    ];

    return (
        <div className="space-y-6 font-sans">
            {/* Top Executive Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Verification & Approvals</h1>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Live Verification Active
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Vetting portal for contractor background checks, professional skillsets, and credentials
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2 border border-slate-200 cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Sync Records
                            </button>

                            <button
                                onClick={() => setShowDiagnostics(!showDiagnostics)}
                                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${showDiagnostics ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                                {showDiagnostics ? 'Hide Diagnostics' : 'Provider Diagnostics'}
                            </button>
                        </div>
                    </div>

                    {/* Metric Counter Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Review</span>
                                <h3 className="text-2xl font-extrabold text-amber-950 mt-0.5">{pendingCount}</h3>
                                <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3" /> Awaiting compliance check
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Approved Pros</span>
                                <h3 className="text-2xl font-extrabold text-emerald-950 mt-0.5">{approvedCount}</h3>
                                <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="w-3 h-3" /> Published to Marketplace
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                <BadgeCheck className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Changes Requested</span>
                                <h3 className="text-2xl font-extrabold text-rose-950 mt-0.5">{rejectedCount}</h3>
                                <p className="text-[11px] text-rose-700 mt-0.5 flex items-center gap-1 font-medium">
                                    <AlertCircle className="w-3 h-3" /> Resubmissions pending
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                                <XCircle className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Review Turnaround</span>
                                <h3 className="text-2xl font-extrabold text-blue-950 mt-0.5">&lt; 24 Hrs</h3>
                                <p className="text-[11px] text-blue-700 mt-0.5 flex items-center gap-1 font-medium">
                                    <Sparkles className="w-3 h-3 text-blue-600" /> Platform quality standard
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
            </div>

            {/* Optional Collapsible Diagnostics Drawer */}
            {showDiagnostics && (
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-blue-400" />
                            <h3 className="font-bold text-sm text-slate-100">Provider Synchronization & Integrity Diagnostics</h3>
                        </div>
                        <button
                            onClick={() => setShowDiagnostics(false)}
                            className="text-slate-400 hover:text-white text-xs p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            placeholder="Enter provider email address (e.g. john@example.com)"
                            value={diagEmail}
                            onChange={(e) => setDiagEmail(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleRunDiagnostics}
                            disabled={loadingDiag || !diagEmail.trim()}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Search className="w-3.5 h-3.5" />
                            {loadingDiag ? 'Analyzing Firestore...' : 'Run Diagnostics'}
                        </button>
                    </div>

                    {diagResult && (
                        <div className="mt-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-mono max-h-60 overflow-y-auto">
                            <div className="text-emerald-400 font-bold mb-2">Diagnostic Scan Results:</div>
                            <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">
                                {JSON.stringify(diagResult, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Search & Filter Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Pending Review
                            {pendingCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setStatusFilter('approved')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${statusFilter === 'approved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Approved
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700">
                                {approvedCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            All ({applications.length})
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by candidate name, business, phone, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                        <Filter className="w-3 h-3" /> Trade:
                    </span>
                    {categories.map((cat) => {
                        const isSelected = categoryFilter.toLowerCase() === cat.toLowerCase();
                        return (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat === "All" ? "all" : cat)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${isSelected ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>

                {/* Application Cards List */}
                {isLoading ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 animate-spin">
                            <RefreshCw className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">Loading applications repository...</h3>
                        <p className="text-xs text-slate-500 mt-1">Connecting to Firestore real-time snapshot channel</p>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">
                            {statusFilter === 'pending' ? 'All Applications Cleared!' : 'No Matching Applications'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                            {statusFilter === 'pending'
                                ? 'There are no contractor applications awaiting verification at this time. New submissions will appear here in real-time.'
                                : 'No records match your selected trade category and search filters. Try clearing filters to see all records.'}
                        </p>
                        {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'pending') && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setCategoryFilter("all");
                                    setStatusFilter("pending");
                                }}
                                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Reset All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApps.map((app) => {
                            const isPending = app.status === 'pending';
                            const isApproved = app.status === 'approved';
                            const isRejected = app.status === 'rejected';
                            const isCurrentProcessing = processingId === app.id;

                            const passport = app.data?.passportPhoto;
                            const jobPhotos = app.data?.jobPhotos || [];

                            return (
                                <div
                                    key={app.id}
                                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md p-5 sm:p-6 ${isPending ? 'border-amber-200/80 ring-1 ring-amber-100/50' : 'border-slate-200'}`}
                                >
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                                        {/* Candidate Profile Details */}
                                        <div className="flex items-start gap-4 flex-1">
                                            {/* Avatar / Passport Thumbnail */}
                                            <div className="relative shrink-0">
                                                {passport ? (
                                                    <div
                                                        onClick={() => setLightboxImage(passport)}
                                                        className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-xs cursor-pointer group hover:border-blue-500 transition-all"
                                                    >
                                                        <img
                                                            src={passport}
                                                            alt={app.data?.fullName || "Candidate"}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xl shadow-xs">
                                                        {(app.data?.fullName || "P").charAt(0).toUpperCase()}
                                                    </div>
                                                )}

                                                {isApproved && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details & Tags */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                                                        {app.data?.fullName || "Unnamed Applicant"}
                                                    </h3>

                                                    {/* Status Badge */}
                                                    {isPending && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                            Pending Verification
                                                        </span>
                                                    )}
                                                    {isApproved && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Approved & Active
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                            <XCircle className="w-3 h-3 text-rose-600" />
                                                            Changes Requested
                                                        </span>
                                                    )}

                                                    {/* Service Trade Badge */}
                                                    {app.data?.serviceCategory && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                                                            <Briefcase className="w-3 h-3 text-blue-500" />
                                                            {app.data.serviceCategory}
                                                        </span>
                                                    )}

                                                    {/* Source Platform Badge */}
                                                    {app.source === 'mobile' ? (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                                            <Smartphone className="w-3 h-3 text-purple-600" />
                                                            Mobile App
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                                            <Globe className="w-3 h-3 text-slate-500" />
                                                            Web App
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Business Name & Location */}
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                                                    {app.data?.businessName && (
                                                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                                                            <Building className="w-3 h-3 text-slate-400" />
                                                            {app.data.businessName}
                                                        </span>
                                                    )}
                                                    {app.data?.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            {app.data.location}
                                                        </span>
                                                    )}
                                                    {app.submittedAt && (
                                                        <span className="flex items-center gap-1 text-slate-400">
                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                            Applied {new Date(app.submittedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Contact & Services Pills */}
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    {app.data?.phone && (
                                                        <a
                                                            href={`tel:${app.data.phone}`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                                                        >
                                                            <Phone className="w-3 h-3 text-slate-500" />
                                                            {app.data.phone}
                                                        </a>
                                                    )}
                                                    {app.data?.email && (
                                                        <a
                                                            href={`mailto:${app.data.email}`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                                                        >
                                                            <Mail className="w-3 h-3 text-slate-500" />
                                                            {app.data.email}
                                                        </a>
                                                    )}

                                                    {/* Specific Skill Tags */}
                                                    {(app.data?.services || []).slice(0, 3).map((srv, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px]"
                                                        >
                                                            {srv}
                                                        </span>
                                                    ))}
                                                    {(app.data?.services || []).length > 3 && (
                                                        <span className="text-[11px] font-bold text-slate-400">
                                                            +{app.data!.services!.length - 3} more
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Rejection notice if present */}
                                                {isRejected && app.rejectionReason && (
                                                    <div className="mt-3 p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="font-bold">Feedback Sent to Applicant:</span> {app.rejectionReason}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Proof Photo Thumbnails Preview */}
                                        {jobPhotos.length > 0 && (
                                            <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                                <div className="flex -space-x-2 overflow-hidden p-1">
                                                    {jobPhotos.slice(0, 3).map((photo, i) => (
                                                        <img
                                                            key={i}
                                                            src={photo}
                                                            alt="Proof sample"
                                                            onClick={() => setLightboxImage(photo)}
                                                            className="inline-block h-11 w-11 rounded-xl ring-2 ring-white object-cover cursor-pointer hover:scale-110 transition-transform"
                                                        />
                                                    ))}
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-600 pr-2">
                                                    {jobPhotos.length} Proof Photo{jobPhotos.length > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end shrink-0">
                                            {/* View Full Dossier */}
                                            <button
                                                onClick={() => {
                                                    setSelectedApp(app);
                                                    setIsDossierOpen(true);
                                                }}
                                                className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                View Dossier
                                            </button>

                                            {/* If Pending: Request Changes Button */}
                                            {isPending && (
                                                <button
                                                    onClick={() => {
                                                        setAppToReject(app);
                                                        setIsRejectModalOpen(true);
                                                    }}
                                                    disabled={isCurrentProcessing}
                                                    className="px-3.5 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                    Reject
                                                </button>
                                            )}

                                            {/* Approve Button */}
                                            {isPending && (
                                                <button
                                                    onClick={() => handleApprove(app)}
                                                    disabled={isCurrentProcessing}
                                                    className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                                >
                                                    {isCurrentProcessing ? (
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <BadgeCheck className="w-3.5 h-3.5" />
                                                    )}
                                                    Approve & Publish
                                                </button>
                                            )}

                                            {/* Re-activate button if rejected */}
                                            {isRejected && (
                                                <button
                                                    onClick={() => handleApprove(app)}
                                                    disabled={isCurrentProcessing}
                                                    className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Re-Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FULL APPLICANT DOSSIER MODAL */}
            {isDossierOpen && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Candidate Dossier</h3>
                                    <p className="text-xs text-slate-500">Application Reference ID: {selectedApp.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDossierOpen(false);
                                    setSelectedApp(null);
                                }}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Personal Summary Banner */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-slate-50 border border-blue-100/80">
                                {selectedApp.data?.passportPhoto ? (
                                    <img
                                        src={selectedApp.data.passportPhoto}
                                        alt="Passport"
                                        onClick={() => setLightboxImage(selectedApp.data.passportPhoto!)}
                                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm cursor-pointer"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
                                        {(selectedApp.data?.fullName || "P").charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 text-xl">{selectedApp.data?.fullName}</h4>
                                    <p className="text-xs font-semibold text-blue-700">{selectedApp.data?.businessName || "Independent Contractor"}</p>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {selectedApp.data?.phone || "N/A"}</span>
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {selectedApp.data?.email || "N/A"}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {selectedApp.data?.location || "N/A"}</span>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700 shadow-xs">
                                        {selectedApp.status}
                                    </span>
                                </div>
                            </div>

                            {/* Bio / Work Description */}
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Trade Bio & Experience</h5>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                                    {selectedApp.data?.description || "No trade description provided by applicant."}
                                </div>
                            </div>

                            {/* Service Offerings */}
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Primary Trade & Capabilities</h5>
                                <div className="flex flex-wrap gap-2">
                                    {selectedApp.data?.serviceCategory && (
                                        <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            Category: {selectedApp.data.serviceCategory}
                                        </span>
                                    )}
                                    {(selectedApp.data?.services || []).map((srv, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-medium text-xs"
                                        >
                                            {srv}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Government Verification & ID Documents (Mobile KYC Submissions) */}
                            {selectedApp.data?.govIdPhoto && (
                                <div>
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Government Verification Document ({selectedApp.data?.idType || "ID Document"})
                                    </h5>
                                    <div
                                        onClick={() => setLightboxImage(selectedApp.data.govIdPhoto!)}
                                        className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-video max-h-56 bg-slate-900 cursor-pointer shadow-xs flex items-center justify-center"
                                    >
                                        <img
                                            src={selectedApp.data.govIdPhoto}
                                            alt={selectedApp.data?.idType || "Gov ID"}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-semibold text-xs">
                                            <Eye className="w-5 h-5" /> Click to Inspect Full Document
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Portfolio Job Proof Photos */}
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Proof of Work & Job Photos ({(selectedApp.data?.jobPhotos || []).length})
                                </h5>

                                {(selectedApp.data?.jobPhotos || []).length === 0 ? (
                                    <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                        No job photos uploaded with this application.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {(selectedApp.data?.jobPhotos || []).map((photo, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setLightboxImage(photo)}
                                                className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 cursor-pointer shadow-xs"
                                            >
                                                <img
                                                    src={photo}
                                                    alt={`Proof ${i + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Eye className="w-5 h-5" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setIsDossierOpen(false);
                                    setSelectedApp(null);
                                }}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                            >
                                Close Dossier
                            </button>

                            <div className="flex items-center gap-2">
                                {selectedApp.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setAppToReject(selectedApp);
                                                setIsRejectModalOpen(true);
                                            }}
                                            className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                                        >
                                            Request Changes
                                        </button>

                                        <button
                                            onClick={() => handleApprove(selectedApp)}
                                            disabled={processingId === selectedApp.id}
                                            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <BadgeCheck className="w-4 h-4" />
                                            Approve & Publish to Marketplace
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTION / REQUEST CHANGES MODAL */}
            {isRejectModalOpen && appToReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">Request Application Changes</h3>
                                    <p className="text-xs text-slate-500">Applicant: {appToReject.data?.fullName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsRejectModalOpen(false);
                                    setAppToReject(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Preset Feedback Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "Blurry Passport Photograph",
                                    "Need at least 3 job photos",
                                    "Proof of trade license required",
                                    "Unreachable phone number",
                                    "Incomplete business address"
                                ].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setQuickReason(quickReason === preset ? "" : preset)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${quickReason === preset ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Custom Admin Instructions</label>
                            <textarea
                                rows={3}
                                placeholder="Explain what the applicant needs to provide or fix to be approved..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => {
                                    setIsRejectModalOpen(false);
                                    setAppToReject(null);
                                }}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={processingId === appToReject.id}
                                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {processingId === appToReject.id ? 'Processing...' : 'Send Feedback & Mark Rejected'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX FOR FULL IMAGE PREVIEW */}
            {lightboxImage && (
                <div
                    onClick={() => setLightboxImage(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
                >
                    <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
                        <img
                            src={lightboxImage}
                            alt="Preview"
                            className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
                        />
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
