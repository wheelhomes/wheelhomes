import React from "react";
import Link from "next/link";
import { ArrowRight, Wrench, Building2, Paintbrush, Hammer, Zap, Droplet } from "lucide-react";
import Container from "@/components/ui/Container";

const ServicesOverview = () => {
    const realEstateServices = [
        { title: "Property Listing", desc: "Browse verified properties" },
        { title: "Land Acquisition", desc: "Buy & sell prime plots" },
        { title: "Property Inspection", desc: "Professional evaluations" },
        { title: "Property Management", desc: "Full-service landlord solutions" },
    ];

    const serviceCategories = [
        { name: "Plumbing", icon: <Droplet className="w-5 h-5" /> },
        { name: "Electrical", icon: <Zap className="w-5 h-5" /> },
        { name: "Cleaning", icon: <Paintbrush className="w-5 h-5" /> },
        { name: "Carpentry", icon: <Hammer className="w-5 h-5" /> },
        { name: "Facility Mgmt", icon: <Building2 className="w-5 h-5" /> },
        { name: "General Repairs", icon: <Wrench className="w-5 h-5" /> },
    ];

    return (
        <section className="py-20 bg-white">
            <Container>
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl font-bold font-heading text-accent">
                        Real Estate & Services, Unified
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        One platform for everything your property needs. From acquisition to maintenance.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
                    {/* Column 1: Real Estate */}
                    <div className="space-y-8 animate-in slide-in-from-left duration-700">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-accent font-heading">Real Estate Services</h3>
                                <p className="text-gray-500">For owners, investors, and tenants</p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {realEstateServices.map((service, idx) => (
                                <div key={idx} className="p-6 rounded-xl border border-gray-100 hover:border-secondary/30 hover:shadow-lg transition-all group bg-gray-50/50">
                                    <h4 className="font-bold text-accent mb-2 group-hover:text-secondary transition-colors">{service.title}</h4>
                                    <p className="text-sm text-gray-500">{service.desc}</p>
                                </div>
                            ))}
                        </div>

                        <Link href="/real-estate" className="inline-flex items-center text-secondary font-semibold hover:gap-2 transition-all">
                            Explore Real Estate <ArrowRight className="w-5 h-5 ml-1" />
                        </Link>
                    </div>

                    {/* Column 2: On-Demand Services */}
                    <div className="space-y-8 animate-in slide-in-from-right duration-700 delay-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <Wrench className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-accent font-heading">Multipurpose Services</h3>
                                    <p className="text-gray-500">Verified professionals only</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full">
                                Admin Approved
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {serviceCategories.map((cat, idx) => (
                                <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/50 hover:shadow-md transition-all text-center gap-3 group cursor-pointer">
                                    <div className="p-2 bg-gray-50 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors text-gray-400">
                                        {cat.icon}
                                    </div>
                                    <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/dashboard/my-requests">
                            <Button variant="primary" className="w-full sm:w-auto" rightIcon={<ArrowRight />}>
                                Request a Service
                            </Button>
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
};

// Helper since Button is default export but used named in previous attempt (Self-correction if I imported wrong, checking Button.tsx shows default export)
import Button from "@/components/ui/Button";

export default ServicesOverview;
