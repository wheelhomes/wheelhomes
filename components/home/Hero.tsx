"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

// You can replace this with a real image URL later
const HERO_IMAGE = "/images/home intro.webp";

const Hero = () => {
    const router = useRouter();
    const [searchType, setSearchType] = useState<"service" | "property">("service");
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        if (searchType === "service") {
            router.push(`/services?q=${encodeURIComponent(searchQuery)}`);
        } else {
            router.push(`/real-estate?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="relative w-full min-h-[90vh] flex items-center pt-20 overflow-hidden bg-accent">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src={HERO_IMAGE}
                    alt="Modern Architecture"
                    className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/70 to-transparent" />
            </div>

            <Container className="relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 lg:py-0">
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 text-center lg:text-left">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span>Verified & Secure Platform</span>
                            </div>
                            <a
                                href="/downloads/wheelofcomfort.apk"
                                download="wheelofcomfort.apk"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-sky-300 text-xs font-semibold backdrop-blur-sm transition-all hover:scale-105"
                                title="Download Android App (APK)"
                            >
                                <span>📱 Download App (APK)</span>
                            </a>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1] font-heading tracking-tight">
                                Comfort for Your Property.{" "}
                                <span className="text-primary block mt-2">
                                    Confidence in Every Service.
                                </span>
                            </h1>
                            <p className="text-xl text-gray-300 max-w-xl leading-relaxed font-light">
                                A secure platform for real estate solutions and verified service
                                professionals — monitored, managed, and built for trust.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                            <Link href="/dashboard/my-requests">
                                <Button size="xl" variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                                    Request a Service
                                </Button>
                            </Link>
                            <Link href="/real-estate">
                                <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                                    Explore Properties
                                </Button>
                            </Link>
                        </div>

                        {/* Quick Trust Stats */}
                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 border-t border-white/10">
                            <div>
                                <p className="text-3xl font-bold text-white">15k+</p>
                                <p className="text-gray-400 text-sm">Verified Providers</p>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div>
                                <p className="text-3xl font-bold text-white">99%</p>
                                <p className="text-gray-400 text-sm">Satisfaction Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Card - Floating */}
                    <div className="animate-in fade-in slide-in-from-right-10 duration-1000 delay-200 mt-8 lg:mt-0">
                        <div className="bg-white/95 backdrop-blur-md p-6 lg:p-8 rounded-2xl shadow-2xl border border-white/20 max-w-md mx-auto lg:ml-auto">
                            <h3 className="text-2xl font-bold text-accent mb-6 font-heading">Find what you need</h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">I am looking to</label>
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                                        <button
                                            onClick={() => setSearchType("service")}
                                            className={`py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${searchType === "service"
                                                ? "bg-white shadow-sm text-primary"
                                                : "text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            Hire a Pro
                                        </button>
                                        <button
                                            onClick={() => setSearchType("property")}
                                            className={`py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${searchType === "property"
                                                ? "bg-white shadow-sm text-primary"
                                                : "text-gray-500 hover:text-gray-900"
                                                }`}
                                        >
                                            Buy/Rent
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder={searchType === "service" ? "Plumber, Electrician, etc..." : "Apartment, Office, Land..."}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    />
                                </div>

                                <Button fullWidth size="lg" onClick={handleSearch}>Search Now</Button>

                                <p className="text-center text-xs text-gray-500 mt-4">
                                    Fully verified professionals | Secure payments
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default Hero;
