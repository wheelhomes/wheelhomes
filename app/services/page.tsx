"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import VerifiedProvidersDirectory from "@/components/services/VerifiedProvidersDirectory";
import { useServiceCategories, getLucideIcon } from "@/lib/service-categories";

export default function ServicesPage() {
    const { activeCategories } = useServiceCategories();

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="bg-accent pt-32 pb-20 text-white">
                <Container className="text-center">
                    <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6">
                        Verified Professional Services
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Get access to a network of admin-approved, background-checked professionals for all your property needs.
                    </p>
                </Container>
            </section>

            {/* Verified Providers Directory */}
            <section className="py-12 -mt-10">
                <Container>
                    <VerifiedProvidersDirectory />
                </Container>
            </section>

            {/* Services Grid (Live Active Categories from Admin Config) */}
            <section className="py-12 border-t border-gray-100">
                <Container>
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 font-heading">
                            Active Service Categories ({activeCategories.length})
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Explore all active trade categories covered by our verified technician network
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {activeCategories.map((service) => {
                            const Icon = getLucideIcon(service.iconKey);
                            return (
                                <div
                                    key={service.id}
                                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
                                >
                                    <div>
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                                            style={{
                                                backgroundColor: `${service.colorHex}18`,
                                                color: service.colorHex,
                                            }}
                                        >
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-xl font-bold text-accent mb-2 group-hover:text-primary transition-colors">
                                            {service.name}
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                            {service.description}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/dashboard/user?category=${encodeURIComponent(service.name)}`}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            fullWidth
                                            className="group-hover:bg-primary group-hover:text-white group-hover:border-primary"
                                        >
                                            Request Service
                                        </Button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </Container>
            </section>

            {/* Trust Note */}
            <section className="py-16 bg-white border-t border-gray-100">
                <Container>
                    <div className="bg-primary/5 rounded-3xl p-8 md:p-12 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <div className="p-4 bg-white rounded-full shadow-sm text-primary">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-accent mb-2">
                                    100% Vetted & Verified
                                </h3>
                                <p className="text-gray-600 max-w-lg">
                                    We don&apos;t just list anyone. Every provider on Wheel of Comfort undergoes a rigorous background check and skill assessment before they can accept jobs.
                                </p>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <Button size="lg">Read our Standards</Button>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    );
}
