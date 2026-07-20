"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyHeader from "@/components/property/PropertyHeader";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyOverview from "@/components/property/PropertyOverview";
import PropertyDescription from "@/components/property/PropertyDescription";
import PropertyFeatures from "@/components/property/PropertyFeatures";
import PropertyAgentSidebar from "@/components/property/PropertyAgentSidebar";

function PropertyContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    // Mock data - normally fetched based on id
    const property = {
        title: "Modern Apartment on the Bay",
        address: "774 NE 84th St Miami, FL 33879",
        price: "₦1,500",
        type: "Apartment",
        status: "For Rent"
    };

    if (!id) return <div className="p-20 text-center">Loading property...</div>;

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <div className="pt-24 pb-20">
                <div className="container mx-auto px-4">
                    <PropertyHeader
                        title={property.title}
                        address={property.address}
                        price={property.price}
                        type={property.type}
                        status={property.status}
                    />

                    <PropertyGallery />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <PropertyOverview />
                            <PropertyDescription />
                            <PropertyFeatures />

                            {/* Placeholder for Map/Video */}
                            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-8 h-64 flex items-center justify-center text-gray-400">
                                Map Component Placeholder
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <PropertyAgentSidebar />
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}

export default function PropertyPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <PropertyContent />
        </Suspense>
    );
}
