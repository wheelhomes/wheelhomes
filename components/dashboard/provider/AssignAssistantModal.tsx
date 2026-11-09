"use client";

import { useState, useEffect, useMemo } from "react";
import { X, UserCheck, MapPin, Phone, Users, Plus, Sparkles, Search } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    HodFieldAssistant,
    dispatchAssistantToJob,
    matchNigerianState,
    parseHodDirectoryDoc,
    slugifyCategory,
} from "@/lib/hod-routing";
import { formatJobLocation, formatRequestCode } from "@/lib/job-utils";

interface AssignAssistantModalProps {
    isOpen: boolean;
    job: any | null;
    hodUid: string;
    hodName: string;
    hodProfile?: Record<string, any> | null;
    directoryAssistants?: HodFieldAssistant[];
    onClose: () => void;
    onDispatched?: () => void;
}

const EMPTY_ASSISTANTS: HodFieldAssistant[] = [];

export default function AssignAssistantModal({
    isOpen,
    job,
    hodUid,
    hodName,
    hodProfile,
    directoryAssistants = EMPTY_ASSISTANTS,
    onClose,
    onDispatched,
}: AssignAssistantModalProps) {
    const [mode, setMode] = useState<"roster" | "new">("roster");
    const [selectedRosterId, setSelectedRosterId] = useState<string>("");
    const [rosterSearch, setRosterSearch] = useState<string>("");
    const [rosterFilter, setRosterFilter] = useState<"all" | "dept">("all");
    const [assistantName, setAssistantName] = useState("");
    const [assistantPhone, setAssistantPhone] = useState("");
    const [assistantArea, setAssistantArea] = useState("");
    const [dispatchNote, setDispatchNote] = useState("");
    const [saveToRoster, setSaveToRoster] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Department + signed-up non-HOD technicians discovered in Firestore `users`
    const [deptTechnicians, setDeptTechnicians] = useState<
        Array<{
            id: string;
            name: string;
            phone: string;
            area: string;
            category: string;
            isAppUser: boolean;
            isDeptMatch: boolean;
            isStateMatch: boolean;
        }>
    >([]);

    useEffect(() => {
        if (!isOpen || !job) return;

        // Pre-fill existing assigned assistant if reassigning
        if (job.assignedAssistant) {
            setAssistantName(job.assignedAssistant.name || "");
            setAssistantPhone(job.assignedAssistant.phone || "");
            setAssistantArea(job.assignedAssistant.area || "");
        } else {
            setAssistantName("");
            setAssistantPhone("");
            setAssistantArea(job.clientState || "");
        }
        setDispatchNote("");
        setRosterSearch("");
        setRosterFilter("all");

        // Combine HOD's saved assistants + all signed-up non-HOD service providers
        const loadTechnicians = async () => {
            try {
                const combinedMap = new Map<
                    string,
                    {
                        id: string;
                        name: string;
                        phone: string;
                        area: string;
                        category: string;
                        isAppUser: boolean;
                        isDeptMatch: boolean;
                        isStateMatch: boolean;
                    }
                >();

                // 1. From HOD's own user document (`hodAssistants`) + HOD Self-Dispatch Option
                let resolvedHodProfile = hodProfile;
                if (!resolvedHodProfile && hodUid) {
                    const hSnap = await getDoc(doc(db, "users", hodUid)).catch(() => null);
                    if (hSnap?.exists()) resolvedHodProfile = hSnap.data();
                }

                if (hodUid) {
                    const hodPhoneStr = String(
                        resolvedHodProfile?.phone ||
                        resolvedHodProfile?.phoneNumber ||
                        resolvedHodProfile?.applicationData?.phone ||
                        ""
                    ).trim();
                    combinedMap.set(hodUid, {
                        id: hodUid,
                        name: `${hodName || resolvedHodProfile?.fullName || "Me"} (Handle Myself — State HOD)`,
                        phone: hodPhoneStr,
                        area: String(job.clientState || resolvedHodProfile?.city || "State HOD"),
                        category: `${job.serviceType || "Department"} HOD`,
                        isAppUser: true,
                        isDeptMatch: true,
                        isStateMatch: true,
                    });
                }

                const userRoster: any[] = Array.isArray(resolvedHodProfile?.hodAssistants)
                    ? resolvedHodProfile.hodAssistants
                    : [];
                for (const r of userRoster) {
                    if (!r?.name) continue;
                    const id = String(r.id || r.name);
                    combinedMap.set(id, {
                        id,
                        name: String(r.name),
                        phone: String(r.phone || ""),
                        area: String(r.area || job.clientState || "Local Zone"),
                        category: String(r.categoryName || job.serviceType || "Saved Assistant"),
                        isAppUser: Boolean(r.linkedUserUid),
                        isDeptMatch: true,
                        isStateMatch: true,
                    });
                }

                const targetCategorySlug = slugifyCategory(job.serviceType || job.category || "");
                const targetState = matchNigerianState(
                    job.clientState || formatJobLocation(job.location)
                );

                const matchesTargetDepartment = (rawCat?: string | null) => {
                    if (!targetCategorySlug) return true;
                    if (!rawCat) return false;
                    const s = slugifyCategory(rawCat);
                    if (!s) return false;
                    return (
                        s === targetCategorySlug ||
                        s.includes(targetCategorySlug) ||
                        targetCategorySlug.includes(s)
                    );
                };

                // 2. From global `app_config/hod_directory` (both assistants & active HOD UIDs so we exclude other HODs)
                let resolvedDirAssistants = directoryAssistants;
                const activeHodUids = new Set<string>();
                if (hodUid) activeHodUids.add(hodUid);

                const dirSnap = await getDoc(doc(db, "app_config", "hod_directory")).catch(() => null);
                if (dirSnap?.exists()) {
                    const parsedDir = parseHodDirectoryDoc(dirSnap.data());
                    if (!resolvedDirAssistants || resolvedDirAssistants.length === 0) {
                        resolvedDirAssistants = parsedDir.assistants;
                    }
                    parsedDir.assignments.forEach((a) => {
                        if (a.isActive && a.hodUid) activeHodUids.add(a.hodUid);
                    });
                }

                for (const a of resolvedDirAssistants || []) {
                    const sameHod = a.hodUid === hodUid;
                    const isDept = matchesTargetDepartment(a.categoryName || a.categoryId);
                    const isState =
                        !targetState || slugifyCategory(a.stateSlug || a.stateName) === targetState.slug;

                    if (sameHod || (isDept && isState)) {
                        combinedMap.set(a.id, {
                            id: a.id,
                            name: a.name,
                            phone: a.phone,
                            area: a.area || a.stateName,
                            category: a.categoryName || job.serviceType || "Department Assistant",
                            isAppUser: Boolean(a.linkedUserUid),
                            isDeptMatch: true,
                            isStateMatch: true,
                        });
                    }
                }

                // 3. All signed-up Service Providers in Firestore `users` who are NOT HODs yet
                let snap = await getDocs(
                    query(
                        collection(db, "users"),
                        where("role", "==", "service_provider"),
                        where("status", "==", "approved")
                    )
                ).catch(() => null);

                // Also load any additional signed-up providers if permitted by rules
                const allProvidersSnap = await getDocs(
                    query(
                        collection(db, "users"),
                        where("role", "==", "service_provider")
                    )
                ).catch(() => null);
                if (allProvidersSnap && allProvidersSnap.docs.length > (snap?.docs.length || 0)) {
                    snap = allProvidersSnap;
                }

                snap?.docs.forEach((d) => {
                    if (d.id === hodUid) return; // Skip current HOD
                    const u = d.data();

                    // Skip providers who are already appointed as State HODs
                    if (u.isHod === true || activeHodUids.has(d.id)) return;

                    // Skip rejected / suspended / banned accounts
                    const rawStatus = String(u.status || "").trim().toLowerCase();
                    if (["rejected", "restricted", "suspended", "banned", "declined"].includes(rawStatus)) {
                        return;
                    }

                    const isExplicitlyUnderHod = u.hodUid === hodUid || u.assignedHodId === hodUid;
                    const appData = u.applicationData || {};
                    const provCategory = String(
                        u.serviceCategory ||
                        u.category ||
                        u.primaryService ||
                        u.tradeCategory ||
                        u.profession ||
                        appData.serviceCategory ||
                        appData.primaryService ||
                        appData.category ||
                        (Array.isArray(u.services) ? u.services[0] : "") ||
                        (Array.isArray(u.skills) ? u.skills[0] : "") ||
                        ""
                    ).trim();

                    const isDeptMatch = isExplicitlyUnderHod || matchesTargetDepartment(provCategory);

                    const provState = matchNigerianState(
                        u.state ||
                        u.city ||
                        (typeof u.address === "string" ? u.address : u.address?.state || u.address?.city) ||
                        appData.state ||
                        appData.city ||
                        appData.coverageArea ||
                        u.coverageArea
                    );
                    const isStateMatch =
                        isExplicitlyUnderHod ||
                        !targetState ||
                        Boolean(provState && provState.slug === targetState.slug);

                    const name = String(
                        u.fullName || u.displayName || u.name || u.businessName || appData.fullName || ""
                    ).trim();
                    if (!name) return;

                    combinedMap.set(d.id, {
                        id: d.id,
                        name,
                        phone: String(
                            u.phone || u.phoneNumber || appData.phone || appData.phoneNumber || ""
                        ).trim(),
                        area: String(
                            u.city ||
                            appData.coverageArea ||
                            u.coverageArea ||
                            u.state ||
                            provState?.name ||
                            targetState?.name ||
                            "Registered Provider"
                        ).trim(),
                        category:
                            provCategory && !["skilled-artisan", "service-provider", "provider"].includes(slugifyCategory(provCategory))
                                ? provCategory
                                : "General Specialist",
                        isAppUser: true,
                        isDeptMatch,
                        isStateMatch,
                    });
                });

                // Sort: 1) Dept + State match, 2) Dept match, 3) State match, 4) Alphabetical
                const list = Array.from(combinedMap.values()).sort((a, b) => {
                    const scoreA = (a.isDeptMatch ? 2 : 0) + (a.isStateMatch ? 1 : 0);
                    const scoreB = (b.isDeptMatch ? 2 : 0) + (b.isStateMatch ? 1 : 0);
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    return a.name.localeCompare(b.name);
                });

                setDeptTechnicians(list);
                if (list.length > 0) {
                    setMode("roster");
                    setSelectedRosterId(list[0].id);
                } else {
                    setMode("new");
                }
            } catch (err) {
                console.warn("Failed to load department technicians:", err);
                setMode("new");
            }
        };

        loadTechnicians();
        // Only run when modal opens or job/HOD changes — prevents re-render reset loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, job?.id, hodUid]);

    const filteredRoster = useMemo(() => {
        const q = rosterSearch.trim().toLowerCase();
        return deptTechnicians.filter((tech) => {
            if (rosterFilter === "dept" && !tech.isDeptMatch) return false;
            if (!q) return true;
            return (
                tech.name.toLowerCase().includes(q) ||
                tech.category.toLowerCase().includes(q) ||
                tech.area.toLowerCase().includes(q) ||
                tech.phone.toLowerCase().includes(q)
            );
        });
    }, [deptTechnicians, rosterSearch, rosterFilter]);

    const deptMatchCount = useMemo(
        () => deptTechnicians.filter((t) => t.isDeptMatch).length,
        [deptTechnicians]
    );

    if (!isOpen || !job) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let chosenName = assistantName.trim();
        let chosenPhone = assistantPhone.trim();
        let chosenArea = assistantArea.trim();
        let linkedUid: string | undefined = undefined;

        if (mode === "roster" && selectedRosterId) {
            const found = deptTechnicians.find((t) => t.id === selectedRosterId);
            if (!found) {
                alert("Please select an assistant from the list or switch to 'Enter Field Assistant'.");
                return;
            }
            chosenName = found.name;
            chosenPhone = found.phone || assistantPhone.trim() || "Contact via HOD";
            chosenArea = found.area || job.clientState || "Nearest Zone";
            linkedUid = found.isAppUser ? found.id : undefined;
        } else {
            if (!chosenName) {
                alert("Please enter the Assistant / Technician's full name.");
                return;
            }
            if (!chosenPhone) {
                alert("Please enter the Assistant / Technician's phone number so the client can identify them.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const st = matchNigerianState(job.clientState || formatJobLocation(job.location));
            await dispatchAssistantToJob({
                jobId: job.id,
                hodUid,
                hodName,
                assistant: {
                    name: chosenName,
                    phone: chosenPhone,
                    area: chosenArea || st?.name || "Nearest Zone",
                    linkedUserUid: linkedUid,
                },
                note: dispatchNote,
                clientId: job.clientId || job.userId,
                serviceType: job.serviceType,
                saveToHodRoster: mode === "new" && saveToRoster,
                stateSlug: st?.slug || "lagos",
                stateName: st?.name || job.clientState || "Lagos",
                categoryId: job.category || "",
                categoryName: job.serviceType || "",
            });

            if (onDispatched) onDispatched();
            onClose();
        } catch (err) {
            console.error("Failed to dispatch assistant:", err);
            alert("Could not dispatch assistant. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles className="w-3 h-3" />
                                HOD Field Dispatch
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-900 text-[11px] font-mono font-extrabold">
                                #{formatRequestCode(job)}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Assign Nearest Assistant / Technician
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {job.serviceType} • {formatJobLocation(job.location)} • Technician will quote <strong>#{formatRequestCode(job)}</strong> at client door
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white text-gray-500 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Mode Switcher */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode("roster")}
                            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                mode === "roster"
                                    ? "bg-white text-purple-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Department Roster ({deptTechnicians.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("new")}
                            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                mode === "new"
                                    ? "bg-white text-purple-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Enter Field Assistant
                        </button>
                    </div>

                    {mode === "roster" ? (
                        <div className="space-y-3">
                            {/* Search & Filter Bar */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={rosterSearch}
                                        onChange={(e) => setRosterSearch(e.target.value)}
                                        placeholder="Search signed-up providers by name, skill/trade, phone, or area..."
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setRosterFilter("all")}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                            rosterFilter === "all"
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        All Non-HOD Providers ({deptTechnicians.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRosterFilter("dept")}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                            rosterFilter === "dept"
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        Same Department ({deptMatchCount})
                                    </button>
                                </div>
                            </div>

                            {filteredRoster.length === 0 ? (
                                <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl text-xs text-gray-500">
                                    {deptTechnicians.length === 0 ? (
                                        <>
                                            No signed-up providers or saved assistants found yet. Click{" "}
                                            <strong>&ldquo;Enter Field Assistant&rdquo;</strong> above to add and dispatch one.
                                        </>
                                    ) : (
                                        <>
                                            No providers match your filter. Try switching to{" "}
                                            <strong>&ldquo;All Non-HOD Providers&rdquo;</strong> or clearing the search box.
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl max-h-56 overflow-y-auto">
                                    {filteredRoster.map((tech) => (
                                        <label
                                            key={tech.id}
                                            className={`flex items-center justify-between gap-3 p-3.5 cursor-pointer text-xs transition-colors ${
                                                selectedRosterId === tech.id
                                                    ? "bg-purple-50/70"
                                                    : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <input
                                                    type="radio"
                                                    name="selectedAssistant"
                                                    checked={selectedRosterId === tech.id}
                                                    onChange={() => setSelectedRosterId(tech.id)}
                                                    className="w-4 h-4 accent-purple-700"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-bold text-gray-900 truncate">
                                                            {tech.name}
                                                        </span>
                                                        {tech.isDeptMatch && (
                                                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                                                Dept Match
                                                            </span>
                                                        )}
                                                        {tech.isAppUser && (
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                                Signed-Up Pro
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 truncate mt-0.5">
                                                        <span className="font-medium text-gray-700">{tech.category}</span>
                                                        {" • "}
                                                        {tech.phone || "Phone on file"} • Zone: {tech.area}
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Assistant / Technician Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={assistantName}
                                    onChange={(e) => setAssistantName(e.target.value)}
                                    placeholder="e.g. Samuel Okafor"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Technician Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={assistantPhone}
                                            onChange={(e) => setAssistantPhone(e.target.value)}
                                            placeholder="e.g. 0803 123 4567"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Nearest Area / Zone
                                    </label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={assistantArea}
                                            onChange={(e) => setAssistantArea(e.target.value)}
                                            placeholder="e.g. Ikeja / Lekki / Wuse"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-gray-600 pt-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveToRoster}
                                    onChange={(e) => setSaveToRoster(e.target.checked)}
                                    className="w-4 h-4 accent-purple-700"
                                />
                                Save this technician to my HOD Assistant Roster for 1-click dispatch next time
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Instruction / Arrival Note for Client (Optional)
                        </label>
                        <input
                            type="text"
                            value={dispatchNote}
                            onChange={(e) => setDispatchNote(e.target.value)}
                            placeholder="e.g. Arriving within 45 mins to inspect the pipe fitting"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                        >
                            <UserCheck className="w-4 h-4" />
                            {isSubmitting ? "Dispatching..." : "Dispatch Nearest Assistant"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

