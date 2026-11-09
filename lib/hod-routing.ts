"use client";

import { useState, useEffect, useCallback } from "react";
import {
    doc,
    onSnapshot,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
    ServiceCategoryItem,
    slugifyCategory,
    resolveKeyToSingleCategoryId,
} from "./service-categories";
export { slugifyCategory };
import { generateRequestCode, formatRequestCode } from "./job-utils";
import NaijaStates from "naija-state-local-government";
import {
    sendHodAppointmentEmailAction,
    sendHodJobDispatchEmailAction,
} from "@/app/actions/email";

export const HOD_DIRECTORY_COLLECTION = "app_config";
export const HOD_DIRECTORY_DOC_ID = "hod_directory";

export interface NigerianStateOption {
    slug: string;
    name: string;
    capital: string;
    keywords: string[];
}

/**
 * Complete Nigerian States & FCT catalog with smart city/area keywords
 * so client location can be automatically detected from their profile or address.
 */
export const NIGERIAN_STATES: NigerianStateOption[] = [
    {
        slug: "lagos",
        name: "Lagos",
        capital: "Ikeja",
        keywords: [
            "lagos", "ikeja", "lekki", "victoria island", "vi", "ikoyi", "surulere",
            "yaba", "ajah", "ikorodu", "epe", "badagry", "maryland", "gbagada",
            "magodo", "ogba", "agege", "alimosho", "festac", "apapa", "oshodi",
            "isolo", "amuwo", "sangotedo", "chevron", "oniru", "banana island",
        ],
    },
    {
        slug: "abuja-fct",
        name: "Abuja (FCT)",
        capital: "Abuja",
        keywords: [
            "abuja", "fct", "federal capital", "wuse", "maitama", "garki",
            "asokoro", "gwarinpa", "jabi", "utako", "kubwa", "lugbe", "karu",
            "nyanya", "lokogoma", "apo", "guzape", "katampe", "life camp", "bwari",
            "gwagwalada", "kuje",
        ],
    },
    {
        slug: "ogun",
        name: "Ogun",
        capital: "Abeokuta",
        keywords: [
            "ogun", "abeokuta", "sango", "ota", "sango ota", "ijebu", "ijebu ode",
            "sagamu", "mowe", "ibafo", "redeemed", "arepo", "agbara", "ilaro",
        ],
    },
    {
        slug: "rivers",
        name: "Rivers",
        capital: "Port Harcourt",
        keywords: [
            "rivers", "port harcourt", "ph", "obio-akpor", "trans amadi", "gra phase",
            "rumuola", "rumuokoro", "eleme", "bonny", "oyigbo", "choba",
        ],
    },
    {
        slug: "oyo",
        name: "Oyo",
        capital: "Ibadan",
        keywords: [
            "oyo", "ibadan", "bodija", "ring road", "challenge", "agodi", "moniya",
            "ogbomosho", "iseyin", "oluyole", "akobo",
        ],
    },
    {
        slug: "enugu",
        name: "Enugu",
        capital: "Enugu",
        keywords: ["enugu", "independence layout", "new haven", "achara", "nsukka", "trans ekulu"],
    },
    {
        slug: "kano",
        name: "Kano",
        capital: "Kano",
        keywords: ["kano", "nassarawa gra", "tarauni", "fagge", "dala", "gwale"],
    },
    {
        slug: "edo",
        name: "Edo",
        capital: "Benin City",
        keywords: ["edo", "benin", "benin city", "ring road benin", "ugbowo", "ekpoma", "auchi"],
    },
    {
        slug: "delta",
        name: "Delta",
        capital: "Asaba",
        keywords: ["delta", "asaba", "warri", "effurun", "ughelli", "sapele", "agbor"],
    },
    {
        slug: "kaduna",
        name: "Kaduna",
        capital: "Kaduna",
        keywords: ["kaduna", "zaria", "barnawa", "malali", "kafanchan", "ungwan"],
    },
    {
        slug: "anambra",
        name: "Anambra",
        capital: "Awka",
        keywords: ["anambra", "awka", "onitsha", "nnewi", "ekwulobia"],
    },
    {
        slug: "akwa-ibom",
        name: "Akwa Ibom",
        capital: "Uyo",
        keywords: ["akwa ibom", "uyo", "eket", "ikot ekpene", "oron"],
    },
    {
        slug: "kwara",
        name: "Kwara",
        capital: "Ilorin",
        keywords: ["kwara", "ilorin", "tanke", "offa"],
    },
    {
        slug: "osun",
        name: "Osun",
        capital: "Osogbo",
        keywords: ["osun", "osogbo", "oshogbo", "ile-ife", "ife", "ilesa", "ede"],
    },
    {
        slug: "ondo",
        name: "Ondo",
        capital: "Akure",
        keywords: ["ondo", "akure", "owo", "ore"],
    },
    {
        slug: "ekiti",
        name: "Ekiti",
        capital: "Ado-Ekiti",
        keywords: ["ekiti", "ado-ekiti", "ado ekiti", "ikere"],
    },
    {
        slug: "plateau",
        name: "Plateau",
        capital: "Jos",
        keywords: ["plateau", "jos", "bukuru", "rayfield"],
    },
    {
        slug: "cross-river",
        name: "Cross River",
        capital: "Calabar",
        keywords: ["cross river", "calabar", "ikom", "ogoja"],
    },
    {
        slug: "abia",
        name: "Abia",
        capital: "Umuahia",
        keywords: ["abia", "umuahia", "aba"],
    },
    {
        slug: "imo",
        name: "Imo",
        capital: "Owerri",
        keywords: ["imo", "owerri", "orlu", "okigwe"],
    },
    {
        slug: "kogi",
        name: "Kogi",
        capital: "Lokoja",
        keywords: ["kogi", "lokoja", "okene", "anyigba"],
    },
    {
        slug: "niger",
        name: "Niger",
        capital: "Minna",
        keywords: ["niger state", "minna", "suleja", "bida"],
    },
    {
        slug: "nasarawa",
        name: "Nasarawa",
        capital: "Lafia",
        keywords: ["nasarawa", "lafia", "keffi", "mararaba"],
    },
    {
        slug: "benue",
        name: "Benue",
        capital: "Makurdi",
        keywords: ["benue", "makurdi", "gboko", "otukpo"],
    },
    {
        slug: "bayelsa",
        name: "Bayelsa",
        capital: "Yenagoa",
        keywords: ["bayelsa", "yenagoa"],
    },
    {
        slug: "ebonyi",
        name: "Ebonyi",
        capital: "Abakaliki",
        keywords: ["ebonyi", "abakaliki"],
    },
    {
        slug: "bauchi",
        name: "Bauchi",
        capital: "Bauchi",
        keywords: ["bauchi"],
    },
    {
        slug: "borno",
        name: "Borno",
        capital: "Maiduguri",
        keywords: ["borno", "maiduguri"],
    },
    {
        slug: "adamawa",
        name: "Adamawa",
        capital: "Yola",
        keywords: ["adamawa", "yola", "jimeta"],
    },
    {
        slug: "gombe",
        name: "Gombe",
        capital: "Gombe",
        keywords: ["gombe"],
    },
    {
        slug: "taraba",
        name: "Taraba",
        capital: "Jalingo",
        keywords: ["taraba", "jalingo"],
    },
    {
        slug: "yobe",
        name: "Yobe",
        capital: "Damaturu",
        keywords: ["yobe", "damaturu"],
    },
    {
        slug: "katsina",
        name: "Katsina",
        capital: "Katsina",
        keywords: ["katsina", "funtua", "daura"],
    },
    {
        slug: "jigawa",
        name: "Jigawa",
        capital: "Dutse",
        keywords: ["jigawa", "dutse"],
    },
    {
        slug: "kebbi",
        name: "Kebbi",
        capital: "Birnin Kebbi",
        keywords: ["kebbi", "birnin kebbi"],
    },
    {
        slug: "sokoto",
        name: "Sokoto",
        capital: "Sokoto",
        keywords: ["sokoto"],
    },
    {
        slug: "zamfara",
        name: "Zamfara",
        capital: "Gusau",
        keywords: ["zamfara", "gusau"],
    },
];

