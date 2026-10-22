"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Bed, Bath, Move, ShieldCheck } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";

const NIGERIAN_REAL_ESTATE_FALLBACKS = [
    {
        id: "prop_banana_island_01",
        title: "Luxury 5-Bedroom Detached Mansion with Infinity Pool",
        price: "₦450,000,000",
        location: "Banana Island, Ikoyi, Lagos",
        beds: 5,
        baths: 6,
        sqft: 4500,
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
        type: "For Sale"
    },
    {
        id: "prop_lekki_02",
        title: "Contemporary 4-Bedroom Terrace Duplex with BQ",
        price: "₦135,000,000",
        location: "Admiralty Way, Lekki Phase 1, Lagos",
        beds: 4,
        baths: 4,
        sqft: 2800,
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        type: "For Sale"
    },
    {
        id: "prop_maitama_03",
        title: "Diplomatic 6-Bedroom Villa on 1,200sqm Grounds",
        price: "₦380,000,000",
        location: "Gana Street, Maitama, Abuja",
        beds: 6,
        baths: 7,
        sqft: 5200,
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        type: "For Sale"
    },
    {
        id: "prop_vi_04",
        title: "Waterfront 3-Bedroom Penthouse with Panoramic Views",
        price: "₦14,000,000/yr",
        location: "Ozumba Mbadiwe Avenue, Victoria Island, Lagos",
        beds: 3,
        baths: 3,
        sqft: 2100,
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        type: "For Rent"
    },
    {
        id: "prop_ikeja_05",
        title: "Serviced 3-Bedroom Apartment in Gated Enclave",
        price: "₦6,500,000/yr",
        location: "Isaac John Street, Ikeja GRA, Lagos",
        beds: 3,
        baths: 3,
        sqft: 1800,
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
        type: "For Rent"
    },
    {
        id: "prop_wuse_06",
        title: "Executive 4-Bedroom Semi-Detached Duplex",
        price: "₦7,500,000/yr",
        location: "Aminu Kano Crescent, Wuse 2, Abuja",
        beds: 4,
        baths: 4,
        sqft: 2600,
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
        type: "For Rent"
    }
];

export default function RealEstatePage() {
    const [properties, setProperties] = useState<any[]>(NIGERIAN_REAL_ESTATE_FALLBACKS);
    const [searchLocation, setSearchLocation] = useState("");
    const [filterType, setFilterType] = useState("All");

    useEffect(() => {
        async function loadProperties() {
            try {
                const q = query(collection(db, "properties"), limit(12));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const loaded = snap.docs.map(doc => {
                        const d = doc.data();
                        return {
                            id: doc.id,
                            title: d.title || "Prime Real Estate",
                            price: d.price || (typeof d.rawPrice === 'number' ? `₦${d.rawPrice.toLocaleString()}` : "Contact for Price"),
                            location: d.location || d.address || "Lagos, Nigeria",
                            beds: d.beds ?? 3,
                            baths: d.baths ?? 3,
                            sqft: d.sqft ?? 2000,
                            image: d.image || (d.images && d.images[0]) || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
                            type: d.status || d.type || "For Sale",
                        };
                    });
                    setProperties(loaded);
                }
            } catch (err) {
                console.warn("Notice loading properties from Firestore:", err);
            }
        }
        loadProperties();
    }, []);

    const filtered = properties.filter(p => {
        const matchesLoc = searchLocation.trim() === "" ||
            p.location.toLowerCase().includes(searchLocation.toLowerCase()) ||
            p.title.toLowerCase().includes(searchLocation.toLowerCase());
        const matchesType = filterType === "All" || p.type.toLowerCase().includes(filterType.toLowerCase());
        return matchesLoc && matchesType;
    });

    return (
        <main className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 bg-gray-900 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80"
                        className="w-full h-full object-cover opacity-25"
                        alt="Nigerian Real Estate"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
                </div>

                <Container className="relative z-10 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-orange-400 border border-orange-500/30 mb-4">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Nigerian Real Estate
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                        Discover Verified Homes. <br />
                        <span className="text-orange-500">Buy & Rent in Lagos & Abuja.</span>
                    </h1>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                        From diplomatic villas in Maitama to waterfront penthouses in Ikoyi, find authentic properties with transparent verified legal titles.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 border border-white/20">
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                placeholder="Search Lekki, Ikoyi, Maitama, Victoria Island..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none text-gray-800 placeholder:text-gray-400 text-sm font-medium"
                            />
                        </div>
                        <div className="h-px md:h-12 w-full md:w-px bg-gray-200 my-2 md:my-0" />
                        <div className="flex-1 relative">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl focus:outline-none text-gray-800 bg-transparent cursor-pointer text-sm font-medium"
                            >
                                <option value="All">All Types</option>
                                <option value="Sale">For Sale</option>
                                <option value="Rent">For Rent</option>
                            </select>
                        </div>
                        <div className="p-1">
                            <Button size="lg" className="w-full md:w-auto h-full px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold">
                                Search
                            </Button>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Featured Listings */}
            <section className="py-20">
                <Container>
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <span className="text-orange-600 font-bold text-xs uppercase tracking-wider">Prime Portfolios</span>
                            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Featured Listings</h2>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs">
                            {filtered.length} Properties Available
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map((prop) => (
                            <Link href={`/property/details?id=${prop.id}`} key={prop.id} className="block group">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                                        <img
                                            src={prop.image}
                                            alt={prop.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-gray-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider">
                                                {prop.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1 justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900">{prop.price}</h3>
                                            <h4 className="font-bold text-gray-800 mt-1 group-hover:text-orange-600 transition-colors line-clamp-1">{prop.title}</h4>
                                            <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-2">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="truncate">{prop.location}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-5 mt-6 border-t border-gray-100 text-gray-600 text-xs font-medium">
                                            <div className="flex items-center gap-1">
                                                <Bed className="w-4 h-4 text-gray-400" /> {prop.beds} Beds
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Bath className="w-4 h-4 text-gray-400" /> {prop.baths} Baths
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Move className="w-4 h-4 text-gray-400" /> {prop.sqft} sqft
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>
        </main>
    );
}
