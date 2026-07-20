"use client";

import React from "react";
import Link from "next/link";
import { Wrench, Zap, Droplet, Paintbrush, Hammer, Truck, ShieldCheck, Star } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

const SERVICES = [
    { name: "Plumbing", icon: Droplet, desc: "Leak repairs, installations, and pipe maintenance." },
    { name: "Electrical", icon: Zap, desc: "Wiring, inspections, and emergency repairs." },
    { name: "Cleaning", icon: Paintbrush, desc: "Deep cleaning, move-in/out services." },
    { name: "Carpentry", icon: Hammer, desc: "Custom furniture, repairs, and installations." },
    { name: "HVAC", icon: Wrench, desc: "Heating, ventilation, and air conditioning service." },
    { name: "Moving", icon: Truck, desc: "Professional packing and moving assistance." },
    { name: "General Repair", icon: Wrench, desc: "Handyman services for various home needs." },
    { name: "Security", icon: ShieldCheck, desc: "System installation and security assessments." },
];

export default function ServicesPage() {
    return (
        <main className="min-h-screen bg-gray-50">

            {/* Hero */}
            <section className="bg-accent pt-32 pb-20 text-white">
                <Container className="text-center">
                    <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6">Verified Professional Services</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Get access to a network of admin-approved, background-checked professionals for all your property needs.
                    </p>
                </Container>
            </section>

            {/* Services Grid */}
            <section className="py-20">
                <Container>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {SERVICES.map((service, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
                                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors text-gray-500">
                                    <service.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-accent mb-3 group-hover:text-primary transition-colors">{service.name}</h3>
                                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                    {service.desc}
                                </p>
                                <Button variant="outline" size="sm" fullWidth className="group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                                    Request Service
                                </Button>
                            </div>
                        ))}
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
                                <h3 className="text-2xl font-bold text-accent mb-2">100% Vetted & Verified</h3>
                                <p className="text-gray-600 max-w-lg">
                                    We don't just list anyone. Every provider on Wheel of Comfort undergoes a rigorous background check and skill assessment before they can accept jobs.
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