/**
 * Normalizes any raw state/city/address string (or address object) to a canonical NigerianStateOption.
 */
export function matchNigerianState(rawInput?: any): NigerianStateOption | null {
    if (!rawInput) return null;

    if (typeof rawInput === "object") {
        return (
            matchNigerianState(rawInput.state) ||
            matchNigerianState(rawInput.city) ||
            matchNigerianState(rawInput.lga) ||
            matchNigerianState(rawInput.address) ||
            matchNigerianState(rawInput.street) ||
            null
        );
    }

    if (typeof rawInput !== "string") return null;
    const cleaned = rawInput
        .toLowerCase()
        .replace(/\[object object\]/g, "")
        .replace(/\bstate\b/g, "")
        .replace(/\bnigeria\b/g, "")
        .replace(/\bgeneral coverage\b/g, "")
        .replace(/[,.;()/-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return null;

    // 1. Exact state name or slug match (including FCT aliases)
    if (
        cleaned === "fct" ||
        cleaned === "federal capital territory" ||
        cleaned === "abuja fct" ||
        cleaned === "fct abuja"
    ) {
        return NIGERIAN_STATES.find((s) => s.slug === "abuja-fct") || null;
    }

    for (const st of NIGERIAN_STATES) {
        if (
            st.slug === cleaned ||
            st.name.toLowerCase() === cleaned ||
            st.capital.toLowerCase() === cleaned
        ) {
            return st;
        }
    }

    // 2. Word-boundary keyword match (cities, neighborhoods, state names)
    for (const st of NIGERIAN_STATES) {
        for (const kw of st.keywords) {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i");
            if (regex.test(cleaned)) {
                return st;
            }
        }
    }

    // 3. Substring fallback for state name
    for (const st of NIGERIAN_STATES) {
        const baseName = st.name.toLowerCase().split(" ")[0];
        if (baseName.length >= 3 && cleaned.includes(baseName)) {
            return st;
        }
    }

    // 4. All 774 Nigerian LGAs lookup via naija-state-local-government
    try {
        const allStateNames: string[] = NaijaStates.states() || [];
        for (const stateName of allStateNames) {
            const lgaObj = NaijaStates.lgas(stateName);
            const lgas: string[] = lgaObj?.lgas || [];
            for (const lga of lgas) {
                const cleanLga = lga
                    .toLowerCase()
                    .replace(/[,.;()/-]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                if (
                    cleanLga.length >= 3 &&
                    (cleaned === cleanLga || cleaned.includes(cleanLga))
                ) {
                    const resolved =
                        stateName.toLowerCase().includes("federal capital")
                            ? NIGERIAN_STATES.find((s) => s.slug === "abuja-fct")
                            : NIGERIAN_STATES.find(
                                  (s) =>
                                      s.name.toLowerCase() === stateName.toLowerCase() ||
                                      s.slug === slugifyCategory(stateName)
                              );
                    if (resolved) return resolved;
                }
            }
        }
    } catch (_) {
        // Ignore if NaijaStates lookup fails
    }

    return null;
}

/**
 * Step 2 of HOD Routing: Automatically detects the client's or provider's state
 * from their registered profile (`state`, `address.state`, `coverageArea`, `city`, `address`, `location`)
 * or from the typed address.
 */
export function detectClientState(
    userProfile?: Record<string, any> | null,
    typedAddress?: string | null
): {
    stateSlug: string;
    stateName: string;
    detectedFrom: "profile_state" | "profile_city" | "profile_address" | "typed_address" | "default";
} {
    if (userProfile) {
        const appData = userProfile.applicationData || {};
        const addrObj =
            typeof userProfile.address === "object" && userProfile.address
                ? userProfile.address
                : {};
        const locObj =
            typeof userProfile.location === "object" && userProfile.location
                ? userProfile.location
                : {};

        const fromState =
            matchNigerianState(userProfile.state) ||
            matchNigerianState(addrObj.state) ||
            matchNigerianState(locObj.state) ||
            matchNigerianState(appData.state) ||
            matchNigerianState(userProfile.stateOfResidence);
        if (fromState) {
            return {
                stateSlug: fromState.slug,
                stateName: fromState.name,
                detectedFrom: "profile_state",
            };
        }

        const fromCity =
            matchNigerianState(userProfile.city) ||
            matchNigerianState(addrObj.city) ||
            matchNigerianState(locObj.city) ||
            matchNigerianState(userProfile.lga) ||
            matchNigerianState(userProfile.coverageArea) ||
            matchNigerianState(appData.coverageArea) ||
            matchNigerianState(appData.city);
        if (fromCity) {
            return {
                stateSlug: fromCity.slug,
                stateName: fromCity.name,
                detectedFrom: "profile_city",
            };
        }

        const fromProfileAddr =
            matchNigerianState(typeof userProfile.location === "string" ? userProfile.location : locObj.address) ||
            matchNigerianState(typeof userProfile.address === "string" ? userProfile.address : addrObj.street) ||
            matchNigerianState(appData.location) ||
            matchNigerianState(appData.address) ||
            matchNigerianState(userProfile.bio) ||
            matchNigerianState(userProfile.description);
        if (fromProfileAddr) {
            return {
                stateSlug: fromProfileAddr.slug,
                stateName: fromProfileAddr.name,
                detectedFrom: "profile_address",
            };
        }
    }

    if (typedAddress) {
        const fromTyped = matchNigerianState(typedAddress);
        if (fromTyped) {
            return {
                stateSlug: fromTyped.slug,
                stateName: fromTyped.name,
                detectedFrom: "typed_address",
            };
        }
    }

    // Default to Lagos if neither profile nor address specifies a state yet
    return {
        stateSlug: "lagos",
        stateName: "Lagos",
        detectedFrom: "default",
    };
}

// ---------------------------------------------------------------------------
// HOD & Assistant Data Structures
// ---------------------------------------------------------------------------

/**
 * Represents the 1 designated Head of Department (HOD) for a specific
 * (Service Category + State) combination.
 * Rule: 1 Service Category + 1 State = 1 HOD
 */
export interface HodAssignment {
    /** Canonical composite key: `${categoryId}__${stateSlug}` */
    key: string;
    categoryId: string;
    categoryName: string;
    stateSlug: string;
    stateName: string;
    hodUid: string;
    hodName: string;
    hodEmail: string;
    hodPhone: string;
    isActive: boolean;
    updatedAt: string;
    updatedBy?: string;
}

/**
 * Field Technician / Assistant working under an HOD in a specific State & Category.
 */
export interface HodFieldAssistant {
    id: string;
    hodUid: string;
    name: string;
    phone: string;
    /** Neighborhood / Zone within the state (e.g. "Lekki", "Ikeja", "Surulere", "Wuse") */
    area: string;
    stateSlug: string;
    stateName: string;
    categoryId: string;
    categoryName: string;
    /** Optional UID if this assistant also has a registered provider account */
    linkedUserUid?: string;
    isAvailable: boolean;
    createdAt: string;
}

/**
 * Stored on `job_requests/{id}` and `requests/{id}` when the HOD dispatches an assistant.
 */
export interface DispatchedAssistantInfo {
    id: string;
    name: string;
    phone: string;
    area: string;
    linkedUserUid?: string;
    assignedByHodUid: string;
    assignedByHodName: string;
    assignedAt: string;
    note?: string;
}

export function buildHodKey(categoryId: string, stateSlug: string): string {
    return `${slugifyCategory(categoryId)}__${slugifyCategory(stateSlug)}`;
}

// ---------------------------------------------------------------------------
// Firestore Persistence & Real-Time Hook for HOD Directory
// ---------------------------------------------------------------------------

export function parseHodDirectoryDoc(data?: Record<string, any> | null): {
    assignments: HodAssignment[];
    assistants: HodFieldAssistant[];
} {
    if (!data) return { assignments: [], assistants: [] };

    const rawAssignments = Array.isArray(data.assignments) ? data.assignments : [];
    const byKey = new Map<string, HodAssignment>();
    for (const raw of rawAssignments) {
        if (!raw || !raw.categoryId || !raw.stateSlug || !raw.hodUid) continue;
        const key = buildHodKey(raw.categoryId, raw.stateSlug);
        byKey.set(key, {
            key,
            categoryId: String(raw.categoryId),
            categoryName: String(raw.categoryName || raw.categoryId),
            stateSlug: String(raw.stateSlug),
            stateName: String(raw.stateName || raw.stateSlug),
            hodUid: String(raw.hodUid),
            hodName: String(raw.hodName || "Department Head"),
            hodEmail: String(raw.hodEmail || ""),
            hodPhone: String(raw.hodPhone || ""),
            isActive: raw.isActive !== false,
            updatedAt: String(raw.updatedAt || ""),
            updatedBy: raw.updatedBy ? String(raw.updatedBy) : undefined,
        });
    }

    const rawAssistants = Array.isArray(data.assistants) ? data.assistants : [];
    const assistants: HodFieldAssistant[] = rawAssistants
        .filter((a: any) => a && a.id && a.name)
        .map((a: any) => ({
            id: String(a.id),
            hodUid: String(a.hodUid || ""),
            name: String(a.name).trim(),
            phone: String(a.phone || "").trim(),
            area: String(a.area || "General Area").trim(),
            stateSlug: String(a.stateSlug || "lagos"),
            stateName: String(a.stateName || "Lagos"),
            categoryId: String(a.categoryId || ""),
            categoryName: String(a.categoryName || ""),
            linkedUserUid: a.linkedUserUid ? String(a.linkedUserUid) : undefined,
            isAvailable: a.isAvailable !== false,
            createdAt: String(a.createdAt || ""),
        }));

    return {
        assignments: Array.from(byKey.values()),
        assistants,
    };
}

export function useHodDirectory() {
    const [assignments, setAssignments] = useState<HodAssignment[]>([]);
    const [assistants, setAssistants] = useState<HodFieldAssistant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const snap = await getDoc(doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID));
            if (snap.exists()) {
                const parsed = parseHodDirectoryDoc(snap.data());
                setAssignments(parsed.assignments);
                setAssistants(parsed.assistants);
            }
        } catch (err) {
            console.warn("[useHodDirectory] Failed to read hod_directory:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const ref = doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    const parsed = parseHodDirectoryDoc(snap.data());
                    setAssignments(parsed.assignments);
                    setAssistants(parsed.assistants);
                } else {
                    setAssignments([]);
                    setAssistants([]);
                }
                setIsLoading(false);
            },
            (err) => {
                console.warn("[useHodDirectory] Snapshot notice:", err);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    return {
        assignments,
        activeAssignments: assignments.filter((a) => a.isActive),
        assistants,
        isLoading,
        refresh,
    };
}

/**
 * Appoints or updates the single HOD for a given (Service Category + State).
 * Enforces: 1 Category + 1 State = 1 HOD.
 */
export async function assignHodForCategoryAndState(params: {
    categoryId: string;
    categoryName: string;
    stateSlug: string;
    stateName: string;
    hodUid: string;
    hodName: string;
    hodEmail?: string;
    hodPhone?: string;
    adminEmail?: string | null;
}): Promise<HodAssignment> {
    const ref = doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID);
    const snap = await getDoc(ref).catch(() => null);
    const existing = snap?.exists()
        ? parseHodDirectoryDoc(snap.data())
        : { assignments: [], assistants: [] };

    const key = buildHodKey(params.categoryId, params.stateSlug);
    const now = new Date().toISOString();

    // Ensure we have the provider's latest email & phone from `users/{hodUid}` if not passed
    let resolvedEmail = (params.hodEmail || "").trim();
    let resolvedPhone = (params.hodPhone || "").trim();
    let resolvedName = (params.hodName || "").trim();
    if (!resolvedEmail || !resolvedPhone) {
        const userSnap = await getDoc(doc(db, "users", params.hodUid)).catch(() => null);
        if (userSnap && userSnap.exists()) {
            const uData = userSnap.data();
            if (!resolvedEmail) {
                resolvedEmail = String(
                    uData.email || uData.applicationData?.email || ""
                ).trim();
            }
            if (!resolvedPhone) {
                resolvedPhone = String(
                    uData.phoneNumber ||
                        uData.phone ||
                        uData.applicationData?.phoneNumber ||
                        uData.applicationData?.phone ||
                        ""
                ).trim();
            }
            if (!resolvedName) {
                resolvedName = String(
                    uData.fullName || uData.displayName || uData.businessName || "State HOD"
                ).trim();
            }
        }
    }

    const newAssignment: HodAssignment = {
        key,
        categoryId: params.categoryId,
        categoryName: params.categoryName,
        stateSlug: params.stateSlug,
        stateName: params.stateName,
        hodUid: params.hodUid,
        hodName: resolvedName || params.hodName,
        hodEmail: resolvedEmail,
        hodPhone: resolvedPhone,
        isActive: true,
        updatedAt: now,
        updatedBy: params.adminEmail || "admin",
    };

    const updatedAssignments = [
        ...existing.assignments.filter((a) => a.key !== key),
        newAssignment,
    ];

    await setDoc(
        ref,
        {
            assignments: updatedAssignments,
            assistants: existing.assistants,
            updatedAt: now,
            updatedBy: params.adminEmail || "admin",
        },
        { merge: true }
    );

    // Mirror HOD badge onto the provider's user profile for quick reference
    const providerHodList = updatedAssignments
        .filter((a) => a.hodUid === params.hodUid && a.isActive)
        .map((a) => ({
            key: a.key,
            categoryId: a.categoryId,
            categoryName: a.categoryName,
            stateSlug: a.stateSlug,
            stateName: a.stateName,
        }));

    await updateDoc(doc(db, "users", params.hodUid), {
        isHod: providerHodList.length > 0,
        hodDepartments: providerHodList,
        state: params.stateName,
        serviceCategory: params.categoryName,
        "applicationData.serviceCategory": params.categoryName,
        "applicationData.state": params.stateName,
        updatedAt: now,
    }).catch(() => {});

    // 1. Create In-App Notification for the appointed HOD
    await addDoc(collection(db, "notifications"), {
        userId: params.hodUid,
        recipientId: params.hodUid,
        title: `Appointed as ${params.stateName} State HOD 👑`,
        message: `You have been officially appointed as the Head of Department (HOD) for ${params.categoryName} in ${params.stateName}. Client requests in ${params.stateName} for ${params.categoryName} will now route directly to your dashboard.`,
        body: `You have been officially appointed as the Head of Department (HOD) for ${params.categoryName} in ${params.stateName}. Client requests in ${params.stateName} for ${params.categoryName} will now route directly to your dashboard.`,
        type: "success",
        read: false,
        isRead: false,
        createdAt: now,
    }).catch(() => {});

    // 2. Dispatch Official HOD Appointment Email to the Provider
    if (resolvedEmail) {
        sendHodAppointmentEmailAction({
            email: resolvedEmail,
            name: resolvedName || params.hodName,
            categoryName: params.categoryName,
            stateName: params.stateName,
        }).catch((err) => {
            console.warn("[assignHodForCategoryAndState] Email notice:", err);
        });
    }

    return newAssignment;
}

/**
 * Removes an HOD assignment for a specific (Category + State).
 */
export async function removeHodAssignment(
    key: string,
    adminEmail?: string | null
): Promise<void> {
    const ref = doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID);
    const snap = await getDoc(ref).catch(() => null);
    if (!snap || !snap.exists()) return;

    const existing = parseHodDirectoryDoc(snap.data());
    const target = existing.assignments.find((a) => a.key === key);
    const updatedAssignments = existing.assignments.filter((a) => a.key !== key);
    const now = new Date().toISOString();

    await setDoc(
        ref,
        {
            assignments: updatedAssignments,
            assistants: existing.assistants,
            updatedAt: now,
            updatedBy: adminEmail || "admin",
        },
        { merge: true }
    );

    if (target?.hodUid) {
        const remaining = updatedAssignments
            .filter((a) => a.hodUid === target.hodUid && a.isActive)
            .map((a) => ({
                key: a.key,
                categoryId: a.categoryId,
                categoryName: a.categoryName,
                stateSlug: a.stateSlug,
                stateName: a.stateName,
            }));
        await updateDoc(doc(db, "users", target.hodUid), {
            isHod: remaining.length > 0,
            hodDepartments: remaining,
            updatedAt: now,
        }).catch(() => {});
    }
}

