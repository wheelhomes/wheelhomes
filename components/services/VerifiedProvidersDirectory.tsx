"use client";

import { useState, useEffect } from "react";
import { 
    Search, 
    ShieldCheck, 
    Star, 
    MapPin, 
    Phone, 
    Briefcase, 
    Wrench, 
    Zap, 
    Droplet, 
    Hammer, 
    Paintbrush, 
    Sparkles, 
    Wind, 
    CheckCircle2, 
    RotateCcw 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useServiceCategories } from "@/lib/service-categories";

export interface VerifiedProvider {
    id: string;
    fullName: string;
    businessName?: string;
    tradeCategory?: string;
    location?: string;
    phone?: string;
    email?: string;
    rating?: number;
    reviewCount?: number;
    photoUrl?: string;
    experience?: string;
    bio?: string;
}

function getCategoryColor(category?: string) {
    const cat = (category || "").toLowerCase();
    if (cat.includes("solar") || cat.includes("invert")) return { text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" };
    if (cat.includes("appliance")) return { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" };
    if (cat.includes("plumb") || cat.includes("pipe")) return { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
    if (cat.includes("elect") || cat.includes("wir")) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
    if (cat.includes("ac") || cat.includes("hvac") || cat.includes("cool")) return { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" };
    if (cat.includes("carpent") || cat.includes("wood")) return { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
    if (cat.includes("paint")) return { text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" };
    if (cat.includes("clean") || cat.includes("fumig")) return { text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" };
    if (cat.includes("roof") || cat.includes("ceiling")) return { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" };
    if (cat.includes("mason") || cat.includes("til")) return { text: "text-stone-700", bg: "bg-stone-50", border: "border-stone-200" };
    if (cat.includes("weld") || cat.includes("metal")) return { text: "text-orange-800", bg: "bg-orange-50", border: "border-orange-200" };
    if (cat.includes("garden") || cat.includes("landscap")) return { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" };
    return { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
}

export default function VerifiedProvidersDirectory({
    onSelectProvider
}: {
    onSelectProvider?: (provider: VerifiedProvider) => void;
}) {
    const { activeCategories } = useServiceCategories();
    const categoriesList = ["All", ...activeCategories.map((c) => c.name)];
    const [providers, setProviders] = useState<VerifiedProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        async function fetchVerifiedProviders() {
            setIsLoading(true);
            try {
                // Query strictly approved service providers only
                const q = query(
                    collection(db, "users"),
                    where("role", "==", "service_provider"),
                    where("status", "==", "approved")
                );

                const snapshot = await getDocs(q);
                const list: VerifiedProvider[] = snapshot.docs
                    .map((d) => {
                        const data = d.data();
                        return {
                            id: d.id,
                            fullName: data.displayName || data.name || data.fullName || "Verified Specialist",
                            businessName: data.businessName,
                            tradeCategory: data.tradeCategory || data.category || data.profession || data.serviceCategory || "Skilled Artisan",
                            location: data.location || data.coverageArea || data.city || "Lagos",
                            phone: data.phoneNumber || data.phone || "",
                            email: data.email || "",
                            rating: typeof data.rating === "number" ? data.rating : 0,
                            reviewCount: typeof data.reviewCount === "number" ? data.reviewCount : 0,
                            photoUrl: data.photoUrl || data.avatarUrl || data.photoURL,
                            experience: data.experience ? `${data.experience} yrs exp` : "KYC Vetted",
                            bio: data.bio || data.description || "",
                            role: data.role,
                            status: data.status
                        } as any;
                    })
                    // Double security guard: strictly role == 'service_provider' and status == 'approved'
                    .filter((p: any) => p.role === "service_provider" && p.status === "approved");

                setProviders(list);
            } catch (err) {
                console.error("Error fetching verified service providers:", err);
                setProviders([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchVerifiedProviders();
    }, []);

    // Filter by category and search query
    const filteredProviders = providers.filter((p) => {
        // Category check
        const cat = (p.tradeCategory || "").toLowerCase();
        let matchesCategory = true;
        if (selectedCategory !== "All") {
            const sc = selectedCategory.toLowerCase();
            matchesCategory = cat.includes(sc) || sc.includes(cat) ||
                (sc.includes("plumb") && cat.includes("plumb")) ||
                (sc.includes("elect") && cat.includes("elect")) ||
                (sc.includes("hvac") && (cat.includes("ac") || cat.includes("hvac"))) ||
                (sc.includes("carpent") && cat.includes("carpent")) ||
                (sc.includes("paint") && cat.includes("paint")) ||
                (sc.includes("clean") && cat.includes("clean"));
        }

        // Search check
        let matchesSearch = true;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const name = p.fullName.toLowerCase();
            const biz = (p.businessName || "").toLowerCase();
            const loc = (p.location || "").toLowerCase();
            const bio = (p.bio || "").toLowerCase();

            matchesSearch = name.includes(q) || biz.includes(q) || cat.includes(q) || loc.includes(q) || bio.includes(q);
        }

        return matchesCategory && matchesSearch;
    });

    return (
        <div className="w-full">
            {/* Search & Filter Header */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {providers.length} Verified Specialists
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold font-heading text-gray-900">
                            Search Verified Service Providers
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Browse background-checked, admin-vetted technicians protected by escrow guarantee.
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, trade, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categoriesList.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                    isSelected
                                        ? "bg-primary text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Providers Grid */}
            {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-pulse space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                </div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full" />
                            <div className="h-10 bg-gray-200 rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : filteredProviders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Search className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No verified specialists match your query</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                        Only background-checked and approved service providers are displayed. Try clearing your search or switching trade categories.
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("All");
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset All Filters
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProviders.map((provider) => {
                        const style = getCategoryColor(provider.tradeCategory);

                        return (
                            <div
                                key={provider.id}
                                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Top Row: Avatar & Badges */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3.5">
                                            <div className="relative">
                                                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary text-xl border-2 border-primary/20">
                                                    {provider.fullName ? provider.fullName[0].toUpperCase() : "P"}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 rounded-full p-0.5 text-white shadow-sm">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base leading-tight">
                                                    {provider.fullName}
                                                </h3>
                                                {provider.businessName && (
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {provider.businessName}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                    {provider.rating && provider.rating > 0 ? (
                                                        <>
                                                            <span className="text-xs font-bold text-gray-700">
                                                                {Number(provider.rating).toFixed(1)}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                ({provider.reviewCount || 0} reviews)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-gray-500">
                                                            New • {provider.reviewCount || 0} reviews
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                            <ShieldCheck className="w-3 h-3" />
                                            Verified Pro
                                        </span>
                                    </div>

                                    {/* Category Pill */}
                                    <div className="mb-3">
                                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text} ${style.border} border`}>
                                            {provider.tradeCategory}
                                        </span>
                                    </div>

                                    {/* Coverage & Experience */}
                                    <div className="space-y-1.5 mb-4 text-xs text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                            <span>{provider.location}</span>
                                        </div>
                                        {provider.experience && (
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{provider.experience}</span>
                                            </div>
                                        )}
                                        {provider.bio && (
                                            <p className="text-gray-500 line-clamp-2 pt-1 text-xs">
                                                {provider.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                                    {provider.phone && (
                                        <a
                                            href={`tel:${provider.phone}`}
                                            className="p-2.5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors"
                                            title="Call Provider"
                                        >
                                            <Phone className="w-4 h-4" />
                                        </a>
                                    )}

                                    <Link
                                        href={`/dashboard/user?category=${encodeURIComponent(provider.tradeCategory || "")}&providerId=${provider.id}&providerName=${encodeURIComponent(provider.fullName)}`}
                                        className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl text-center text-xs font-bold hover:bg-primary/95 transition-all shadow-sm"
                                    >
                                        Request Specialist
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
