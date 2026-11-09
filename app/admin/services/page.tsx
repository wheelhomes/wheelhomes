"use client";

import { useState, useMemo } from "react";
import {
    Plus,
    Search,
    CheckCircle2,
    Trash2,
    Edit3,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Database,
    Wrench,
    Users,
    Briefcase,
    Power,
    RefreshCw,
    ShieldCheck,
    MapPin,
    Crown,
    Ban,
    Lock,
    X,
} from "lucide-react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    ServiceCategoryItem,
    ServiceIconKey,
    RealCategoryUsage,
    RealRequestRecord,
    ICON_OPTIONS,
    COLOR_OPTIONS,
    getLucideIcon,
    slugifyCategory,
    useServiceCategories,
    computeCategoryUsage,
    buildCategoryFromRealName,
    saveServiceCategoriesToFirestore,
    purgeSelectedTestData,
    canHardDeleteRequest,
    cancelJobRequestByAdmin,
    cascadeRenameServiceCategory,
    resolveKeyToSingleCategoryId,
} from "@/lib/service-categories";
import {
    NIGERIAN_STATES,
    useHodDirectory,
    assignHodForCategoryAndState,
    removeHodAssignment,
    matchNigerianState,
    detectClientState,
} from "@/lib/hod-routing";

const EMPTY_USAGE: RealCategoryUsage = {
    totalProviders: 0,
    approvedProviders: 0,
    pendingReviewProviders: 0,
    onboardingProviders: 0,
    rejectedProviders: 0,
    providerNames: [],
    totalRequests: 0,
    requests: [],
};