/**
 * Finds the single designated HOD for (Service Category + State).
 * Rule: 1 Request = 1 Category + 1 Location = 1 HOD.
 */
export function findDesignatedHod(params: {
    assignments: HodAssignment[];
    categories: ServiceCategoryItem[];
    serviceCategoryInput: string;
    stateInput: string;
}): {
    hod: HodAssignment | null;
    matchedCategoryId: string;
    matchedCategoryName: string;
    matchedStateSlug: string;
    matchedStateName: string;
} {
    const { assignments, categories, serviceCategoryInput, stateInput } = params;

    // 1. Resolve canonical category
    const rawCatKey = slugifyCategory(serviceCategoryInput);
    const resolvedCatId =
        resolveKeyToSingleCategoryId(rawCatKey, categories) || rawCatKey;
    const matchedCatObj = categories.find((c) => c.id === resolvedCatId);
    const matchedCategoryName = matchedCatObj?.name || serviceCategoryInput;

    // 2. Resolve canonical Nigerian state
    const stateMatch = matchNigerianState(stateInput) || NIGERIAN_STATES[0];
    const matchedStateSlug = stateMatch.slug;
    const matchedStateName = stateMatch.name;

    // 3. Exact match on (Category + State)
    const compositeKey = buildHodKey(resolvedCatId, matchedStateSlug);
    const exact = assignments.find((a) => a.isActive && a.key === compositeKey);
    if (exact) {
        return {
            hod: exact,
            matchedCategoryId: resolvedCatId,
            matchedCategoryName,
            matchedStateSlug,
            matchedStateName,
        };
    }

    // 4. Secondary check: match category by resolveKeyToSingleCategoryId in case categoryId was renamed
    const fallbackMatch = assignments.find((a) => {
        if (!a.isActive || a.stateSlug !== matchedStateSlug) return false;
        const aCatResolved =
            resolveKeyToSingleCategoryId(slugifyCategory(a.categoryId), categories) ||
            resolveKeyToSingleCategoryId(slugifyCategory(a.categoryName), categories) ||
            slugifyCategory(a.categoryId);
        return aCatResolved === resolvedCatId;
    });

    return {
        hod: fallbackMatch || null,
        matchedCategoryId: resolvedCatId,
        matchedCategoryName,
        matchedStateSlug,
        matchedStateName,
    };
}

