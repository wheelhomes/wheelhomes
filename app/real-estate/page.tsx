"use client";

import React from "react";
import Link from "next/link";
import { Search, MapPin, Bed, Bath, Move, ArrowRight } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

// Mock Data
const FEATURED_PROPERTIES = [
    {
        id: 1,
        title: "Modern Loft in Downtown",
        price: "$1,200,000",
        location: "123 Market St, San Francisco, CA",
        beds: 3,
        baths: 2,
        sqft: 1500,
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2670&auto=format&fit=crop",
        type: "For Sale"
    },
    {
        id: 2,
        title: "Family Home in Suburbs",
        price: "$850,000",
        location: "456 Oak Lane, Austin, TX",
        beds: 4,
        baths: 3,
        sqft: 2200,
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2670&auto=format&fit=crop",
        type: "For Sale"
    },
    {
        id: 3,
        title: "City Apartment",
        price: "$3,200/mo",
        location: "789 Broadway, New York, NY",
        beds: 2,
        baths: 1,
        sqft: 900,
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2670&auto=format&fit=crop",
        type: "For Rent"
    },
    {
        id: 4,
        title: "Prime Commercial Land",
        price: "$500,000",
        location: "Highway 101, San Jose, CA",
        beds: 0,
        baths: 0,
        sqft: 5000,
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop",
        type: "Land for Sale"
    }
];

export default function RealEstatePage() {
    return (
        <main className="min-h-screen bg-gray-50 pb-20">

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 bg-accent overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2673&auto=format&fit=crop" className="w-full h-full object-cover opacity-20" alt="Real Estate" />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent to-transparent" />
                </div>

                <Container className="relative z-10 text-center">
                    <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 font-heading">
                        Find Your Place. <br />
                        <span className="text-primary">Buy & Sell Lands.</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                        From luxury homes to prime land plots, we provide the full stack of real estate solutions.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2">
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search properties or lands..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none text-gray-800 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="h-px md:h-12 w-full md:w-px bg-gray-200 my-2 md:my-0" />
                        <div className="flex-1 relative">
                            <select className="w-full px-4 py-3 rounded-xl focus:outline-none text-gray-800 bg-transparent cursor-pointer appearance-none">
                                <option>For Sale</option>
                                <option>For Rent</option>
                                <option>Land for Sale</option>
                            </select>
                        </div>
                        <div className="p-1">
                            <Button size="lg" className="w-full md:w-auto h-full">Search</Button>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Featured Listings */}
            <section className="py-20">
                <Container>
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <span className="text-primary font-bold text-sm uppercase tracking-wider">Opportunities</span>
                            <h2 className="text-3xl font-bold text-accent font-heading mt-2">Featured Listings</h2>
                        </div>
                        <Link href="/search" className="text-secondary font-semibold hover:text-secondary/80 flex items-center gap-1">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FEATURED_PROPERTIES.map((prop) => (
                            <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={prop.image}
                                        alt={prop.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-accent uppercase">{prop.type}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-primary font-heading">{prop.price}</h3>
                                            <h4 className="font-semibold text-gray-900 mt-1">{prop.title}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                                        <MapPin className="w-4 h-4" /> {prop.location}
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-gray-500 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Bed className="w-4 h-4" /> {prop.beds}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Bath className="w-4 h-4" /> {prop.baths}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Move className="w-4 h-4" /> {prop.sqft} sqft
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Enterprise Solutions */}
            <section className="py-20 bg-white">
                <Container>
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-primary font-bold text-sm uppercase tracking-wider">Enterprise Solutions</span>
                            <h2 className="text-4xl font-bold text-accent font-heading mt-2 mb-6">Integrated Professional Services</h2>
                            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                Beyond discovery, we offer full-cycle management solutions for peace of mind. Our platform connects you with certified professionals instantly.
                            </p>
                            <Button variant="outline" size="lg">Explore Services</Button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 mb-4">
                                    <Search className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Property Inspection</h3>
                                <p className="text-sm text-gray-500">Certified evaluations for peace of mind, ensuring your investment is sound and secure before you commit.</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                                    <Move className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Maintenance Coordination</h3>
                                <p className="text-sm text-gray-500">On-demand repairs at enterprise speed, managed by top-tier professionals vetted by our platform.</p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    );
}