export default function AdminServiceCategoriesPage() {
    const {
        allCategories,
        realSnapshot,
        deletedIds,
        isLoading,
        refreshRealUsage,
    } = useServiceCategories({ withRealUsage: true });

    const [hideTestAccounts, setHideTestAccounts] = useState(false);

    // Usage for the current view (respects the "Hide test accounts" toggle)
    const usageView = useMemo(
        () => computeCategoryUsage(allCategories, realSnapshot, { excludeTest: hideTestAccounts }),
        [allCategories, realSnapshot, hideTestAccounts]
    );
    // Unfiltered usage, used for safety checks (delete / remove unused)
    const usageAll = useMemo(
        () => computeCategoryUsage(allCategories, realSnapshot),
        [allCategories, realSnapshot]
    );
    const getUsage = (cat: ServiceCategoryItem, all = false) =>
        (all ? usageAll : usageView).byCategoryId[cat.id] || EMPTY_USAGE;

    const testProviderCount = realSnapshot?.providers.filter((p) => p.isTest).length || 0;
    const testRequestCount = realSnapshot?.requests.filter((r) => r.isTest).length || 0;

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Add / Edit Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ServiceCategoryItem | null>(null);
    const [formName, setFormName] = useState("");
    const [formShortTitle, setFormShortTitle] = useState("");
    const [formSubtitle, setFormSubtitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formIconKey, setFormIconKey] = useState<ServiceIconKey>("wrench");
    const [formColorHex, setFormColorHex] = useState("#10B981");
    const [formIsActive, setFormIsActive] = useState(true);

    // Delete Confirmation Modal state
    const [deletingCategory, setDeletingCategory] = useState<ServiceCategoryItem | null>(null);

    // Clear Test Data Modal state
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
    const [selectedCleanupProviders, setSelectedCleanupProviders] = useState<string[]>([]);
    const [selectedCleanupRequests, setSelectedCleanupRequests] = useState<string[]>([]);
    const [showAllInCleanup, setShowAllInCleanup] = useState(true);

    // Job Requests Inspector Modal state (per category or "all")
    const [viewingRequestsFor, setViewingRequestsFor] = useState<ServiceCategoryItem | "all" | null>(null);

    // HOD Directory & State Routing Modal state
    const { activeAssignments: hodAssignments } = useHodDirectory();
    const [hodModalCategory, setHodModalCategory] = useState<ServiceCategoryItem | "all" | null>(null);
    const [selectedHodCategoryId, setSelectedHodCategoryId] = useState<string>("");
    const [selectedHodStateSlug, setSelectedHodStateSlug] = useState<string>("");
    const [selectedHodProviderUid, setSelectedHodProviderUid] = useState<string>("");
    const [liveSelectedProviderDoc, setLiveSelectedProviderDoc] = useState<Record<string, any> | null>(null);

    /**
     * Complete list of Service Categories available in the HOD Routing Modal:
     * combines `allCategories` with any service categories registered on providers in Firestore
     * (even if that category was previously hidden/removed from the main table), so selecting
     * a provider ALWAYS finds and populates their exact Service Category.
     */
    const hodCategoryOptions = useMemo(() => {
        const list: ServiceCategoryItem[] = [...allCategories];
        const addIfMissing = (rawLabel?: string) => {
            if (!rawLabel || typeof rawLabel !== "string") return;
            const trimmed = rawLabel.trim();
            if (!trimmed) return;
            const slug = slugifyCategory(trimmed);
            if (!slug || ["skilled-artisan", "service-provider", "provider", "other", "n-a", "none"].includes(slug)) {
                return;
            }
            const existingId = resolveKeyToSingleCategoryId(slug, list);
            if (!existingId && !list.some((c) => c.id === slug)) {
                list.push(buildCategoryFromRealName(trimmed, list.length + 1, "database"));
            }
        };

        (realSnapshot?.providers || []).forEach((p) => {
            addIfMissing(p.primaryService);
            (p.serviceLabels || []).forEach(addIfMissing);
        });

        if (liveSelectedProviderDoc) {
            const app = liveSelectedProviderDoc.applicationData || {};
            addIfMissing(liveSelectedProviderDoc.serviceCategory);
            addIfMissing(liveSelectedProviderDoc.primaryService);
            addIfMissing(app.serviceCategory);
            addIfMissing(app.primaryService);
            if (Array.isArray(liveSelectedProviderDoc.services)) {
                liveSelectedProviderDoc.services.forEach(addIfMissing);
            }
            if (Array.isArray(app.services)) {
                app.services.forEach(addIfMissing);
            }
        }

        return list;
    }, [allCategories, realSnapshot, liveSelectedProviderDoc]);

    const openHodModal = (target: ServiceCategoryItem | "all") => {
        setHodModalCategory(target);
        setSelectedHodProviderUid("");
        setLiveSelectedProviderDoc(null);
        if (target === "all") {
            setSelectedHodCategoryId("");
            setSelectedHodStateSlug("");
        } else {
            setSelectedHodCategoryId(target.id);
            setSelectedHodStateSlug("");
        }
    };

    /**
     * When the Admin selects a provider in the Designated HOD dropdown:
     * 1. Sets the selected provider UID
     * 2. Immediately resolves Service Category and Location (State) from the snapshot + existing HOD slots
     * 3. Fetches the live `users/{uid}` document from Firestore to guarantee 100% of nested fields
     *    (`address.state`, `address.city`, `coverageArea`, `applicationData`, `serviceCategory`, `services`)
     *    populate `Service Category` and `Location (State)` accurately.
     */
    const handleSelectHodProvider = async (providerUid: string) => {
        setSelectedHodProviderUid(providerUid);
        setLiveSelectedProviderDoc(null);
        if (!providerUid) {
            if (hodModalCategory === "all") {
                setSelectedHodCategoryId("");
            }
            setSelectedHodStateSlug("");
            return;
        }

        const prov = (realSnapshot?.providers || []).find((p) => p.id === providerUid);
        const existingHodSlot = hodAssignments.find((h) => h.hodUid === providerUid);

        const resolveCategoryFromValues = (rawValues: unknown[], optionsList: ServiceCategoryItem[]): string | null => {
            for (const val of rawValues) {
                if (typeof val !== "string" || !val.trim()) continue;
                const slug = slugifyCategory(val.trim());
                if (!slug) continue;
                const matchedId =
                    resolveKeyToSingleCategoryId(slug, optionsList) ||
                    optionsList.find(
                        (c) =>
                            c.id === slug ||
                            slugifyCategory(c.name) === slug ||
                            slugifyCategory(c.shortTitle) === slug
                    )?.id;
                if (matchedId) return matchedId;
            }
            return null;
        };

        // Step A: Immediate synchronous resolution from snapshot
        if (prov) {
            const syncCatId =
                resolveCategoryFromValues(
                    [
                        prov.primaryService,
                        ...(prov.serviceLabels || []),
                        ...prov.categoryKeys,
                    ],
                    hodCategoryOptions
                ) || existingHodSlot?.categoryId;
            if (syncCatId) {
                setSelectedHodCategoryId(syncCatId);
            }

            const syncState =
                matchNigerianState(prov.state) ||
                matchNigerianState(prov.coverageArea) ||
                matchNigerianState(prov.address) ||
                matchNigerianState(prov.bio) ||
                (existingHodSlot ? matchNigerianState(existingHodSlot.stateSlug) : null);
            if (syncState) {
                setSelectedHodStateSlug(syncState.slug);
            }
        }

        // Step B: Live Firestore `users/{providerUid}` inspection for any nested fields
        try {
            const userSnap = await getDoc(doc(db, "users", providerUid));
            if (userSnap.exists()) {
                const u = userSnap.data();
                setLiveSelectedProviderDoc(u);
                const app = u.applicationData || {};

                const rawServices = [
                    u.serviceCategory,
                    u.primaryService,
                    app.serviceCategory,
                    app.primaryService,
                    u.tradeCategory,
                    u.category,
                    u.profession,
                    ...(Array.isArray(u.services) ? u.services : []),
                    ...(Array.isArray(app.services) ? app.services : []),
                    prov?.primaryService,
                    ...(prov?.serviceLabels || []),
                ];

                // Build updated category list including any raw service from this live doc
                const tempOptions = [...hodCategoryOptions];
                for (const rv of rawServices) {
                    if (typeof rv === "string" && rv.trim()) {
                        const s = slugifyCategory(rv.trim());
                        if (s && !resolveKeyToSingleCategoryId(s, tempOptions) && !tempOptions.some((c) => c.id === s)) {
                            tempOptions.push(buildCategoryFromRealName(rv.trim(), tempOptions.length + 1, "database"));
                        }
                    }
                }

                const liveCatId =
                    resolveCategoryFromValues(rawServices, tempOptions) ||
                    existingHodSlot?.categoryId;
                if (liveCatId) {
                    setSelectedHodCategoryId(liveCatId);
                }

                const detected = detectClientState(u, prov?.address || prov?.coverageArea || prov?.state);
                if (detected.detectedFrom !== "default") {
                    setSelectedHodStateSlug(detected.stateSlug);
                } else if (existingHodSlot?.stateSlug) {
                    setSelectedHodStateSlug(existingHodSlot.stateSlug);
                }
            }
        } catch (err) {
            console.warn("Could not read live provider doc for HOD auto-fill:", err);
        }
    };

    const handleAssignHod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedHodCategoryId || !selectedHodStateSlug || !selectedHodProviderUid) {
            showToast("error", "Please select a provider, service category, and state to appoint as HOD.");
            return;
        }
        const cat = hodCategoryOptions.find((c) => c.id === selectedHodCategoryId);
        const st = NIGERIAN_STATES.find((s) => s.slug === selectedHodStateSlug);
        const prov = (realSnapshot?.providers || []).find((p) => p.id === selectedHodProviderUid);
        if (!cat || !st || !prov) {
            showToast("error", "Invalid category, state, or provider selection.");
            return;
        }
        setIsSaving(true);
        try {
            const auth = getAuth();
            // If this provider's category wasn't in `allCategories` yet, restore/add it so clients can book it
            if (!allCategories.some((c) => c.id === cat.id)) {
                await saveServiceCategoriesToFirestore(
                    [...allCategories, cat],
                    auth.currentUser?.email,
                    deletedIds.filter((id) => id !== cat.id)
                );
            }

            await assignHodForCategoryAndState({
                categoryId: cat.id,
                categoryName: cat.name,
                stateSlug: st.slug,
                stateName: st.name,
                hodUid: prov.id,
                hodName: prov.name,
                hodEmail: prov.email,
                hodPhone: prov.phone,
                adminEmail: auth.currentUser?.email,
            });
            await refreshRealUsage();
            setSelectedHodProviderUid("");
            setLiveSelectedProviderDoc(null);
            showToast(
                "success",
                `Appointed ${prov.name} as the sole HOD for ${cat.name} in ${st.name} State.`
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to appoint HOD.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveHod = async (key: string, label: string) => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            await removeHodAssignment(key, auth.currentUser?.email);
            showToast("success", `Removed HOD assignment for ${label}.`);
        } catch (err: any) {
            showToast("error", err?.message || "Failed to remove HOD assignment.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSingleRequest = async (req: RealRequestRecord) => {
        const check = canHardDeleteRequest(req);
        if (!check.allowed) {
            showToast("error", check.reason || "This request is protected and cannot be deleted.");
            return;
        }
        setIsSaving(true);
        try {
            const auth = getAuth();
            const idToken = await auth.currentUser?.getIdToken().catch(() => null);
            await purgeSelectedTestData({
                userIds: [],
                applicationIds: [],
                requestIds: [req.id],
                idToken,
            });
            await refreshRealUsage();
            showToast("success", "Job request permanently deleted.");
        } catch (err: any) {
            showToast("error", err?.message || "Failed to delete job request.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelSingleRequest = async (req: RealRequestRecord) => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            await cancelJobRequestByAdmin(req.id, auth.currentUser?.email);
            await refreshRealUsage();
            showToast("success", "Job request cancelled (audit history preserved).");
        } catch (err: any) {
            showToast("error", err?.message || "Failed to cancel job request.");
        } finally {
            setIsSaving(false);
        }
    };

    const openCleanupModal = () => {
        const preselectedProviders = (realSnapshot?.providers || [])
            .filter((p) => p.isTest)
            .map((p) => p.id);
        const preselectedRequests = (realSnapshot?.requests || [])
            .filter(
                (r) =>
                    canHardDeleteRequest(r).allowed &&
                    (r.isTest ||
                        (r.providerId && preselectedProviders.includes(r.providerId)) ||
                        (r.clientId && preselectedProviders.includes(r.clientId)))
            )
            .map((r) => r.id);

        setSelectedCleanupProviders(preselectedProviders);
        setSelectedCleanupRequests(preselectedRequests);
        setShowAllInCleanup(true);
        setIsCleanupModalOpen(true);
    };

    const handleConfirmCleanupTestData = async () => {
        if (selectedCleanupProviders.length === 0 && selectedCleanupRequests.length === 0) {
            showToast("error", "Select at least one test provider or test job request to delete.");
            return;
        }
        setIsSaving(true);
        try {
            const auth = getAuth();
            const idToken = await auth.currentUser?.getIdToken().catch(() => null);
            const selectedProvRecords = (realSnapshot?.providers || []).filter((p) =>
                selectedCleanupProviders.includes(p.id)
            );
            const userIds = selectedProvRecords
                .filter((p) => p.source === "users")
                .map((p) => p.id);
            const applicationIds = selectedProvRecords
                .filter((p) => p.source === "user_applications")
                .map((p) => p.id);

            const { deletedProviders, deletedRequests } = await purgeSelectedTestData({
                userIds,
                applicationIds,
                requestIds: selectedCleanupRequests,
                idToken,
            });

            await refreshRealUsage();
            setIsCleanupModalOpen(false);
            showToast(
                "success",
                `Deleted ${deletedProviders} test provider(s) and ${deletedRequests} test job request(s) from Firestore.`
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to delete test data.");
        } finally {
            setIsSaving(false);
        }
    };

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const filteredCategories = useMemo(() => {
        return allCategories.filter((cat) => {
            if (statusFilter === "active" && !cat.isActive) return false;
            if (statusFilter === "inactive" && cat.isActive) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                return (
                    cat.name.toLowerCase().includes(q) ||
                    cat.shortTitle.toLowerCase().includes(q) ||
                    cat.subtitle.toLowerCase().includes(q) ||
                    cat.description.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [allCategories, statusFilter, searchQuery]);

    const activeCount = allCategories.filter((c) => c.isActive).length;
    const inactiveCount = allCategories.length - activeCount;

    // Count categories with 0 providers & 0 requests in the whole database (incl. test accounts)
    const unusedCategoriesCount = useMemo(() => {
        return allCategories.filter((cat) => {
            const u = usageAll.byCategoryId[cat.id] || EMPTY_USAGE;
            return u.totalProviders === 0 && u.totalRequests === 0;
        }).length;
    }, [allCategories, usageAll]);

    const handleToggleActive = async (target: ServiceCategoryItem) => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            const updated = allCategories.map((c) =>
                c.id === target.id ? { ...c, isActive: !c.isActive } : c
            );
            await saveServiceCategoriesToFirestore(updated, auth.currentUser?.email, deletedIds);
            showToast(
                "success",
                `"${target.name}" is now ${!target.isActive ? "Active (visible to clients)" : "Deactivated (hidden from new bookings)"}.`
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to update service status.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMoveOrder = async (indexInAll: number, direction: "up" | "down") => {
        const swapIndex = direction === "up" ? indexInAll - 1 : indexInAll + 1;
        if (swapIndex < 0 || swapIndex >= allCategories.length) return;

        setIsSaving(true);
        try {
            const auth = getAuth();
            const copy = [...allCategories];
            const temp = copy[indexInAll];
            copy[indexInAll] = copy[swapIndex];
            copy[swapIndex] = temp;
            await saveServiceCategoriesToFirestore(copy, auth.currentUser?.email, deletedIds);
        } catch (err: any) {
            showToast("error", err?.message || "Failed to reorder categories.");
        } finally {
            setIsSaving(false);
        }
    };

    const openAddModal = () => {
        setEditingCategory(null);
        setFormName("");
        setFormShortTitle("");
        setFormSubtitle("");
        setFormDescription("");
        setFormIconKey("wrench");
        setFormColorHex("#10B981");
        setFormIsActive(true);
        setIsModalOpen(true);
    };

    const openEditModal = (cat: ServiceCategoryItem) => {
        setEditingCategory(cat);
        setFormName(cat.name);
        setFormShortTitle(cat.shortTitle);
        setFormSubtitle(cat.subtitle);
        setFormDescription(cat.description);
        setFormIconKey(cat.iconKey);
        setFormColorHex(cat.colorHex);
        setFormIsActive(cat.isActive);
        setIsModalOpen(true);
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = formName.trim();
        if (!cleanName) {
            showToast("error", "Please enter a service category name.");
            return;
        }

        const duplicate = allCategories.find(
            (c) =>
                c.name.toLowerCase() === cleanName.toLowerCase() &&
                (!editingCategory || c.id !== editingCategory.id)
        );
        if (duplicate) {
            showToast("error", `A service type named "${cleanName}" already exists.`);
            return;
        }

        const resolvedShort =
            formShortTitle.trim() || cleanName.split(/[\s&/,]+/)[0] || cleanName;
        const resolvedSubtitle = formSubtitle.trim() || "Verified Specialists";
        const resolvedDesc =
            formDescription.trim() ||
            `Professional ${cleanName.toLowerCase()} installations, maintenance, and repairs.`;

        setIsSaving(true);
        try {
            const auth = getAuth();
            let updated: ServiceCategoryItem[];
            const newId = slugifyCategory(cleanName);
            const updatedDeletedIds = deletedIds.filter((id) => id !== newId);

            if (editingCategory) {
                updated = allCategories.map((c) =>
                    c.id === editingCategory.id
                        ? {
                              ...c,
                              name: cleanName,
                              shortTitle: resolvedShort,
                              subtitle: resolvedSubtitle,
                              description: resolvedDesc,
                              iconKey: formIconKey,
                              colorHex: formColorHex,
                              isActive: formIsActive,
                          }
                        : c
                );
            } else {
                const newItem: ServiceCategoryItem = {
                    id: newId,
                    name: cleanName,
                    shortTitle: resolvedShort,
                    subtitle: resolvedSubtitle,
                    description: resolvedDesc,
                    iconKey: formIconKey,
                    colorHex: formColorHex,
                    isActive: formIsActive,
                    order: allCategories.length + 1,
                    source: "admin",
                    createdAt: new Date().toISOString(),
                };
                updated = [...allCategories, newItem];
            }

            await saveServiceCategoriesToFirestore(
                updated,
                auth.currentUser?.email,
                updatedDeletedIds
            );

            // If the admin renamed an existing service category, cascade the new name
            // to existing provider profiles and job requests so everything stays in sync.
            if (
                editingCategory &&
                editingCategory.name.toLowerCase() !== cleanName.toLowerCase()
            ) {
                await cascadeRenameServiceCategory(
                    editingCategory.name,
                    editingCategory.shortTitle,
                    cleanName
                ).catch(() => {});
                await refreshRealUsage();
            }

            setIsModalOpen(false);
            showToast(
                "success",
                editingCategory
                    ? `Updated "${cleanName}" across Web & Mobile.`
                    : `Added "${cleanName}" to Wheelhomes service categories.`
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to save service category.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async (cat: ServiceCategoryItem) => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            const updated = allCategories.filter((c) => c.id !== cat.id);
            const nextDeleted = Array.from(
                new Set([...deletedIds, cat.id, slugifyCategory(cat.name)])
            );
            await saveServiceCategoriesToFirestore(updated, auth.currentUser?.email, nextDeleted);
            setDeletingCategory(null);
            showToast("success", `Deleted "${cat.name}" from service categories.`);
        } catch (err: any) {
            showToast("error", err?.message || "Failed to delete service category.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivateInsteadOfDelete = async (cat: ServiceCategoryItem) => {
        setDeletingCategory(null);
        if (cat.isActive) {
            await handleToggleActive(cat);
        }
    };

    /**
     * Scans live Firestore collections (`users`, `user_applications`, `job_requests`, `requests`)
     * and ensures all real service types used by actual providers or job requests are synced.
     */
    const handleSyncFromLiveDatabase = async () => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            const { snapshot } = await refreshRealUsage();

            // Add every raw service value that doesn't exactly match an existing category
            // (respecting the "Hide test accounts" toggle). Existing categories are never removed here.
            const { unmatched } = computeCategoryUsage(allCategories, snapshot, {
                excludeTest: hideTestAccounts,
            });
            const additions = unmatched.map((u, i) =>
                buildCategoryFromRealName(u.label, allCategories.length + i + 1, "database")
            );
            const merged = [...allCategories, ...additions];
            const addedIds = new Set(additions.map((a) => a.id));

            await saveServiceCategoriesToFirestore(
                merged,
                auth.currentUser?.email,
                deletedIds.filter((id) => !addedIds.has(id))
            );
            showToast(
                "success",
                additions.length > 0
                    ? `Added ${additions.length} service type(s) found in provider & request records.`
                    : "Already in sync — every service value in the database matches a category."
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to sync from live database.");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Removes any category that currently has 0 real providers and 0 real job requests in Firestore.
     */
    const handleRemoveUnusedCategories = async () => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            const { snapshot } = await refreshRealUsage();
            const fresh = computeCategoryUsage(allCategories, snapshot);
            const kept: ServiceCategoryItem[] = [];
            const removedIds: string[] = [...deletedIds];

            allCategories.forEach((cat) => {
                const u = fresh.byCategoryId[cat.id] || EMPTY_USAGE;
                if (u.totalProviders > 0 || u.totalRequests > 0) {
                    kept.push(cat);
                } else {
                    removedIds.push(cat.id, slugifyCategory(cat.name));
                }
            });

            await saveServiceCategoriesToFirestore(
                kept,
                auth.currentUser?.email,
                Array.from(new Set(removedIds))
            );
            showToast(
                "success",
                `Removed unused categories. Showing ${kept.length} service type(s) with real database records.`
            );
        } catch (err: any) {
            showToast("error", err?.message || "Failed to remove unused categories.");
        } finally {
            setIsSaving(false);
        }
    };

    /** Adds a single unmatched raw service value from the database as a new category. */
    const handleAddUnmatchedValue = async (label: string) => {
        setIsSaving(true);
        try {
            const auth = getAuth();
            const item = buildCategoryFromRealName(label, allCategories.length + 1, "database");
            await saveServiceCategoriesToFirestore(
                [...allCategories, item],
                auth.currentUser?.email,
                deletedIds.filter((id) => id !== item.id)
            );
            showToast("success", `Added "${label}" as a service type.`);
        } catch (err: any) {
            showToast("error", err?.message || "Failed to add service type.");
        } finally {
            setIsSaving(false);
        }
    };

    const PreviewIcon = getLucideIcon(formIconKey);

    return (
        <div className="space-y-8">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-semibold transition-all ${
                        toast.type === "success"
                            ? "bg-emerald-950 text-white border-emerald-700"
                            : "bg-red-950 text-white border-red-700"
                    }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
                        <Database className="w-3.5 h-3.5" />
                        100% Real Firestore Data
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Service Types Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage real service categories synced directly from your registered providers, job requests, and admin configuration.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => openHodModal("all")}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer"
                        title="Configure Head of Department (HOD) per Service Category & State (1 Category + 1 State = 1 HOD)"
                    >
                        <Crown className="w-4 h-4 text-purple-600" />
                        State HOD Routing ({hodAssignments.length})
                    </button>
                    <button
                        onClick={() => setViewingRequestsFor("all")}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                        title="Inspect all job requests in the database"
                    >
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        View Job Requests ({realSnapshot?.requests.length || 0})
                    </button>
                    {(testProviderCount > 0 || testRequestCount > 0) && (
                        <button
                            onClick={openCleanupModal}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
                            title="Inspect and permanently delete test providers and test job requests"
                        >
                            <Trash2 className="w-4 h-4 text-amber-700" />
                            Clear Test Data ({testProviderCount + testRequestCount})
                        </button>
                    )}
                    {unusedCategoriesCount > 0 && (
                        <button
                            onClick={handleRemoveUnusedCategories}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
                            title="Remove categories that have 0 providers and 0 job requests"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remove Unused ({unusedCategoriesCount})
                        </button>
                    )}
                    <button
                        onClick={handleSyncFromLiveDatabase}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer"
                        title="Scan Firestore users, applications, and job requests for real service categories"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
                        Sync from Live Database
                    </button>
                    <button
                        onClick={openAddModal}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Service Type
                    </button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Real Service Types
                        </p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{allCategories.length}</p>
                        <p className="text-xs text-gray-500 mt-1">From live providers, requests & admin</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Wrench className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                            Active & Bookable
                        </p>
                        <p className="text-3xl font-bold text-emerald-700 mt-1">{activeCount}</p>
                        <p className="text-xs text-gray-500 mt-1">Visible on Client Home, Web & KYC</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                            Deactivated (Hidden)
                        </p>
                        <p className="text-3xl font-bold text-amber-700 mt-1">{inactiveCount}</p>
                        <p className="text-xs text-gray-500 mt-1">Paused for new client requests</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Power className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search real service types by name, subtitle, or description..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {(["all", "active", "inactive"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                statusFilter === tab
                                    ? "bg-slate-900 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {tab === "all"
                                ? `All (${allCategories.length})`
                                : tab === "active"
                                ? `Active (${activeCount})`
                                : `Inactive (${inactiveCount})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data accuracy controls: test-account filter + matching note */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="text-xs text-slate-600 leading-relaxed">
                    <p>
                        <strong>Exact matching:</strong> a provider or request counts toward a service type only when its
                        stored value equals the service type&apos;s name or mobile short title. A provider who listed several
                        services is counted once under each matching service type.
                    </p>
                    <p className="mt-1">
                        <strong>Possible test accounts detected:</strong> {testProviderCount} provider(s), {testRequestCount}{" "}
                        request(s). These are names, emails or business names containing &ldquo;test&rdquo;, &ldquo;demo&rdquo; or &ldquo;dummy&rdquo;, or records with{" "}
                        <code className="px-1 bg-white rounded border">isTestAccount: true</code>.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hideTestAccounts}
                            onChange={(e) => setHideTestAccounts(e.target.checked)}
                            className="w-4 h-4 accent-emerald-600"
                        />
                        Hide test accounts
                    </label>
                    <button
                        onClick={openCleanupModal}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold cursor-pointer transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Test Data
                    </button>
                </div>
            </div>

            {/* Unmatched raw values found in the database */}
            {usageView.unmatched.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                {usageView.unmatched.length} service value(s) in the database don&apos;t match any service type
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                These providers and requests aren&apos;t counted above. Add a value as its own service type, or edit an existing
                                service type&apos;s name or short title so it matches exactly.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {usageView.unmatched.map((u) => (
                            <div
                                key={u.key}
                                className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"
                            >
                                <span className="font-semibold">&ldquo;{u.label}&rdquo;</span>
                                <span className="text-amber-700">
                                    {u.providers} provider(s) · {u.requests} request(s)
                                </span>
                                <button
                                    onClick={() => handleAddUnmatchedValue(u.label)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 font-bold cursor-pointer"
                                    title="Add as a new service type"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categories Table / List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center text-gray-400">
                        Loading real service categories from Firestore...
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="p-16 text-center space-y-3">
                        <Wrench className="w-10 h-10 text-gray-300 mx-auto" />
                        <p className="font-bold text-gray-800">No service types found</p>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            Click &ldquo;Sync from Live Database&rdquo; to pull categories from registered providers and job requests, or click &ldquo;Add Service Type&rdquo; to create one.
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-3">
                            <button
                                onClick={handleSyncFromLiveDatabase}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Sync from Live Database
                            </button>
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Service Type
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredCategories.map((cat) => {
                            const IconComp = getLucideIcon(cat.iconKey);
                            const usage = getUsage(cat);
                            const indexInAll = allCategories.findIndex((c) => c.id === cat.id);

                            return (
                                <div
                                    key={cat.id}
                                    className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                                        cat.isActive ? "bg-white hover:bg-gray-50/60" : "bg-gray-50/80 opacity-75"
                                    }`}
                                >
                                    {/* Left: Order + Icon + Details */}
                                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                                        {/* Up / Down Order Controls */}
                                        <div className="flex flex-col items-center gap-1 text-gray-400">
                                            <button
                                                onClick={() => handleMoveOrder(indexInAll, "up")}
                                                disabled={indexInAll <= 0 || isSaving}
                                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                                                title="Move up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-[11px] font-bold text-gray-400">
                                                #{indexInAll + 1}
                                            </span>
                                            <button
                                                onClick={() => handleMoveOrder(indexInAll, "down")}
                                                disabled={indexInAll >= allCategories.length - 1 || isSaving}
                                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                                                title="Move down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Colored Icon Emblem */}
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                                            style={{
                                                backgroundColor: `${cat.colorHex}18`,
                                                borderColor: `${cat.colorHex}40`,
                                                color: cat.colorHex,
                                            }}
                                        >
                                            <IconComp className="w-6 h-6" />
                                        </div>

                                        {/* Name, Mobile Pill & Real Database Stats */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-base truncate">
                                                    {cat.name}
                                                </h3>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                        cat.isActive
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}
                                                >
                                                    {cat.isActive ? "Active" : "Deactivated"}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                                                    Mobile card: <strong>{cat.shortTitle}</strong> • {cat.subtitle}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                                {cat.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                                                    <strong>{usage.totalProviders}</strong> total provider(s)
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                                    <strong>{usage.approvedProviders}</strong> verified
                                                </span>
                                                {usage.pendingReviewProviders > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                                        {usage.pendingReviewProviders} pending review
                                                    </span>
                                                )}
                                                {usage.onboardingProviders > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                                        {usage.onboardingProviders} onboarding
                                                    </span>
                                                )}
                                                {usage.rejectedProviders > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-semibold border border-red-200">
                                                        {usage.rejectedProviders} rejected
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingRequestsFor(cat)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition-colors cursor-pointer"
                                                    title="Click to view job requests for this service type"
                                                >
                                                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                                                    <strong>{usage.totalRequests}</strong> job request(s) — View
                                                </button>
                                                {(() => {
                                                    const catHods = hodAssignments.filter(
                                                        (h) => h.categoryId === cat.id
                                                    );
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHodModal(cat)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold transition-colors cursor-pointer"
                                                            title="Manage State HODs (1 Category + 1 State = 1 HOD)"
                                                        >
                                                            <Crown className="w-3.5 h-3.5 text-purple-600" />
                                                            {catHods.length > 0 ? (
                                                                <span>
                                                                    <strong>{catHods.length}</strong> State HOD(s):{" "}
                                                                    {catHods
                                                                        .slice(0, 2)
                                                                        .map((h) => `${h.stateName} (${h.hodName.split(" ")[0]})`)
                                                                        .join(", ")}
                                                                    {catHods.length > 2 ? ` +${catHods.length - 2}` : ""}
                                                                </span>
                                                            ) : (
                                                                <span>Assign State HODs</span>
                                                            )}
                                                        </button>
                                                    );
                                                })()}
                                                {usage.providerNames.length > 0 && (
                                                    <span className="text-gray-400 truncate max-w-xs">
                                                        Providers: {usage.providerNames.slice(0, 3).join(", ")}
                                                        {usage.providerNames.length > 3
                                                            ? ` +${usage.providerNames.length - 3} more`
                                                            : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Activate/Deactivate Toggle, Edit, Delete */}
                                    <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                                        <button
                                            onClick={() => handleToggleActive(cat)}
                                            disabled={isSaving}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                cat.isActive
                                                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                            }`}
                                        >
                                            <Power className="w-3.5 h-3.5" />
                                            {cat.isActive ? "Deactivate" : "Activate"}
                                        </button>

                                        <button
                                            onClick={() => openEditModal(cat)}
                                            disabled={isSaving}
                                            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                                            title="Edit Service Type"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => setDeletingCategory(cat)}
                                            disabled={isSaving}
                                            className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Delete Service Type"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add / Edit Service Category Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingCategory ? "Edit Service Type" : "Add New Service Type"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Changes sync immediately to both Web and Mobile apps.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveForm} className="p-6 space-y-5">
                            {/* Live Mobile Card Preview */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Live Mobile & Web Preview
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">
                                        {formName.trim() || "Service Category Name"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {formDescription.trim() || "Service description will appear here."}
                                    </p>
                                </div>
                                <div className="w-28 p-3 bg-white rounded-2xl border shadow-sm flex flex-col items-center text-center shrink-0">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                                        style={{
                                            backgroundColor: `${formColorHex}20`,
                                            color: formColorHex,
                                        }}
                                    >
                                        <PreviewIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 truncate w-full">
                                        {formShortTitle.trim() ||
                                            (formName.trim() ? formName.trim().split(/[\s&/]+/)[0] : "Title")}
                                    </span>
                                    <span className="text-[10px] text-slate-500 truncate w-full">
                                        {formSubtitle.trim() || "Subtitle"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Full Service Category Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g., Borehole Drilling & Water Treatment"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                        Mobile Card Short Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formShortTitle}
                                        onChange={(e) => setFormShortTitle(e.target.value)}
                                        placeholder="e.g., Borehole"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                        Mobile Card Subtitle
                                    </label>
                                    <input
                                        type="text"
                                        value={formSubtitle}
                                        onChange={(e) => setFormSubtitle(e.target.value)}
                                        placeholder="e.g., Drilling & Filters"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                                    Description (Web Services Page)
                                </label>
                                <textarea
                                    rows={2}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Describe what repairs, installations, or maintenance this trade covers..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Icon Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                                    Select Icon
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {ICON_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        const selected = formIconKey === opt.key;
                                        return (
                                            <button
                                                type="button"
                                                key={opt.key}
                                                onClick={() => setFormIconKey(opt.key)}
                                                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                                                    selected
                                                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30"
                                                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="truncate w-full text-center">
                                                    {opt.label.split(" ")[0]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Color Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                                    Badge Accent Color
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {COLOR_OPTIONS.map((c) => (
                                        <button
                                            type="button"
                                            key={c.hex}
                                            onClick={() => setFormColorHex(c.hex)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                                                formColorHex === c.hex
                                                    ? "scale-125 border-gray-900 shadow-md"
                                                    : "border-transparent hover:scale-110"
                                            }`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Active & Bookable</p>
                                    <p className="text-xs text-gray-500">
                                        When enabled, clients can book this service and providers can register under it.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formIsActive}
                                    onChange={(e) => setFormIsActive(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving
                                        ? "Saving..."
                                        : editingCategory
                                        ? "Save Changes"
                                        : "Add Service Type"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Safe Delete Confirmation Modal */}
            {deletingCategory && (() => {
                // Safety check always uses ALL records (incl. test accounts)
                const usage = getUsage(deletingCategory, true);
                const hasExistingRecords = usage.totalProviders > 0 || usage.totalRequests > 0;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Delete &ldquo;{deletingCategory.name}&rdquo;?
                                    </h3>
                                    {hasExistingRecords ? (
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                            This service category is linked to{" "}
                                            <strong>{usage.totalProviders} provider(s)</strong> and{" "}
                                            <strong>{usage.totalRequests} job request(s)</strong> in Firestore. We recommend{" "}
                                            <strong>Deactivating</strong> it instead so existing records remain intact while hiding it from new bookings.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                            No providers or job requests currently use this service type. It can be safely removed.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                                <button
                                    onClick={() => setDeletingCategory(null)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                {hasExistingRecords && deletingCategory.isActive && (
                                    <button
                                        onClick={() => handleDeactivateInsteadOfDelete(deletingCategory)}
                                        disabled={isSaving}
                                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Deactivate Instead (Recommended)
                                    </button>
                                )}
                                <button
                                    onClick={() => handleConfirmDelete(deletingCategory)}
                                    disabled={isSaving}
                                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                                >
                                    {hasExistingRecords ? "Delete Anyway" : "Confirm Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Clear Test Data Preview & Confirmation Modal */}
            {isCleanupModalOpen && (() => {
                const allProviders = realSnapshot?.providers || [];
                const allRequests = realSnapshot?.requests || [];
                const displayedProviders = showAllInCleanup
                    ? allProviders
                    : allProviders.filter((p) => p.isTest || selectedCleanupProviders.includes(p.id));
                const displayedRequests = showAllInCleanup
                    ? allRequests
                    : allRequests.filter((r) => r.isTest || selectedCleanupRequests.includes(r.id));

                const toggleProvider = (id: string) => {
                    setSelectedCleanupProviders((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    );
                };

                const toggleRequest = (id: string) => {
                    setSelectedCleanupRequests((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    );
                };

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Clear Test Providers & Test Job Requests
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Review and uncheck any record you want to keep. Checked items will be permanently removed from Firestore.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCleanupModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                                    <span className="text-xs text-slate-600">
                                        Selected:{" "}
                                        <strong>{selectedCleanupProviders.length} provider(s)</strong> and{" "}
                                        <strong>{selectedCleanupRequests.length} job request(s)</strong>
                                    </span>
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showAllInCleanup}
                                            onChange={(e) => setShowAllInCleanup(e.target.checked)}
                                            className="w-4 h-4 accent-emerald-600"
                                        />
                                        Show all records (manual pick)
                                    </label>
                                </div>

                                {/* Test Providers Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Providers & Applications ({displayedProviders.length})
                                        </h4>
                                        {displayedProviders.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedCleanupProviders(
                                                        selectedCleanupProviders.length === displayedProviders.length
                                                            ? []
                                                            : displayedProviders.map((p) => p.id)
                                                    )
                                                }
                                                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                                            >
                                                {selectedCleanupProviders.length === displayedProviders.length
                                                    ? "Deselect All"
                                                    : "Select All Shown"}
                                            </button>
                                        )}
                                    </div>
                                    {displayedProviders.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-2">
                                            No test providers detected. Toggle &ldquo;Show all records&rdquo; above to pick manually.
                                        </p>
                                    ) : (
                                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl max-h-52 overflow-y-auto">
                                            {displayedProviders.map((p) => (
                                                <label
                                                    key={p.id}
                                                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-xs"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCleanupProviders.includes(p.id)}
                                                            onChange={() => toggleProvider(p.id)}
                                                            className="w-4 h-4 accent-red-600 shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 truncate">
                                                                {p.name}{" "}
                                                                {p.isTest && (
                                                                    <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                        TEST
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-gray-500 truncate">
                                                                {p.email || "No email"} • Services:{" "}
                                                                {p.categoryKeys.join(", ") || "None"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-gray-400 shrink-0">
                                                        {p.status}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Test Job Requests Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Job Requests ({displayedRequests.length})
                                        </h4>
                                        {displayedRequests.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const deletableIds = displayedRequests
                                                        .filter((r) => canHardDeleteRequest(r).allowed)
                                                        .map((r) => r.id);
                                                    setSelectedCleanupRequests(
                                                        selectedCleanupRequests.length === deletableIds.length
                                                            ? []
                                                            : deletableIds
                                                    );
                                                }}
                                                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                                            >
                                                {selectedCleanupRequests.length > 0
                                                    ? "Deselect All"
                                                    : "Select All Deletable"}
                                            </button>
                                        )}
                                    </div>
                                    {displayedRequests.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-2">
                                            No test job requests detected. Toggle &ldquo;Show all records&rdquo; above to pick manually.
                                        </p>
                                    ) : (
                                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl max-h-56 overflow-y-auto">
                                            {displayedRequests.map((r) => {
                                                const deleteCheck = canHardDeleteRequest(r);
                                                return (
                                                    <label
                                                        key={r.id}
                                                        className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs ${
                                                            deleteCheck.allowed
                                                                ? "hover:bg-gray-50 cursor-pointer"
                                                                : "bg-gray-50/70 opacity-65 cursor-not-allowed"
                                                        }`}
                                                        title={deleteCheck.reason || ""}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                disabled={!deleteCheck.allowed}
                                                                checked={
                                                                    deleteCheck.allowed &&
                                                                    selectedCleanupRequests.includes(r.id)
                                                                }
                                                                onChange={() => {
                                                                    if (deleteCheck.allowed) toggleRequest(r.id);
                                                                }}
                                                                className="w-4 h-4 accent-red-600 shrink-0 disabled:opacity-40"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 truncate">
                                                                    {r.serviceLabel}{" "}
                                                                    {r.isTest && (
                                                                        <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                            TEST
                                                                        </span>
                                                                    )}
                                                                    {!deleteCheck.allowed && (
                                                                        <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                                                            PROTECTED ({r.status})
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-gray-500 truncate">
                                                                    {r.description || "No description"}
                                                                    {r.clientName ? ` • Client: ${r.clientName}` : ""}
                                                                    {r.providerName ? ` • Provider: ${r.providerName}` : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 shrink-0">
                                                            {r.source}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCleanupModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCleanupTestData}
                                    disabled={
                                        isSaving ||
                                        (selectedCleanupProviders.length === 0 &&
                                            selectedCleanupRequests.length === 0)
                                    }
                                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving
                                        ? "Deleting..."
                                        : `Delete Selected (${selectedCleanupProviders.length + selectedCleanupRequests.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Job Requests Inspector Modal (per Service Type or All) */}
            {viewingRequestsFor && (() => {
                const isAll = viewingRequestsFor === "all";
                const requestsList = isAll
                    ? (realSnapshot?.requests || []).filter((r) => !hideTestAccounts || !r.isTest)
                    : getUsage(viewingRequestsFor).requests;
                const title = isAll
                    ? `All Job Requests (${requestsList.length})`
                    : `Job Requests — ${viewingRequestsFor.name} (${requestsList.length})`;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Live records from Firestore <code className="px-1 bg-gray-100 rounded">job_requests</code> and{" "}
                                        <code className="px-1 bg-gray-100 rounded">requests</code>.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingRequestsFor(null)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {requestsList.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 text-sm">
                                        No job requests found for this filter.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl">
                                        {requestsList.map((r) => {
                                            const deleteCheck = canHardDeleteRequest(r);
                                            const statusLower = r.status.toLowerCase();
                                            const canCancel = ![
                                                "cancelled",
                                                "rejected",
                                                "completed",
                                                "fully_completed",
                                            ].includes(statusLower);

                                            return (
                                                <div
                                                    key={r.id}
                                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70"
                                                >
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-gray-900 text-sm">
                                                                {r.serviceLabel}
                                                            </span>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                    statusLower === "cancelled" || statusLower === "rejected"
                                                                        ? "bg-red-100 text-red-700"
                                                                        : statusLower === "completed" || statusLower === "fully_completed"
                                                                        ? "bg-emerald-100 text-emerald-700"
                                                                        : "bg-slate-100 text-slate-700"
                                                                }`}
                                                            >
                                                                {r.status}
                                                            </span>
                                                            {r.budget > 0 && (
                                                                <span className="text-xs font-bold text-emerald-700">
                                                                    ₦{r.budget.toLocaleString()}
                                                                </span>
                                                            )}
                                                            {r.paymentStatus && (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                                                    Escrow: {r.paymentStatus}
                                                                </span>
                                                            )}
                                                            {r.isTest && (
                                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                    TEST / ORPHANED
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-gray-400 font-mono">
                                                                #{r.id.slice(0, 8)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">
                                                            {r.description || "No description provided"}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                                                            <span>
                                                                Client: <strong>{r.clientName || "Unknown"}</strong>
                                                            </span>
                                                            {r.providerName && (
                                                                <span>
                                                                    Provider: <strong>{r.providerName}</strong>
                                                                </span>
                                                            )}
                                                            {r.location && <span>Location: {r.location}</span>}
                                                            {r.createdAt && (
                                                                <span>
                                                                    Date: {new Date(r.createdAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {canCancel && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelSingleRequest(r)}
                                                                disabled={isSaving}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold cursor-pointer"
                                                                title="Cancel this job request while preserving its audit history"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                                Cancel Job
                                                            </button>
                                                        )}

                                                        {deleteCheck.allowed ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSingleRequest(r)}
                                                                disabled={isSaving}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer"
                                                                title="Permanently delete this test/cancelled/unassigned request"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Delete
                                                            </button>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold cursor-not-allowed"
                                                                title={deleteCheck.reason}
                                                            >
                                                                <Lock className="w-3.5 h-3.5" />
                                                                Protected
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3">
                                <a
                                    href="/admin/requests"
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    Open full Service Request Log →
                                </a>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewingRequestsFor(null);
                                            openCleanupModal();
                                        }}
                                        className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold cursor-pointer"
                                    >
                                        Bulk Clear Test Data
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewingRequestsFor(null)}
                                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* State HOD Routing Directory Modal (1 Category + 1 State = 1 HOD) */}
            {hodModalCategory && (() => {
                const isAll = hodModalCategory === "all";
                const displayedHods = isAll
                    ? hodAssignments
                    : hodAssignments.filter((h) => h.categoryId === hodModalCategory.id);

                // Candidate providers (real approved providers prioritized first)
                const allCandidates = (realSnapshot?.providers || []).filter(
                    (p) => (!hideTestAccounts || !p.isTest) && p.source === "users"
                );
                const sortedCandidates = [...allCandidates].sort((a, b) => {
                    const aApproved = a.status === "approved" ? 0 : 1;
                    const bApproved = b.status === "approved" ? 0 : 1;
                    if (aApproved !== bApproved) return aApproved - bApproved;
                    return a.name.localeCompare(b.name);
                });

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold uppercase tracking-wider mb-1">
                                        <Crown className="w-3.5 h-3.5 text-purple-600" />
                                        1 Request = 1 Category + 1 Location = 1 HOD
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {isAll
                                            ? "State HOD Routing Directory"
                                            : `State HODs — ${hodModalCategory.name}`}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        When a client requests a service, the system detects their state and routes the request{" "}
                                        <strong>exclusively</strong> to the single HOD appointed for that service category &amp; state.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setHodModalCategory(null)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Appoint / Replace HOD Form */}
                                <form
                                    onSubmit={handleAssignHod}
                                    className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-4"
                                >
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                                        Appoint or Replace State HOD
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Service Category
                                            </label>
                                            <select
                                                value={selectedHodCategoryId}
                                                onChange={(e) => setSelectedHodCategoryId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900"
                                            >
                                                <option value="">Select category (or pick provider)...</option>
                                                {hodCategoryOptions.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Location (State)
                                            </label>
                                            <select
                                                value={selectedHodStateSlug}
                                                onChange={(e) => setSelectedHodStateSlug(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900"
                                            >
                                                <option value="">Select state (or pick provider)...</option>
                                                {NIGERIAN_STATES.map((st) => (
                                                    <option key={st.slug} value={st.slug}>
                                                        {st.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Designated HOD (Provider)
                                            </label>
                                            <select
                                                value={selectedHodProviderUid}
                                                onChange={(e) => handleSelectHodProvider(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900"
                                            >
                                                <option value="">Select provider...</option>
                                                {sortedCandidates.map((p) => {
                                                    const tradeHint =
                                                        p.primaryService ||
                                                        (p.serviceLabels && p.serviceLabels[0]) ||
                                                        "";
                                                    const matchedSt =
                                                        matchNigerianState(p.state) ||
                                                        matchNigerianState(p.coverageArea) ||
                                                        matchNigerianState(p.address);
                                                    const stateHint = matchedSt
                                                        ? matchedSt.name
                                                        : p.state || p.coverageArea || "";
                                                    return (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.status === "approved" ? "Verified" : p.status}
                                                            {tradeHint ? ` • ${tradeHint}` : ""}
                                                            {stateHint ? ` • ${stateHint}` : ""})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Selected Provider Details Card */}
                                    {selectedHodProviderUid && (() => {
                                        const selectedProv = sortedCandidates.find(
                                            (p) => p.id === selectedHodProviderUid
                                        );
                                        if (!selectedProv) return null;

                                        const detectedState =
                                            matchNigerianState(selectedProv.state) ||
                                            matchNigerianState(selectedProv.coverageArea) ||
                                            matchNigerianState(selectedProv.address);
                                        const existingProvHodSlots = hodAssignments.filter(
                                            (h) => h.hodUid === selectedProv.id
                                        );
                                        const registeredServices =
                                            selectedProv.serviceLabels && selectedProv.serviceLabels.length > 0
                                                ? selectedProv.serviceLabels.join(", ")
                                                : selectedProv.primaryService || "Not specified on profile";
                                        const locationDisplay = [
                                            detectedState ? `${detectedState.name} State` : selectedProv.state,
                                            selectedProv.coverageArea &&
                                            selectedProv.coverageArea !== selectedProv.state
                                                ? selectedProv.coverageArea
                                                : "",
                                            selectedProv.address &&
                                            selectedProv.address !== selectedProv.coverageArea &&
                                            selectedProv.address !== selectedProv.state
                                                ? selectedProv.address
                                                : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" • ");

                                        return (
                                            <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        {selectedProv.passportUrl ? (
                                                            <img
                                                                src={selectedProv.passportUrl}
                                                                alt={selectedProv.name}
                                                                className="w-11 h-11 rounded-full object-cover border border-purple-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-800 font-bold text-sm flex items-center justify-center shrink-0">
                                                                {selectedProv.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {selectedProv.name}
                                                                </p>
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                        selectedProv.status === "approved"
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : "bg-amber-100 text-amber-800"
                                                                    }`}
                                                                >
                                                                    {selectedProv.status === "approved"
                                                                        ? "Verified Provider"
                                                                        : selectedProv.rawStatus || selectedProv.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                UID: <span className="font-mono">{selectedProv.id.slice(0, 10)}</span>
                                                                {selectedProv.idType ? ` • ID: ${selectedProv.idType}` : ""}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                                        Profile Details Loaded
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Email &amp; Phone
                                                        </p>
                                                        <p className="font-semibold text-gray-900 mt-0.5 truncate">
                                                            {selectedProv.email || "No email on file"}
                                                        </p>
                                                        <p className="text-gray-600 mt-0.5">
                                                            {selectedProv.phone || "No phone number on file"}
                                                        </p>
                                                    </div>

                                                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Registered Service Category
                                                        </p>
                                                        <p className="font-semibold text-purple-900 mt-0.5">
                                                            {registeredServices}
                                                        </p>
                                                        {selectedProv.experience && (
                                                            <p className="text-gray-600 mt-0.5">
                                                                Experience: {selectedProv.experience}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 sm:col-span-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Registered Location / Coverage Area
                                                        </p>
                                                        <p className="font-semibold text-gray-900 mt-0.5">
                                                            {locationDisplay || "No location/coverage area specified on provider profile"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {selectedProv.bio && (
                                                    <div className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        <span className="font-bold text-gray-700">Trade Bio: </span>
                                                        {selectedProv.bio}
                                                    </div>
                                                )}

                                                {existingProvHodSlots.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <span className="text-[11px] font-bold text-purple-800">
                                                            Current HOD Roles:
                                                        </span>
                                                        {existingProvHodSlots.map((slot) => (
                                                            <span
                                                                key={slot.key}
                                                                className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[11px] font-semibold"
                                                            >
                                                                {slot.categoryName} • {slot.stateName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <p className="text-[11px] text-purple-800">
                                            If an HOD already exists for this Category + State, appointing a new one will replace them.
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isSaving || !selectedHodProviderUid}
                                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                                        >
                                            {isSaving ? "Saving..." : "Appoint State HOD"}
                                        </button>
                                    </div>
                                </form>

                                {/* Current Appointed HODs List */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                        Active HOD Assignments ({displayedHods.length})
                                    </h4>
                                    {displayedHods.length === 0 ? (
                                        <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400">
                                            No State HODs appointed yet for this view. Requests without a matching State HOD automatically fall back to the Admin Dispatch Queue.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl">
                                            {displayedHods.map((h) => (
                                                <div
                                                    key={h.key}
                                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                                                                {h.categoryName}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                                                <MapPin className="w-3 h-3" />
                                                                {h.stateName} State
                                                            </span>
                                                            <span className="text-xs text-gray-400">→</span>
                                                            <span className="font-bold text-gray-900 text-sm">
                                                                HOD: {h.hodName}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {h.hodEmail || "No email"}
                                                            {h.hodPhone ? ` • Phone: ${h.hodPhone}` : ""}
                                                            {h.updatedAt
                                                                ? ` • Appointed: ${new Date(h.updatedAt).toLocaleDateString()}`
                                                                : ""}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveHod(
                                                                h.key,
                                                                `${h.categoryName} (${h.stateName})`
                                                            )
                                                        }
                                                        disabled={isSaving}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold shrink-0 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Remove HOD
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setHodModalCategory("all")}
                                    className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                                >
                                    {!isAll ? "Show all service categories →" : ""}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHodModalCategory(null)}
                                    className="px-5 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