/**
 * Step 3 & Step 4 of HOD Routing:
 * Performs smart matching (Category + Client State) at request creation time
 * and returns the exact document payload fields so the request goes ONLY to:
 * - The 1 designated HOD for that Category + State (if appointed), OR
 * - The Central Admin Dispatch queue (if no HOD is appointed for that Category + State yet).
 * Never broadcasts to all providers in the open marketplace.
 */
export async function resolveAndRouteServiceRequest(params: {
    clientId: string;
    clientName?: string;
    serviceCategoryInput: string;
    description: string;
    addressText: string;
    preferredTime?: string;
    explicitStateInput?: string;
    budget?: number;
    photos?: string[];
    categories: ServiceCategoryItem[];
}): Promise<{
    docData: Record<string, any>;
    hod: HodAssignment | null;
    matchedCategoryName: string;
    matchedStateName: string;
    routingMode: "hod_direct" | "admin_fallback";
}> {
    // 1. Load client profile to auto-detect registered location/state if not explicitly overridden
    const [clientDocSnap, hodDocSnap] = await Promise.all([
        getDoc(doc(db, "users", params.clientId)).catch(() => null),
        getDoc(doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID)).catch(() => null),
    ]);

    const clientData = clientDocSnap?.exists() ? clientDocSnap.data() : null;
    const resolvedClientName =
        params.clientName ||
        clientData?.fullName ||
        clientData?.displayName ||
        clientData?.email ||
        "Client";

    const detected = params.explicitStateInput
        ? (() => {
              const m = matchNigerianState(params.explicitStateInput);
              return m
                  ? { stateSlug: m.slug, stateName: m.name, detectedFrom: "typed_address" as const }
                  : detectClientState(clientData, params.addressText);
          })()
        : detectClientState(clientData, params.addressText);

    const { assignments } = hodDocSnap?.exists()
        ? parseHodDirectoryDoc(hodDocSnap.data())
        : { assignments: [] };

    const {
        hod,
        matchedCategoryId,
        matchedCategoryName,
        matchedStateSlug,
        matchedStateName,
    } = findDesignatedHod({
        assignments,
        categories: params.categories,
        serviceCategoryInput: params.serviceCategoryInput,
        stateInput: detected.stateName,
    });

    const nowIso = new Date().toISOString();
    const routingMode: "hod_direct" | "admin_fallback" = hod ? "hod_direct" : "admin_fallback";

    const fullAddress = params.addressText.toLowerCase().includes(matchedStateName.toLowerCase())
        ? params.addressText.trim()
        : `${params.addressText.trim()}, ${matchedStateName}`;

    const requestCode = generateRequestCode();

    const docData: Record<string, any> = {
        requestCode,
        trackingId: requestCode,
        clientId: params.clientId,
        userId: params.clientId,
        clientName: resolvedClientName,
        category: matchedCategoryId,
        serviceType: matchedCategoryName,
        description: params.description.trim(),
        location: fullAddress,
        clientState: matchedStateName,
        clientStateSlug: matchedStateSlug,
        locationDetectedFrom: detected.detectedFrom,
        preferredTime: params.preferredTime || "As soon as possible",
        budget: Number(params.budget) || 0,
        price: Number(params.budget) || 0,
        // Never 'open' — requests never broadcast to all providers
        status: "pending",
        routingMode,
        routingStatus: hod ? "awaiting_hod_dispatch" : "awaiting_admin_assignment",
        hodId: hod ? hod.hodUid : "",
        hodName: hod ? hod.hodName : "",
        hodPhone: hod ? hod.hodPhone : "",
        hodDepartment: `${matchedCategoryName} — ${matchedStateName}`,
        // Setting providerId to hod.hodUid routes the job directly to that 1 HOD's dashboard
        providerId: hod ? hod.hodUid : "",
        providerName: hod ? `${hod.hodName} (HOD • ${matchedStateName})` : "",
        invitedProviderIds: hod ? [hod.hodUid] : [],
        autoAssign: false,
        isPublicMarket: false,
        paymentStatus: "unpaid",
        photos: params.photos || [],
        images: params.photos || [],
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    return {
        docData,
        hod,
        matchedCategoryName,
        matchedStateName,
        routingMode,
    };
}

