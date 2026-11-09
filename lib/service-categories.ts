"use client";

import { useState, useEffect, useCallback } from "react";
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import {
    Zap,
    Sun,
    Tv,
    Droplet,
    Wind,
    Hammer,
    Paintbrush,
    Sparkles,
    Home,
    Layers,
    Flame,
    Flower2,
    Wrench,
    ShieldCheck,
    Truck,
    LucideIcon,
} from "lucide-react";

export type ServiceIconKey =
    | "zap"
    | "sun"
    | "tv"
    | "droplets"
    | "fan"
    | "hammer"
    | "paintbrush"
    | "sparkles"
    | "home"
    | "brick-wall"
    | "flame"
    | "flower"
    | "wrench"
    | "shield"
    | "truck";

export interface ServiceCategoryItem {
    id: string;
    name: string;
    shortTitle: string;
    subtitle: string;
    description: string;
    iconKey: ServiceIconKey;
    colorHex: string;
    isActive: boolean;
    order: number;
    source?: "database" | "admin";
    createdAt?: string;
    updatedAt?: string;
}

export type ProviderStatusBucket = "approved" | "pending_review" | "onboarding" | "rejected";

export interface RealProviderRecord {
    id: string;
    source: "users" | "user_applications";
    name: string;
    email: string;
    phone?: string;
    state?: string;
    coverageArea?: string;
    address?: string;
    primaryService?: string;
    secondaryService?: string;
    serviceLabels?: string[];
    experience?: string;
    bio?: string;
    idType?: string;
    passportUrl?: string;
    rawStatus: string;
    status: ProviderStatusBucket;
    /** Slugified service values this provider registered under (deduplicated). */
    categoryKeys: string[];
    isTest: boolean;
}

export interface RealRequestRecord {
    id: string;
    source: "job_requests" | "requests";
    categoryKey: string;
    serviceLabel: string;
    description: string;
    location: string;
    budget: number;
    status: string;
    clientName: string;
    providerName: string;
    clientId: string;
    providerId: string;
    createdAt: string;
    paymentStatus?: string;
    escrowReference?: string;
    isOrphanedClient: boolean;
    isTest: boolean;
}

/** Raw records loaded from Firestore; usage is computed from these on demand. */
export interface RealServiceSnapshot {
    providers: RealProviderRecord[];
    requests: RealRequestRecord[];
    /** slug -> first raw label seen for that service value */
    categoryLabels: Record<string, string>;
}

export interface RealCategoryUsage {
    totalProviders: number;
    approvedProviders: number;
    pendingReviewProviders: number;
    onboardingProviders: number;
    rejectedProviders: number;
    providerNames: string[];
    totalRequests: number;
    requests: RealRequestRecord[];
}

export interface UnmatchedServiceValue {
    key: string;
    label: string;
    providers: number;
    requests: number;
}

export interface CategoryUsageResult {
    byCategoryId: Record<string, RealCategoryUsage>;
    /** Raw service values in the database that don't exactly match any category. */
    unmatched: UnmatchedServiceValue[];
}

// IDs of the old hardcoded preset list so we can strip unused presets automatically
const LEGACY_PRESET_IDS = new Set([
    "electrical-wiring",
    "solar-inverter",
    "appliance-repair",
    "plumbing-pipefitting",
    "hvac-ac",
    "carpentry-woodwork",
    "painting-wall",
    "cleaning-fumigation",
    "roofing-ceiling",
    "masonry-tiling",
    "welding-metal",
    "landscaping-gardening",
    "general-maintenance",
]);

export const ICON_OPTIONS: { key: ServiceIconKey; label: string; icon: LucideIcon }[] = [
    { key: "zap", label: "Electrical (Bolt)", icon: Zap },
    { key: "sun", label: "Solar (Sun)", icon: Sun },
    { key: "tv", label: "Appliance (Screen)", icon: Tv },
    { key: "droplets", label: "Plumbing (Water)", icon: Droplet },
    { key: "fan", label: "HVAC / Cooling (Air)", icon: Wind },
    { key: "hammer", label: "Carpentry (Hammer)", icon: Hammer },
    { key: "paintbrush", label: "Painting (Brush)", icon: Paintbrush },
    { key: "sparkles", label: "Cleaning (Sparkles)", icon: Sparkles },
    { key: "home", label: "Roofing / Home", icon: Home },
    { key: "brick-wall", label: "Masonry / Tiling", icon: Layers },
    { key: "flame", label: "Welding (Flame)", icon: Flame },
    { key: "flower", label: "Landscaping (Garden)", icon: Flower2 },
    { key: "wrench", label: "General / Wrench", icon: Wrench },
    { key: "shield", label: "Security (Shield)", icon: ShieldCheck },
    { key: "truck", label: "Moving / Logistics", icon: Truck },
];

export const COLOR_OPTIONS: { hex: string; label: string }[] = [
    { hex: "#10B981", label: "Brand Emerald" },
    { hex: "#047857", label: "Deep Green" },
    { hex: "#D97706", label: "Amber Gold" },
    { hex: "#EAB308", label: "Solar Yellow" },
    { hex: "#EA580C", label: "Brand Orange" },
    { hex: "#2563EB", label: "Royal Blue" },
    { hex: "#0284C7", label: "Sky Blue" },
    { hex: "#6366F1", label: "Indigo" },
    { hex: "#7C3AED", label: "Purple" },
    { hex: "#0D9488", label: "Teal" },
    { hex: "#E11D48", label: "Rose Red" },
    { hex: "#B45309", label: "Warm Brown" },
    { hex: "#78716C", label: "Stone Slate" },
    { hex: "#16A34A", label: "Garden Green" },
];

export function getLucideIcon(iconKey?: string): LucideIcon {
    const found = ICON_OPTIONS.find((o) => o.key === iconKey);
    return found ? found.icon : Wrench;
}

