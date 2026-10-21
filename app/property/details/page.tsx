"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyHeader from "@/components/property/PropertyHeader";
import PropertyGallery from "@/components/property/PropertyGallery";
import PropertyOverview from "@/components/property/PropertyOverview";
import PropertyDescription from "@/components/property/PropertyDescription";
import PropertyFeatures from "@/components/property/PropertyFeatures";
import PropertyAgentSidebar from "@/components/property/PropertyAgentSidebar";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const NIGERIAN_PROPERTY_FALLBACK = {
    id: "prop_banana_island_01",
    title: "Luxury 5-Bedroom Detached Mansion with Infinity Pool",
    address: "Zone A, Banana Island, Ikoyi, Lagos",
    location: "Banana Island, Ikoyi, Lagos",
    price: "₦450,000,000",
    type: "Mansion",
    status: "For Sale",
    beds: 5,
    baths: 6,
    sqft: 4500,
    agentName: "Babatunde Balogun",
    agentPhone: "+234 803 555 0192",
    description: "An architectural masterpiece nestled within the ultra-secure Banana Island enclave. Featuring double-volume ceilings, private elevator, cinema hall, 30kVA backup generator, and breathtaking lagoon vistas.",
};

function PropertyContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [property, setProperty] = useState<any>(NIGERIAN_PROPERTY_FALLBACK);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            return;
        }

        async function fetchProperty() {
            try {
                const docSnap = await getDoc(doc(db, "properties", id!));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProperty({
                        id: docSnap.id,
                        title: data.title || NIGERIAN_PROPERTY_FALLBACK.title,
                        address: data.address || data.location || NIGERIAN_PROPERTY_FALLBACK.address,
                        price: data.price || NIGERIAN_PROPERTY_FALLBACK.price,
                        type: data.type || NIGERIAN_PROPERTY_FALLBACK.type,
                        status: data.status || NIGERIAN_PROPERTY_FALLBACK.status,
                        beds: data.beds ?? NIGERIAN_PROPERTY_FALLBACK.beds,
                        baths: data.baths ?? NIGERIAN_PROPERTY_FALLBACK.baths,
                        sqft: data.sqft ?? NIGERIAN_PROPERTY_FALLBACK.sqft,
                        agentName: data.agentName || NIGERIAN_PROPERTY_FALLBACK.agentName,
                        agentPhone: data.agentPhone || NIGERIAN_PROPERTY_FALLBACK.agentPhone,
                        description: data.description || NIGERIAN_PROPERTY_FALLBACK.description,
                    });
                }
            } catch (err) {
                console.warn("Notice fetching property details:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProperty();
    }, [id]);

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
                            <PropertyOverview property={property} />
                            <PropertyDescription description={property.description} />
                            <PropertyFeatures />
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <PropertyAgentSidebar
                                agentName={property.agentName}
                                agentPhone={property.agentPhone}
                            />
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
        <Suspense fallback={<div className="p-20 text-center text-gray-400 font-medium">Loading property details...</div>}>
            <PropertyContent />
        </Suspense>
    );
}
