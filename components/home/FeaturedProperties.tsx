"use client";

import { useState, useEffect } from "react";
import PropertyCard from "@/components/ui/PropertyCard";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const NIGERIAN_FEATURED_FALLBACKS = [
    {
        id: "prop_banana_island_01",
        title: "Luxury 5-Bedroom Detached Mansion with Infinity Pool",
        price: "₦450,000,000",
        address: "Zone A, Banana Island, Ikoyi, Lagos",
        beds: 5,
        baths: 6,
        sqft: 4500,
        type: "Mansion",
        status: "For Sale",
        agentName: "Babatunde Balogun",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    },
    {
        title: "Contemporary 4-Bedroom Terrace Duplex with BQ",
        id: "prop_lekki_02",
        price: "₦135,000,000",
        address: "Admiralty Way, Lekki Phase 1, Lagos",
        beds: 4,
        baths: 4,
        sqft: 2800,
        type: "Terrace Duplex",
        status: "For Sale",
        agentName: "Folake Davies",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    },
    {
        title: "Diplomatic 6-Bedroom Villa on 1,200sqm Grounds",
        id: "prop_maitama_03",
        price: "₦380,000,000",
        address: "Gana Street, Maitama, Abuja",
        beds: 6,
        baths: 7,
        sqft: 5200,
        type: "Villa",
        status: "For Sale",
        agentName: "Ibrahim Shehu",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    },
];

export default function FeaturedProperties() {
    const [properties, setProperties] = useState<any[]>(NIGERIAN_FEATURED_FALLBACKS);

    useEffect(() => {
        async function fetchFeatured() {
            try {
                const q = query(collection(db, "properties"), limit(6));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const loaded = snap.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        address: d.data().address || d.data().location || "Lagos, Nigeria",
                        image: d.data().image || (d.data().images && d.data().images[0]) || "/images/property-1.png",
                    }));
                    setProperties(loaded);
                }
            } catch (e) {
                console.warn("Featured properties fetch notice:", e);
            }
        }
        fetchFeatured();
    }, []);

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 mb-3">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Curated Residential Portfolios</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Discover Our Featured Listings</h2>
                    <p className="text-gray-500 max-w-xl mx-auto text-sm">
                        Verified luxury homes, diplomatic villas, and executive apartments across Lagos and Abuja.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {properties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link
                        href="/real-estate"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <span>Explore All Properties</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