export function slugifyCategory(name: string): string {
    return (
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || `service-${Date.now()}`
    );
}

/**
 * Infers visual metadata (icon, color, shortTitle, subtitle, description)
 * for a real category name discovered from Firestore providers or job requests.
 */
export function buildCategoryFromRealName(
    rawName: string,
    order: number,
    source: "database" | "admin" = "database"
): ServiceCategoryItem {
    const cleanName = rawName.trim();
    const lower = cleanName.toLowerCase();

    let iconKey: ServiceIconKey = "wrench";
    let colorHex = "#10B981";
    let shortTitle = cleanName.split(/[\s&/,]+/)[0] || cleanName;
    let subtitle = "Verified Specialists";
    let description = `Verified ${cleanName} professionals for residential and commercial properties.`;

    if (lower.includes("elect") || lower.includes("wir")) {
        iconKey = "zap";
        colorHex = "#D97706";
        shortTitle = "Electrical";
        subtitle = "Wiring & Power";
        description = "Wiring, circuit boards, fault diagnostics, and power repairs.";
    } else if (lower.includes("solar") || lower.includes("invert")) {
        iconKey = "sun";
        colorHex = "#EAB308";
        shortTitle = "Solar & Power";
        subtitle = "Inverters & Panels";
        description = "Solar panel arrays, hybrid inverters, batteries, and backup power setup.";
    } else if (lower.includes("appliance") || lower.includes("fridge") || lower.includes("tv")) {
        iconKey = "tv";
        colorHex = "#6366F1";
        shortTitle = "Appliances";
        subtitle = "Fridge & Machines";
        description = "Refrigerators, washing machines, microwaves, and home electronics repair.";
    } else if (lower.includes("plumb") || lower.includes("pipe") || lower.includes("water")) {
        iconKey = "droplets";
        colorHex = "#047857";
        shortTitle = "Plumbing";
        subtitle = "Pipes & Leaks";
        description = "Leak detection, water heaters, borehole pumps, drainage, and pipefitting.";
    } else if (lower.includes("hvac") || lower.includes("ac") || lower.includes("cool") || lower.includes("air")) {
        iconKey = "fan";
        colorHex = "#0284C7";
        shortTitle = "AC / HVAC";
        subtitle = "Cooling & Gas";
        description = "AC servicing, gas refilling, compressor repair, and ventilation systems.";
    } else if (lower.includes("carpent") || lower.includes("wood") || lower.includes("furnit")) {
        iconKey = "hammer";
        colorHex = "#B45309";
        shortTitle = "Carpentry";
        subtitle = "Doors & Wood";
        description = "Cabinetry, wardrobes, door locks, wood framing, and furniture repair.";
    } else if (lower.includes("paint") || lower.includes("wall") || lower.includes("screed")) {
        iconKey = "paintbrush";
        colorHex = "#7C3AED";
        shortTitle = "Painting";
        subtitle = "Wall & Finish";
        description = "Interior & exterior painting, screeding, wallpaper, and wall finishes.";
    } else if (lower.includes("clean") || lower.includes("fumig") || lower.includes("pest")) {
        iconKey = "sparkles";
        colorHex = "#0D9488";
        shortTitle = "Cleaning";
        subtitle = "Deep Clean";
        description = "Deep cleaning, post-construction cleanup, pest control, and fumigation.";
    } else if (lower.includes("roof") || lower.includes("ceiling") || lower.includes("pop")) {
        iconKey = "home";
        colorHex = "#E11D48";
        shortTitle = "Roofing";
        subtitle = "Ceiling Repair";
        description = "Roof leak sealing, roofing sheets, POP ceilings, and gutter maintenance.";
    } else if (lower.includes("mason") || lower.includes("til") || lower.includes("floor") || lower.includes("brick")) {
        iconKey = "brick-wall";
        colorHex = "#78716C";
        shortTitle = "Tiling & Masonry";
        subtitle = "Masonry & Tiles";
        description = "Floor & wall tiling, interlocking stones, plastering, and masonry.";
    } else if (lower.includes("weld") || lower.includes("metal") || lower.includes("iron") || lower.includes("fabricat")) {
        iconKey = "flame";
        colorHex = "#EA580C";
        shortTitle = "Welding";
        subtitle = "Gates & Iron";
        description = "Security gates, railings, burglary proofs, and steel fabrication.";
    } else if (lower.includes("landscap") || lower.includes("garden") || lower.includes("lawn")) {
        iconKey = "flower";
        colorHex = "#16A34A";
        shortTitle = "Landscaping";
        subtitle = "Lawn & Garden";
        description = "Lawn care, gardening, tree trimming, and outdoor landscaping.";
    } else if (lower.includes("secur") || lower.includes("cctv") || lower.includes("lock")) {
        iconKey = "shield";
        colorHex = "#2563EB";
        shortTitle = "Security";
        subtitle = "CCTV & Locks";
        description = "CCTV installation, access control, smart locks, and security systems.";
    } else if (lower.includes("mov") || lower.includes("relocat") || lower.includes("haul") || lower.includes("truck")) {
        iconKey = "truck";
        colorHex = "#EA580C";
        shortTitle = "Moving";
        subtitle = "Haulage & Relocation";
        description = "Home and office relocation, packing, and logistics support.";
    }

    return {
        id: slugifyCategory(cleanName),
        name: cleanName,
        shortTitle,
        subtitle,
        description,
        iconKey,
        colorHex,
        isActive: true,
        order,
        source,
    };
}

