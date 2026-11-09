"use client";

import { useState, useEffect } from "react";
import { User, MapPin, Star, CheckCircle, Search, Info } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export interface Provider {
    id: string;
    fullName: string;
    businessName?: string;
    location: string;
    rating?: number;
    reviewCount?: number;
    avatar?: string;
    status?: 'available' | 'busy' | 'offline';
    services?: string[];
}

interface ProviderSelectionListProps {
    serviceType: string;
    selectedIds: string[];
    onSelectionChange: (ids: string[], providers: Provider[]) => void;
}

export function ProviderSelectionList({ serviceType, selectedIds, onSelectionChange }: ProviderSelectionListProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoading(true);
            try {
                // Query strictly approved service providers (compliant with Firestore security rules)
                const q = query(
                    collection(db, "users"),
                    where("role", "==", "service_provider"),
                    where("status", "==", "approved"),
                    limit(50)
                );

                const snapshot = await getDocs(q);
                const allApproved = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            fullName: data.displayName || data.name || data.fullName || "Verified Specialist",
                            businessName: data.businessName || data.companyName,
                            location: data.location || data.city || data.coverageArea || "Lagos",
                            rating: data.rating || 4.9,
                            reviewCount: data.reviewCount || 0,
                            avatar: data.photoUrl || data.avatarUrl || data.photoURL,
                            status: 'available',
                            services: data.services || (data.tradeCategory ? [data.tradeCategory] : []),
                            tradeCategory: data.tradeCategory || data.category || data.profession,
                            ...data
                        } as any;
                    })
                    .filter(p => p.role === 'service_provider' && p.status === 'approved' || p.isApproved);

                // Match with requested serviceType
                const st = (serviceType || '').toLowerCase();
                const matched = allApproved.filter(p => {
                    const servicesList = Array.isArray(p.services) ? p.services.map((s: any) => String(s).toLowerCase()) : [];
                    const trade = (p.tradeCategory || '').toLowerCase();
                    const bio = (p.bio || '').toLowerCase();

                    return servicesList.some((s: string) => s.includes(st) || st.includes(s)) ||
                        trade.includes(st) || st.includes(trade) ||
                        bio.includes(st) ||
                        (st.includes('plumb') && (trade.includes('plumb') || servicesList.some((s: string) => s.includes('plumb')))) ||
                        (st.includes('elect') && (trade.includes('elect') || servicesList.some((s: string) => s.includes('elect')))) ||
                        (st.includes('ac') || st.includes('hvac')) && (trade.includes('ac') || trade.includes('hvac') || servicesList.some((s: string) => s.includes('ac') || s.includes('hvac'))) ||
                        (st.includes('carpent') && (trade.includes('carpent') || servicesList.some((s: string) => s.includes('carpent')))) ||
                        (st.includes('paint') && (trade.includes('paint') || servicesList.some((s: string) => s.includes('paint')))) ||
                        (st.includes('clean') && (trade.includes('clean') || servicesList.some((s: string) => s.includes('clean'))));
                });

                setProviders(matched.length > 0 ? matched : allApproved);
            } catch (error) {
                console.error("Failed to fetch verified providers", error);
                setProviders([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (serviceType) {
            fetchProviders();
        }
    }, [serviceType]);

    const handleToggleSelect = (providerId: string) => {
        let newIds: string[];
        if (selectedIds.includes(providerId)) {
            // Deselect if already selected
            newIds = [];
        } else {
            // Single select: Replace current selection with new one
            newIds = [providerId];
        }

        // Find the full provider objects for the selected IDs
        const selectedProviders = providers.filter(p => newIds.includes(p.id));
        onSelectionChange(newIds, selectedProviders);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (providers.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">No {serviceType} Providers Found</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm">
                    We don't have any providers listed for this Category yet. You can still submit a request and we will find one for you.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {/* Info Tip */}
            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-700">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Select a preferred provider to invite them directly. If you don't select anyone, we will auto-assign the best match.</p>
            </div>

            {providers.map(provider => {
                const isSelected = selectedIds.includes(provider.id);
                return (
                    <div
                        key={provider.id}
                        onClick={() => handleToggleSelect(provider.id)}
                        className={`
                            group relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-5
                            ${isSelected
                                ? "bg-green-50/50 border-green-500 shadow-sm"
                                : "bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"}
                        `}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                {provider.avatar ? (
                                    <img src={provider.avatar} alt={provider.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            {/* Status Dot */}
                            <div className={`
                                absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white
                                ${provider.status === 'busy' ? 'bg-red-500' :
                                    provider.status === 'offline' ? 'bg-gray-400' : 'bg-green-500'}
                            `} title={provider.status || 'available'} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-gray-900 text-lg truncate pr-2">
                                    {provider.businessName || provider.fullName}
                                </h4>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                    <span className="text-xs font-bold text-yellow-700">{provider.rating || 5.0}</span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-2 truncate">
                                {serviceType} Specialist • {provider.reviewCount || 0} jobs completed
                            </p>

                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {provider.location || "Serving your area"}
                            </div>
                        </div>

                        {/* Checkbox UI */}
                        <div className={`
                            w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                            ${isSelected
                                ? "bg-green-500 border-green-500 text-white scan-pulse"
                                : "border-gray-200 text-transparent group-hover:border-green-400"}
                        `}>
                            <CheckCircle className="w-5 h-5 fill-current" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
