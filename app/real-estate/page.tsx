"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Bed, Bath, Move, ShieldCheck } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";

export default function RealEstatePage() {
    const [properties, setProperties] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchLocation, setSearchLocation] = useState("");
    const [filterType, setFilterType] = useState("All");

    useEffect(() => {
        async function loadProperties() {
            try {
                const q = query(collection(db, "properties"), limit(50));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const loaded = snap.docs.map(doc => {
                        const d = doc.data();
                        return {
                            id: doc.id,
                            title: d.title || "Real Estate Listing",
                            price: d.price || (typeof d.rawPrice === 'number' ? `₦${d.rawPrice.toLocaleString()}` : "Contact for Price"),
                            location: d.location || d.address || "Nigeria",
                            beds: d.beds ?? 0,
                            baths: d.baths ?? 0,
                            sqft: d.sqft ?? 0,
                            image: d.image || (d.images && d.images[0]) || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
                            type: d.status || d.type || "For Sale",
                        };
                    });
                    setProperties(loaded);
                } else {
                    setProperties([]);
                }
            } catch (err) {
                console.warn("Notice loading properties from Firestore:", err);
                setProperties([]);
            } finally {
                setIsLoading(false);
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

                    {isLoading ? (
                        <div className="py-20 text-center">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500 text-sm font-medium">Loading properties from live database...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm max-w-xl mx-auto my-8">
                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No Properties Listed Yet</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                Authentic real estate listings published by registered agents and verified property owners will appear here in real time.
                            </p>
                            <Link href="/signin">
                                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl">
                                    Sign In to List a Property
                                </Button>
                            </Link>
                        </div>
                    ) : (
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
                    )}
                </Container>
            </section>
        </main>
    );
}