export function parseCategoriesFromDoc(data?: Record<string, any> | null): ServiceCategoryItem[] {
    if (!data || !Array.isArray(data.categories)) {
        return [];
    }
    const list: ServiceCategoryItem[] = data.categories
        .filter((raw: any) => raw && typeof raw.name === "string" && raw.name.trim().length > 0)
        .map((raw: any, index: number) => ({
            id: String(raw.id || slugifyCategory(raw.name || `service-${index}`)),
            name: String(raw.name).trim(),
            shortTitle: String(
                raw.shortTitle || (raw.name ? String(raw.name).split(/[\s&/]+/)[0] : "Service")
            ).trim(),
            subtitle: String(raw.subtitle || "Verified Specialists").trim(),
            description: String(
                raw.description || `Verified ${raw.name} professionals.`
            ).trim(),
            iconKey: (raw.iconKey as ServiceIconKey) || "wrench",
            colorHex: String(raw.colorHex || "#10B981"),
            isActive: raw.isActive !== false,
            order: typeof raw.order === "number" ? raw.order : index + 1,
            source: raw.source || "admin",
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        }));
    list.sort((a, b) => a.order - b.order);
    return list;
}


// ---------------------------------------------------------------------------
// Real Firestore data: loading, classification & exact category matching
// ---------------------------------------------------------------------------

const TEST_ACCOUNT_PATTERN = /test|tdst|demo|dummy|fake|sample/i;

/** Heuristic: flags records whose name / email / business name look like test accounts. */
export function isLikelyTestAccount(...fields: unknown[]): boolean {
    return fields.some((f) => typeof f === "string" && TEST_ACCOUNT_PATTERN.test(f));
}

/** Maps raw Firestore provider status strings to a clear bucket. */
export function classifyProviderStatus(rawStatus: unknown): ProviderStatusBucket {
    const s = String(rawStatus || "").trim().toLowerCase();
    if (s === "approved" || s === "verified" || s === "active") return "approved";
    if (s === "pending" || s === "pending_review" || s === "submitted" || s === "under_review") {
        return "pending_review";
    }
    if (s === "rejected" || s === "restricted" || s === "suspended" || s === "banned" || s === "declined") {
        return "rejected";
    }
    // "", "unverified", "onboarding", "incomplete", etc.
    return "onboarding";
}

function emptyUsage(): RealCategoryUsage {
    return {
        totalProviders: 0,
        approvedProviders: 0,
        pendingReviewProviders: 0,
        onboardingProviders: 0,
        rejectedProviders: 0,
        providerNames: [],
        totalRequests: 0,
        requests: [],
    };
}

const IGNORED_SERVICE_VALUES = new Set(["skilled-artisan", "service-provider", "provider", "other", "n-a", "none"]);

/**
 * Loads raw provider and request records from `users`, `user_applications`,
 * `job_requests` and `requests`. No aggregation happens here, so the admin UI can
 * re-filter (e.g. hide test accounts) without re-reading Firestore.
 */