/**
 * Step 5 of HOD Routing:
 * Allows the designated HOD (or Admin) to dispatch the nearest Assistant / Technician
 * under them to the client's location.
 */
export async function dispatchAssistantToJob(params: {
    jobId: string;
    hodUid: string;
    hodName: string;
    assistant: {
        id?: string;
        name: string;
        phone: string;
        area: string;
        linkedUserUid?: string;
    };
    note?: string;
    clientId?: string;
    serviceType?: string;
    saveToHodRoster?: boolean;
    stateSlug?: string;
    stateName?: string;
    categoryId?: string;
    categoryName?: string;
}): Promise<DispatchedAssistantInfo> {
    const now = new Date().toISOString();
    const assistantId = params.assistant.id || `ast_${Date.now()}`;

    const cleanLinkedUid = params.assistant.linkedUserUid?.trim() || "";
    const cleanNote = params.note?.trim() || "";

    const dispatchedInfo: DispatchedAssistantInfo = {
        id: assistantId,
        name: params.assistant.name.trim(),
        phone: params.assistant.phone.trim(),
        area: params.assistant.area.trim() || "Nearest Zone",
        ...(cleanLinkedUid ? { linkedUserUid: cleanLinkedUid } : {}),
        assignedByHodUid: params.hodUid,
        assignedByHodName: params.hodName,
        assignedAt: now,
        ...(cleanNote ? { note: cleanNote } : {}),
    };

    const invitedIds = Array.from(
        new Set(
            [params.hodUid, cleanLinkedUid].filter(
                (x): x is string => Boolean(x && x.trim())
            )
        )
    );

    const updates: Record<string, any> = {
        status: "accepted",
        providerId: params.hodUid,
        hodId: params.hodUid,
        hodName: params.hodName,
        routingStatus: "assistant_dispatched",
        assignedAssistant: dispatchedInfo,
        assistantName: dispatchedInfo.name,
        assistantPhone: dispatchedInfo.phone,
        assistantArea: dispatchedInfo.area,
        invitedProviderIds: invitedIds,
        acceptedAt: now,
        updatedAt: now,
    };

    await Promise.all([
        updateDoc(doc(db, "job_requests", params.jobId), updates),
        updateDoc(doc(db, "requests", params.jobId), updates).catch(() => {}),
    ]);

    // Optionally save new field assistant to the HOD's reusable roster if requested
    if (params.saveToHodRoster) {
        try {
            const ref = doc(db, HOD_DIRECTORY_COLLECTION, HOD_DIRECTORY_DOC_ID);
            const snap = await getDoc(ref).catch(() => null);
            const existing = snap?.exists()
                ? parseHodDirectoryDoc(snap.data())
                : { assignments: [], assistants: [] };

            const alreadyExists = existing.assistants.some(
                (a) =>
                    a.hodUid === params.hodUid &&
                    a.name.toLowerCase() === dispatchedInfo.name.toLowerCase()
            );

            if (!alreadyExists) {
                const newRosterItem: HodFieldAssistant = {
                    id: assistantId,
                    hodUid: params.hodUid,
                    name: dispatchedInfo.name,
                    phone: dispatchedInfo.phone,
                    area: dispatchedInfo.area,
                    stateSlug: params.stateSlug || "lagos",
                    stateName: params.stateName || "Lagos",
                    categoryId: params.categoryId || "",
                    categoryName: params.categoryName || params.serviceType || "",
                    ...(cleanLinkedUid ? { linkedUserUid: cleanLinkedUid } : {}),
                    isAvailable: true,
                    createdAt: now,
                };
                await setDoc(
                    ref,
                    {
                        assistants: [...existing.assistants, newRosterItem],
                        updatedAt: now,
                    },
                    { merge: true }
                );
            }
        } catch (_) {
            // Non-critical if non-admin HOD cannot write to app_config; also store on HOD's user doc
        }

        // Also store on the HOD's own `users/{hodUid}` document (which the HOD owns and can always update)
        try {
            const hodUserRef = doc(db, "users", params.hodUid);
            const hodSnap = await getDoc(hodUserRef);
            if (hodSnap.exists()) {
                const currentRoster: any[] = Array.isArray(hodSnap.data().hodAssistants)
                    ? hodSnap.data().hodAssistants
                    : [];
                const existsInUserDoc = currentRoster.some(
                    (a) => String(a.name || "").toLowerCase() === dispatchedInfo.name.toLowerCase()
                );
                if (!existsInUserDoc) {
                    await updateDoc(hodUserRef, {
                        hodAssistants: [
                            ...currentRoster,
                            {
                                id: assistantId,
                                name: dispatchedInfo.name,
                                phone: dispatchedInfo.phone,
                                area: dispatchedInfo.area,
                                linkedUserUid: params.assistant.linkedUserUid || "",
                                createdAt: now,
                            },
                        ],
                    });
                }
            }
        } catch (_) {}
    }

    // Notify the Client that their HOD has dispatched the nearest technician
    const reqCode = formatRequestCode({ id: params.jobId });
    if (params.clientId) {
        await addDoc(collection(db, "notifications"), {
            userId: params.clientId,
            recipientId: params.clientId,
            title: `Technician Dispatched (${reqCode}) 🛠️`,
            message: `${params.hodName} has assigned ${dispatchedInfo.name} (${dispatchedInfo.phone} • ${dispatchedInfo.area}) for Request #${reqCode}. Ask the technician to quote #${reqCode} at your door.`,
            body: `${params.hodName} has assigned ${dispatchedInfo.name} (${dispatchedInfo.phone} • ${dispatchedInfo.area}) for Request #${reqCode}. Ask the technician to quote #${reqCode} at your door.`,
            type: "success",
            read: false,
            isRead: false,
            createdAt: now,
            payload: { jobId: params.jobId, requestCode: reqCode },
        }).catch(() => {});
    }

    // If the assistant has a linked app account, notify them too
    if (params.assistant.linkedUserUid && params.assistant.linkedUserUid !== params.hodUid) {
        await addDoc(collection(db, "notifications"), {
            userId: params.assistant.linkedUserUid,
            recipientId: params.assistant.linkedUserUid,
            title: `New Field Dispatch (#${reqCode}) 📍`,
            message: `Your HOD (${params.hodName}) assigned you to ${params.serviceType || "service"} job #${reqCode} in ${dispatchedInfo.area}. Quote Request ID #${reqCode} to the client upon arrival.`,
            body: `Your HOD (${params.hodName}) assigned you to ${params.serviceType || "service"} job #${reqCode} in ${dispatchedInfo.area}. Quote Request ID #${reqCode} to the client upon arrival.`,
            type: "info",
            read: false,
            isRead: false,
            createdAt: now,
            payload: { jobId: params.jobId, requestCode: reqCode },
        }).catch(() => {});
    }

    return dispatchedInfo;
}