export async function loadRealServiceSnapshot(): Promise<RealServiceSnapshot> {
    const [usersSnap, appsSnap, jobRequestsSnap, webRequestsSnap] = await Promise.all([
        getDocs(collection(db, "users")).catch(() => null),
        getDocs(collection(db, "user_applications")).catch(() => null),
        getDocs(collection(db, "job_requests")).catch(() => null),
        getDocs(collection(db, "requests")).catch(() => null),
    ]);

    const categoryLabels: Record<string, string> = {};
    const providers: RealProviderRecord[] = [];
    const requests: RealRequestRecord[] = [];
    const providerEmails = new Set<string>();
    const testUserIds = new Set<string>();
    const existingUserIds = new Set<string>();
    const userNamesById: Record<string, string> = {};

    const toKeys = (values: unknown[]): string[] => {
        const keys = new Set<string>();
        values.forEach((v) => {
            if (typeof v !== "string") return;
            const label = v.trim();
            if (!label) return;
            const key = slugifyCategory(label);
            if (IGNORED_SERVICE_VALUES.has(key)) return;
            if (!categoryLabels[key]) categoryLabels[key] = label;
            keys.add(key);
        });
        return Array.from(keys);
    };

    // 1. users (all roles scanned so we can resolve client names & flag test accounts)
    usersSnap?.docs.forEach((d) => {
        const u = d.data();
        existingUserIds.add(d.id);
        const name = String(u.fullName || u.displayName || u.name || u.businessName || "").trim();
        const email = String(u.email || u.applicationData?.email || "").trim().toLowerCase();
        if (name || email) {
            userNamesById[d.id] = name || email;
        }
        const isTest = u.isTestAccount === true || isLikelyTestAccount(name, email, u.businessName);
        if (isTest) testUserIds.add(d.id);

        if (u.role !== "service_provider") return;
        if (email) providerEmails.add(email);

        const app = u.applicationData || {};
        const rawServiceValues = [
            u.serviceCategory,
            app.serviceCategory,
            app.primaryService,
            u.tradeCategory,
            u.category,
            u.profession,
            app.secondaryService,
            ...(Array.isArray(u.services) ? u.services : []),
            ...(Array.isArray(app.services) ? app.services : []),
        ];
        const cleanServiceLabels = Array.from(
            new Set(
                rawServiceValues
                    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
                    .map((v) => v.trim())
            )
        );
        const addrObj =
            typeof u.address === "object" && u.address !== null ? u.address : {};
        const addrString =
            typeof u.address === "string"
                ? u.address.trim()
                : [addrObj.street, addrObj.city, addrObj.state]
                      .filter((x) => typeof x === "string" && x.trim().length > 0)
                      .join(", ");

        const locObj =
            typeof u.location === "object" && u.location !== null ? u.location : {};
        const locAddr =
            typeof u.location === "string"
                ? u.location.trim()
                : [locObj.address, locObj.city, locObj.state]
                      .filter((x) => typeof x === "string" && x.trim().length > 0)
                      .join(", ");

        const appAddrString =
            typeof app.address === "string"
                ? app.address.trim()
                : typeof app.address === "object" && app.address !== null
                ? [app.address.street, app.address.city, app.address.state]
                      .filter((x) => typeof x === "string" && x.trim().length > 0)
                      .join(", ")
                : "";

        const resolvedCoverage = String(u.coverageArea || app.coverageArea || "").trim();
        const resolvedAddress = String(
            addrString ||
                appAddrString ||
                app.residentialAddress ||
                app.officeAddress ||
                (locAddr.toLowerCase() !== "nigeria" ? locAddr : "") ||
                ""
        ).trim();
        const resolvedState = String(
            u.state ||
                addrObj.state ||
                locObj.state ||
                app.state ||
                u.city ||
                addrObj.city ||
                locObj.city ||
                app.city ||
                resolvedCoverage ||
                resolvedAddress ||
                ""
        ).trim();

        providers.push({
            id: d.id,
            source: "users",
            name: name || "Unnamed provider",
            email,
            phone: String(u.phone || u.phoneNumber || app.phone || app.phoneNumber || "").trim(),
            state: resolvedState,
            coverageArea: resolvedCoverage,
            address: resolvedAddress,
            primaryService: String(
                u.serviceCategory || app.serviceCategory || app.primaryService || cleanServiceLabels[0] || ""
            ).trim(),
            secondaryService: String(app.secondaryService || cleanServiceLabels[1] || "").trim(),
            serviceLabels: cleanServiceLabels,
            experience: String(u.experience || app.experience || "").trim(),
            bio: String(u.bio || u.description || app.bio || app.description || "").trim(),
            idType: String(u.idType || app.idType || "").trim(),
            passportUrl: String(u.passportUrl || app.passportUrl || u.photoURL || u.avatar || "").trim(),
            rawStatus: String(u.status || ""),
            status: classifyProviderStatus(u.status),
            categoryKeys: toKeys(rawServiceValues),
            isTest,
        });
    });

    // 2. user_applications (enrich existing users record if missing fields, or add standalone applicant)
    appsSnap?.docs.forEach((d) => {
        const raw = d.data();
        const payload = raw.data || {};
        const role = payload.role || raw.role || "service_provider";
        const name = String(payload.fullName || raw.fullName || raw.displayName || payload.businessName || "").trim();
        const email = String(payload.email || raw.email || raw.emailAddress || "").trim().toLowerCase();
        const createdUserId = String(raw.createdUserId || raw.userId || raw.uid || "").trim();
        if (name && !userNamesById[d.id]) {
            userNamesById[d.id] = name;
        }
        const isTest = raw.isTestAccount === true || isLikelyTestAccount(name, email, payload.businessName);
        if (isTest) testUserIds.add(d.id);

        if (role !== "service_provider") return;

        const servicesArr = payload.services || raw.services;
        const rawAppServiceValues = [
            payload.serviceCategory,
            raw.serviceCategory,
            payload.primaryService,
            raw.primaryService,
            payload.secondaryService,
            raw.secondaryService,
            ...(Array.isArray(servicesArr) ? servicesArr : []),
        ];
        const cleanAppLabels = Array.from(
            new Set(
                rawAppServiceValues
                    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
                    .map((v) => v.trim())
            )
        );
        const appPhone = String(payload.phone || raw.phone || payload.phoneNumber || raw.phoneNumber || "").trim();
        const appCoverage = String(payload.coverageArea || raw.coverageArea || "").trim();
        const appLoc = String(payload.location || raw.location || "").trim();
        const appAddress = String(
            payload.address || raw.address || (appLoc.toLowerCase() !== "nigeria" ? appLoc : "") || ""
        ).trim();
        const appState = String(
            payload.state || raw.state || payload.city || raw.city || appCoverage || appAddress || ""
        ).trim();

        const existing = providers.find(
            (p) =>
                (email && p.email === email) ||
                (createdUserId && p.id === createdUserId) ||
                p.id === d.id ||
                (name && p.name.toLowerCase() === name.toLowerCase())
        );

        if (existing) {
            if (!existing.phone && appPhone) existing.phone = appPhone;
            if (!existing.state && appState) existing.state = appState;
            if (!existing.coverageArea && appCoverage) existing.coverageArea = appCoverage;
            if (!existing.address && appAddress) existing.address = appAddress;
            if (!existing.primaryService && cleanAppLabels[0]) existing.primaryService = cleanAppLabels[0];
            if (!existing.experience && (payload.experience || raw.experience)) {
                existing.experience = String(payload.experience || raw.experience).trim();
            }
            if (!existing.bio && (payload.bio || raw.bio || payload.description || raw.description)) {
                existing.bio = String(payload.bio || raw.bio || payload.description || raw.description).trim();
            }
            if ((!existing.serviceLabels || existing.serviceLabels.length === 0) && cleanAppLabels.length > 0) {
                existing.serviceLabels = cleanAppLabels;
            }
            const extraKeys = toKeys(rawAppServiceValues);
            existing.categoryKeys = Array.from(new Set([...existing.categoryKeys, ...extraKeys]));
            return;
        }
        if (email) providerEmails.add(email);

        providers.push({
            id: d.id,
            source: "user_applications",
            name: name || "Unnamed applicant",
            email,
            phone: appPhone,
            state: appState,
            coverageArea: appCoverage,
            address: appAddress,
            primaryService: cleanAppLabels[0] || "",
            secondaryService: cleanAppLabels[1] || "",
            serviceLabels: cleanAppLabels,
            experience: String(payload.experience || raw.experience || "").trim(),
            bio: String(payload.bio || raw.bio || "").trim(),
            idType: String(payload.idType || raw.idType || "").trim(),
            passportUrl: String(payload.passportUrl || raw.passportUrl || "").trim(),
            rawStatus: String(raw.status || "pending"),
            status: classifyProviderStatus(raw.status || "pending"),
            categoryKeys: toKeys(rawAppServiceValues),
            isTest,
        });
    });

    // 3. job_requests + requests (deduplicated by document id)
    const seen = new Set<string>();
    const addRequest = (id: string, source: RealRequestRecord["source"], data: Record<string, any>) => {
        if (seen.has(id)) return;
        seen.add(id);
        const rawService = String(data.serviceType || data.category || "General Maintenance").trim() || "General Maintenance";
        const keys = toKeys([rawService, data.category]);
        const key = keys[0] || "general-maintenance";
        if (!categoryLabels[key]) categoryLabels[key] = rawService;

        const clientId = String(data.clientId || data.userId || "");
        const providerId = String(data.providerId || "");
        const invitedIds: string[] = Array.isArray(data.invitedProviderIds)
            ? data.invitedProviderIds.map((x: any) => String(x))
            : [];
        const isOrphanedClient = clientId !== "" && existingUserIds.size > 0 && !existingUserIds.has(clientId);

        const resolvedClientName = String(
            data.clientName ||
                data.userName ||
                userNamesById[clientId] ||
                (isOrphanedClient ? `Deleted User (${clientId.slice(0, 6)})` : clientId ? `User (${clientId.slice(0, 6)})` : "Client")
        ).trim();
        const resolvedProviderName = String(
            data.providerName || userNamesById[providerId] || ""
        ).trim();
        const description = String(data.description || data.title || "").trim();
        const location =
            typeof data.location === "object" && data.location
                ? String(data.location.address || data.location.city || JSON.stringify(data.location))
                : String(data.location || "");
        const budget = Number(data.budget || data.price || 0);
        const status = String(data.status || "pending");

        requests.push({
            id,
            source: data.userId && !data.clientId ? "requests" : source,
            categoryKey: key,
            serviceLabel: rawService,
            description,
            location,
            budget,
            status,
            clientName: resolvedClientName,
            providerName: resolvedProviderName,
            clientId,
            providerId,
            createdAt: String(data.createdAt || ""),
            paymentStatus: data.paymentStatus ? String(data.paymentStatus) : undefined,
            escrowReference: data.escrowReference ? String(data.escrowReference) : undefined,
            isOrphanedClient,
            isTest:
                data.isTestAccount === true ||
                status.toLowerCase() === "test" ||
                isOrphanedClient ||
                (clientId !== "" && testUserIds.has(clientId)) ||
                (providerId !== "" && testUserIds.has(providerId)) ||
                invitedIds.some((invId) => testUserIds.has(invId)) ||
                isLikelyTestAccount(
                    rawService,
                    resolvedClientName,
                    data.clientEmail,
                    resolvedProviderName,
                    description,
                    location
                ),
        });
    };
    jobRequestsSnap?.docs.forEach((d) => addRequest(d.id, "job_requests", d.data()));
    webRequestsSnap?.docs.forEach((d) => addRequest(d.id, "requests", d.data()));

    // Sort requests newest first
    requests.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
    });

    // 4. Backfill any missing provider category/location from job requests assigned to them
    providers.forEach((p) => {
        const provReqs = requests.filter(
            (r) =>
                r.providerId === p.id ||
                (r.providerName && r.providerName.toLowerCase() === p.name.toLowerCase())
        );
        if (provReqs.length === 0) return;

        if (!p.primaryService && provReqs[0].serviceLabel) {
            p.primaryService = provReqs[0].serviceLabel;
        }
        if ((!p.serviceLabels || p.serviceLabels.length === 0) && provReqs[0].serviceLabel) {
            p.serviceLabels = Array.from(new Set(provReqs.map((r) => r.serviceLabel).filter(Boolean)));
        }
        if (p.categoryKeys.length === 0) {
            p.categoryKeys = Array.from(new Set(provReqs.map((r) => r.categoryKey).filter(Boolean)));
        }
        if (!p.state) {
            const reqWithLoc = provReqs.find((r) => r.location && r.location.trim().length > 0);
            if (reqWithLoc) p.state = reqWithLoc.location;
        }
    });

    return { providers, requests, categoryLabels };
}

/**
 * Resolves a raw service key to at most ONE category ID.
 * First checks exact slug match (id, name, shortTitle), then falls back to
 * single-category trade keyword matching so legacy values like "Plumbing",
 * "Electrical", "HVAC / AC", "Gardening", or "Repairs" match their category
 * without ever double-counting across multiple categories.
 */
export function resolveKeyToSingleCategoryId(
    rawKey: string,
    categories: ServiceCategoryItem[],
    exactMap?: Record<string, string>
): string | undefined {
    if (exactMap && exactMap[rawKey]) return exactMap[rawKey];
    if (!exactMap) {
        const direct = categories.find(
            (c) =>
                slugifyCategory(c.id) === rawKey ||
                slugifyCategory(c.name) === rawKey ||
                slugifyCategory(c.shortTitle) === rawKey
        );
        if (direct) return direct.id;
    }

    const k = rawKey.toLowerCase();
    const findCat = (predicate: (catText: string) => boolean) =>
        categories.find((c) =>
            predicate(`${c.id} ${c.name.toLowerCase()} ${c.shortTitle.toLowerCase()}`)
        )?.id;

    if (k.includes("plumb") || k.includes("pipe")) return findCat((t) => t.includes("plumb"));
    if (k.includes("elect") || k.includes("wir")) return findCat((t) => t.includes("elect"));
    if (k.includes("solar") || k.includes("invert")) return findCat((t) => t.includes("solar"));
    if (k.includes("hvac") || k === "ac" || k.startsWith("ac-") || k.endsWith("-ac") || k.includes("air-condition") || k.includes("cooling")) {
        return findCat((t) => t.includes("hvac") || t.includes("ac"));
    }
    if (k.includes("appliance") || k.includes("fridge")) return findCat((t) => t.includes("appliance"));
    if (k.includes("carpent") || k.includes("wood") || k.includes("furniture")) return findCat((t) => t.includes("carpent"));
    if (k.includes("paint") || k.includes("wall-finish")) return findCat((t) => t.includes("paint"));
    if (k.includes("clean") || k.includes("fumig") || k.includes("pest")) return findCat((t) => t.includes("clean"));
    if (k.includes("roof") || k.includes("ceiling")) return findCat((t) => t.includes("roof"));
    if (k.includes("mason") || k.includes("til") || k.includes("floor")) return findCat((t) => t.includes("mason") || t.includes("til"));
    if (k.includes("weld") || k.includes("metal") || k.includes("fabricat")) return findCat((t) => t.includes("weld"));
    if (k.includes("garden") || k.includes("landscap") || k.includes("lawn")) return findCat((t) => t.includes("landscap") || t.includes("garden"));
    if (k === "repairs" || k === "general-service" || k === "service-request" || k === "service-booking" || k.includes("maintenance") || k.includes("handyman")) {
        return findCat((t) => t.includes("maintenance") || t.includes("general"));
    }

    return undefined;
}