/**
 * Allows the Admin to route or reassign a job request to a specific HOD (or directly to a technician).
 */
export async function assignJobToHodByAdmin(params: {
    jobId: string;
    hodUid: string;
    hodName: string;
    hodPhone?: string;
    stateName: string;
    categoryName: string;
    clientId?: string;
}): Promise<void> {
    const now = new Date().toISOString();
    const updates = {
        status: "pending",
        routingMode: "hod_direct",
        routingStatus: "awaiting_hod_dispatch",
        hodId: params.hodUid,
        hodName: params.hodName,
        hodPhone: params.hodPhone || "",
        hodDepartment: `${params.categoryName} — ${params.stateName}`,
        providerId: params.hodUid,
        providerName: `${params.hodName} (HOD • ${params.stateName})`,
        invitedProviderIds: [params.hodUid],
        updatedAt: now,
    };

    await Promise.all([
        updateDoc(doc(db, "job_requests", params.jobId), updates).catch(() => {}),
        updateDoc(doc(db, "requests", params.jobId), updates).catch(() => {}),
    ]);

    // Notify the HOD in-app
    await addDoc(collection(db, "notifications"), {
        userId: params.hodUid,
        recipientId: params.hodUid,
        title: `New ${params.categoryName} Request (${params.stateName}) 📋`,
        message: `A client request in ${params.stateName} has been routed to you as HOD. Please review and dispatch the nearest assistant.`,
        body: `A client request in ${params.stateName} has been routed to you as HOD. Please review and dispatch the nearest assistant.`,
        type: "info",
        read: false,
        isRead: false,
        createdAt: now,
        payload: { jobId: params.jobId },
    }).catch(() => {});

    // Also email the HOD about the newly routed request
    try {
        const [hodUserSnap, jobSnap] = await Promise.all([
            getDoc(doc(db, "users", params.hodUid)).catch(() => null),
            getDoc(doc(db, "job_requests", params.jobId)).catch(() => null),
        ]);
        const hodEmail = String(
            hodUserSnap?.data()?.email ||
                hodUserSnap?.data()?.applicationData?.email ||
                ""
        ).trim();
        const jobData = jobSnap?.exists() ? jobSnap.data() : {};
        if (hodEmail) {
            sendHodJobDispatchEmailAction({
                email: hodEmail,
                hodName: params.hodName,
                categoryName: params.categoryName,
                stateName: params.stateName,
                clientName: String(jobData?.clientName || "Verified Client"),
                location: String(jobData?.location || params.stateName),
                description: String(
                    jobData?.description || `${params.categoryName} service request`
                ),
                preferredTime: String(jobData?.preferredTime || "As soon as possible"),
            }).catch(() => {});
        }
    } catch (_) {}
}