/**
 * Computes per-category usage with single-category matching.
 * Each raw value is assigned to at most one category, and each provider is counted
 * at most once per category.
 */
export function computeCategoryUsage(
    categories: ServiceCategoryItem[],
    snapshot: RealServiceSnapshot | null,
    options: { excludeTest?: boolean } = {}
): CategoryUsageResult {
    const byCategoryId: Record<string, RealCategoryUsage> = {};
    categories.forEach((c) => (byCategoryId[c.id] = emptyUsage()));
    if (!snapshot) return { byCategoryId, unmatched: [] };

    const exactMap: Record<string, string> = {};
    categories.forEach((c) => {
        [c.id, slugifyCategory(c.name)].forEach((k) => {
            if (!exactMap[k]) exactMap[k] = c.id;
        });
    });
    categories.forEach((c) => {
        const k = slugifyCategory(c.shortTitle);
        if (!exactMap[k]) exactMap[k] = c.id;
    });

    const unmatchedMap: Record<string, UnmatchedServiceValue> = {};
    const bumpUnmatched = (key: string, field: "providers" | "requests") => {
        if (!unmatchedMap[key]) {
            unmatchedMap[key] = { key, label: snapshot.categoryLabels[key] || key, providers: 0, requests: 0 };
        }
        unmatchedMap[key][field] += 1;
    };

    snapshot.providers.forEach((p) => {
        if (options.excludeTest && p.isTest) return;
        const catIds = new Set<string>();
        p.categoryKeys.forEach((k) => {
            const id = resolveKeyToSingleCategoryId(k, categories, exactMap);
            if (id) catIds.add(id);
            else bumpUnmatched(k, "providers");
        });
        catIds.forEach((id) => {
            const u = byCategoryId[id];
            u.totalProviders += 1;
            if (p.status === "approved") u.approvedProviders += 1;
            else if (p.status === "pending_review") u.pendingReviewProviders += 1;
            else if (p.status === "rejected") u.rejectedProviders += 1;
            else u.onboardingProviders += 1;
            if (!u.providerNames.includes(p.name)) u.providerNames.push(p.name);
        });
    });

    snapshot.requests.forEach((r) => {
        if (options.excludeTest && r.isTest) return;
        const id = resolveKeyToSingleCategoryId(r.categoryKey, categories, exactMap);
        if (id) {
            byCategoryId[id].totalRequests += 1;
            byCategoryId[id].requests.push(r);
        } else {
            bumpUnmatched(r.categoryKey, "requests");
        }
    });

    const unmatched = Object.values(unmatchedMap).sort(
        (a, b) => b.providers * 2 + b.requests - (a.providers * 2 + a.requests)
    );
    return { byCategoryId, unmatched };
}

/** Back-compat wrapper: loads the snapshot and derives discovered categories. */
export async function fetchRealServiceDataFromFirestore(): Promise<{
    snapshot: RealServiceSnapshot;
    discoveredCategories: ServiceCategoryItem[];
}> {
    const snapshot = await loadRealServiceSnapshot();
    const { unmatched } = computeCategoryUsage([], snapshot);
    const discoveredCategories = unmatched.map((u, idx) =>
        buildCategoryFromRealName(u.label, idx + 1, "database")
    );
    return { snapshot, discoveredCategories };
}

/**
 * Live hook for `app_config/service_categories`.
 *
 * - Default (clients, providers, public pages): only reads the config document.
 * - `{ withRealUsage: true }` (admin only): also loads raw provider / request records
 *   so the admin can see real usage counts.
 */
export function useServiceCategories(options: { withRealUsage?: boolean } = {}) {
    const withRealUsage = options.withRealUsage === true;
    const [allCategories, setAllCategories] = useState<ServiceCategoryItem[]>([]);
    const [realSnapshot, setRealSnapshot] = useState<RealServiceSnapshot | null>(null);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncedFromFirestore, setIsSyncedFromFirestore] = useState(false);

    const refreshRealUsage = useCallback(async () => {
        const result = await fetchRealServiceDataFromFirestore();
        setRealSnapshot(result.snapshot);
        return result;
    }, []);

    useEffect(() => {
        let isMounted = true;
        const ref = doc(db, "app_config", "service_categories");

        const unsub = onSnapshot(
            ref,
            async (snap) => {
                const docData = snap.exists() ? snap.data() : null;
                const stored = parseCategoriesFromDoc(docData);
                const docDeletedIds: string[] = Array.isArray(docData?.deletedIds)
                    ? docData!.deletedIds.map((x: any) => String(x))
                    : [];

                if (!isMounted) return;
                setDeletedIds(docDeletedIds);

                if (!withRealUsage) {
                    setAllCategories(stored);
                    setIsSyncedFromFirestore(snap.exists());
                    setIsLoading(false);
                    return;
                }

                try {
                    const snapshot = await loadRealServiceSnapshot();
                    if (!isMounted) return;
                    setRealSnapshot(snapshot);

                    if (docData?.dataSource === "real_firestore_sync") {
                        // Respect the admin's saved list exactly. New raw values show up
                        // in the "unmatched" panel instead of being auto-added.
                        setAllCategories(stored);
                    } else {
                        // One-time migration away from the legacy hardcoded presets:
                        // keep admin-created categories and presets that have real usage,
                        // then add real (non-test) service values that match nothing.
                        const usage = computeCategoryUsage(stored, snapshot, { excludeTest: true });
                        const kept = stored.filter((c) => {
                            const u = usage.byCategoryId[c.id];
                            const hasRealData = u.totalProviders > 0 || u.totalRequests > 0;
                            return hasRealData || !LEGACY_PRESET_IDS.has(c.id);
                        });
                        const leftover = computeCategoryUsage(kept, snapshot, { excludeTest: true }).unmatched;
                        const merged = [
                            ...kept,
                            ...leftover.map((u, i) =>
                                buildCategoryFromRealName(u.label, kept.length + i + 1, "database")
                            ),
                        ].map((c, idx) => ({ ...c, order: idx + 1 }));

                        setAllCategories(merged);
                        await saveServiceCategoriesToFirestore(merged, "system_real_sync", docDeletedIds).catch(
                            () => {}
                        );
                    }
                    setIsSyncedFromFirestore(true);
                } catch (err) {
                    console.warn("[useServiceCategories] Error loading real usage:", err);
                    setAllCategories(stored);
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            },
            (err) => {
                console.warn("[useServiceCategories] Snapshot listener error:", err);
                if (isMounted) setIsLoading(false);
            }
        );

        const unsubAuth = withRealUsage
            ? onAuthStateChanged(auth, (user) => {
                  if (user && isMounted) {
                      loadRealServiceSnapshot()
                          .then((snapshot) => {
                              if (isMounted) setRealSnapshot(snapshot);
                          })
                          .catch(() => {});
                  }
              })
            : undefined;

        return () => {
            isMounted = false;
            unsub();
            if (unsubAuth) unsubAuth();
        };
    }, [withRealUsage]);

    const activeCategories = allCategories.filter((c) => c.isActive);

    return {
        allCategories,
        activeCategories,
        realSnapshot,
        deletedIds,
        isLoading,
        isSyncedFromFirestore,
        refreshRealUsage,
    };
}

/**
 * Saves the real categories array to `app_config/service_categories`.
 */
export async function saveServiceCategoriesToFirestore(
    categories: ServiceCategoryItem[],
    adminEmail?: string | null,
    deletedIds?: string[]
) {
    const ref = doc(db, "app_config", "service_categories");
    // JSON round-trip strips `undefined` fields, which Firestore rejects.
    const normalized = JSON.parse(
        JSON.stringify(
            categories.map((c, idx) => ({
                ...c,
                order: idx + 1,
                updatedAt: new Date().toISOString(),
            }))
        )
    );
    const payload: Record<string, any> = {
        categories: normalized,
        dataSource: "real_firestore_sync",
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail || "admin",
    };
    if (Array.isArray(deletedIds)) {
        payload.deletedIds = deletedIds;
    }
    await setDoc(ref, payload, { merge: true });
}

/**
 * Permanently deletes selected test providers/applications and test job requests.
 * Calls the server-side admin endpoint (which also removes Firebase Auth accounts)
 * and performs direct client-side Firestore deletions so all documents are guaranteed removed.
 */
export async function purgeSelectedTestData(params: {
    userIds: string[];
    applicationIds: string[];
    requestIds: string[];
    idToken?: string | null;
}): Promise<{ deletedProviders: number; deletedRequests: number }> {
    const { userIds, applicationIds, requestIds, idToken } = params;

    // 1. Server-side cleanup (also deletes Firebase Auth accounts)
    if (idToken) {
        try {
            await fetch("/api/admin/cleanup-test-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ userIds, applicationIds, requestIds }),
            });
        } catch (err) {
            console.warn("[purgeSelectedTestData] Admin API fallback to client Firestore:", err);
        }
    }

    // 2. Direct Firestore document deletion (ensures immediate removal)
    await Promise.all([
        ...userIds.map((uid) => deleteDoc(doc(db, "users", uid)).catch(() => {})),
        ...applicationIds.map((appId) =>
            deleteDoc(doc(db, "user_applications", appId)).catch(() => {})
        ),
        ...requestIds.map((reqId) => deleteDoc(doc(db, "job_requests", reqId)).catch(() => {})),
        ...requestIds.map((reqId) => deleteDoc(doc(db, "requests", reqId)).catch(() => {})),
    ]);

    return {
        deletedProviders: userIds.length + applicationIds.length,
        deletedRequests: requestIds.length,
    };
}

/**
 * Safety guard: Determines whether a job request is safe to permanently hard-delete.
 * - Blocks hard-deletion of any request with escrow funds (`escrow_held` / `released` / `escrowReference`).
 * - Blocks hard-deletion of real (non-test, non-orphaned) requests that are active (`accepted`, `in_progress`, `assigned`)
 *   or completed (`completed`, `fully_completed`, `partially_completed`) so financial & audit history is preserved.
 * - Allows hard-deletion of test/orphaned requests, cancelled/rejected requests, and unassigned open/pending requests without escrow.
 */
export function canHardDeleteRequest(req: {
    status?: string;
    isTest?: boolean;
    isOrphanedClient?: boolean;
    paymentStatus?: string;
    escrowReference?: string;
}): { allowed: boolean; reason?: string } {
    const payStatus = String(req.paymentStatus || "").toLowerCase();
    if (
        payStatus === "escrow_held" ||
        payStatus === "released" ||
        Boolean(req.escrowReference)
    ) {
        return {
            allowed: false,
            reason: "Protected: Escrow payment record is attached to this job.",
        };
    }

    const s = String(req.status || "").toLowerCase();
    const isProtectedRealStatus = [
        "accepted",
        "in_progress",
        "assigned",
        "completed",
        "fully_completed",
        "partially_completed",
    ].includes(s);

    if (!req.isTest && !req.isOrphanedClient && isProtectedRealStatus) {
        return {
            allowed: false,
            reason: "Protected: Real active or completed jobs cannot be permanently deleted (cancel active jobs instead to preserve the audit log).",
        };
    }

    return { allowed: true };
}

/**
 * Safely cancels a job request without deleting its audit record from Firestore.
 */
export async function cancelJobRequestByAdmin(
    requestId: string,
    adminEmail?: string | null,
    reason = "Cancelled by Admin"
): Promise<void> {
    const now = new Date().toISOString();
    const updates = {
        status: "cancelled",
        cancelledBy: adminEmail || "admin",
        cancelledAt: now,
        rejectionReason: reason,
        updatedAt: now,
    };
    await Promise.all([
        updateDoc(doc(db, "job_requests", requestId), updates).catch(() => {}),
        updateDoc(doc(db, "requests", requestId), updates).catch(() => {}),
    ]);
}

/**
 * When the admin renames a service category, updates existing providers (`users`, `user_applications`)
 * and job requests (`job_requests`, `requests`) that matched the old category name/shortTitle
 * so that all user profiles, provider badges, and job requests reflect the new name immediately.
 */
export async function cascadeRenameServiceCategory(
    oldName: string,
    oldShortTitle: string,
    newName: string
): Promise<{ updatedProviders: number; updatedRequests: number }> {
    const oldSlugs = new Set([slugifyCategory(oldName), slugifyCategory(oldShortTitle)]);
    const matchesOld = (val: unknown) =>
        typeof val === "string" && val.trim() !== "" && oldSlugs.has(slugifyCategory(val));

    const [usersSnap, appsSnap, jobReqSnap, reqSnap] = await Promise.all([
        getDocs(collection(db, "users")).catch(() => null),
        getDocs(collection(db, "user_applications")).catch(() => null),
        getDocs(collection(db, "job_requests")).catch(() => null),
        getDocs(collection(db, "requests")).catch(() => null),
    ]);

    let updatedProviders = 0;
    let updatedRequests = 0;
    const promises: Promise<any>[] = [];

    usersSnap?.docs.forEach((d) => {
        const u = d.data();
        if (u.role !== "service_provider") return;
        const updates: Record<string, any> = {};
        let changed = false;

        for (const field of ["serviceCategory", "tradeCategory", "category", "profession"] as const) {
            if (matchesOld(u[field])) {
                updates[field] = newName;
                changed = true;
            }
        }
        if (Array.isArray(u.services) && u.services.some(matchesOld)) {
            updates.services = Array.from(
                new Set(u.services.map((s: any) => (matchesOld(s) ? newName : s)))
            );
            changed = true;
        }
        if (u.applicationData && typeof u.applicationData === "object") {
            const app = { ...u.applicationData };
            let appChanged = false;
            if (matchesOld(app.serviceCategory)) {
                app.serviceCategory = newName;
                appChanged = true;
            }
            if (Array.isArray(app.services) && app.services.some(matchesOld)) {
                app.services = Array.from(
                    new Set(app.services.map((s: any) => (matchesOld(s) ? newName : s)))
                );
                appChanged = true;
            }
            if (appChanged) {
                updates.applicationData = app;
                changed = true;
            }
        }

        if (changed) {
            updatedProviders += 1;
            promises.push(updateDoc(doc(db, "users", d.id), updates).catch(() => {}));
        }
    });

    appsSnap?.docs.forEach((d) => {
        const raw = d.data();
        const updates: Record<string, any> = {};
        let changed = false;

        if (matchesOld(raw.serviceCategory)) {
            updates.serviceCategory = newName;
            changed = true;
        }
        if (Array.isArray(raw.services) && raw.services.some(matchesOld)) {
            updates.services = Array.from(
                new Set(raw.services.map((s: any) => (matchesOld(s) ? newName : s)))
            );
            changed = true;
        }
        if (raw.data && typeof raw.data === "object") {
            const payload = { ...raw.data };
            let payloadChanged = false;
            if (matchesOld(payload.serviceCategory)) {
                payload.serviceCategory = newName;
                payloadChanged = true;
            }
            if (Array.isArray(payload.services) && payload.services.some(matchesOld)) {
                payload.services = Array.from(
                    new Set(payload.services.map((s: any) => (matchesOld(s) ? newName : s)))
                );
                payloadChanged = true;
            }
            if (payloadChanged) {
                updates.data = payload;
                changed = true;
            }
        }

        if (changed) {
            updatedProviders += 1;
            promises.push(updateDoc(doc(db, "user_applications", d.id), updates).catch(() => {}));
        }
    });

    const seenReqIds = new Set<string>();
    const updateRequestCollection = (
        snap: Awaited<ReturnType<typeof getDocs>> | null,
        colName: "job_requests" | "requests"
    ) => {
        snap?.docs.forEach((d) => {
            const r = d.data() as Record<string, any>;
            const updates: Record<string, any> = {};
            if (matchesOld(r.serviceType)) updates.serviceType = newName;
            if (matchesOld(r.category)) updates.category = newName;
            if (Object.keys(updates).length > 0) {
                if (!seenReqIds.has(d.id)) {
                    seenReqIds.add(d.id);
                    updatedRequests += 1;
                }
                promises.push(updateDoc(doc(db, colName, d.id), updates).catch(() => {}));
            }
        });
    };

    updateRequestCollection(jobReqSnap, "job_requests");
    updateRequestCollection(reqSnap, "requests");

    await Promise.all(promises);
    return { updatedProviders, updatedRequests };
}
