"use client";

import React from "react";
import Container from "@/components/ui/Container";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white">

            {/* Hero */}
            <section className="bg-accent text-white pt-32 pb-20 text-center">
                <Container>
                    <h1 className="text-4xl lg:text-5xl font-bold font-heading mb-6">Building Trust in Digital Operations</h1>
                    <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
                        Wheel of Comfort is not just a marketplace; we are the digital infrastructure for verified real estate operations and service fulfillment.
                    </p>
                </Container>
            </section>

            {/* Main Content */}
            <section className="py-20">
                <Container>
                    <div className="grid lg:grid-cols-2 gap-16">
                        <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                            <h2 className="text-3xl font-bold text-accent font-heading">Our Vision</h2>
                            <p>
                                In a market flooded with unverified listings and unreliable service providers, we saw a gap. Property owners needed peace of mind, and skilled professionals needed a dignified platform to showcase their work.
                            </p>
                            <p>
                                Wheel of Comfort exists to bridge this gap. We are building a dual-purpose platform that combines enterprise-grade real estate management with a vetted on-demand service workforce.
                            </p>
                            <p>
                                Our commitment is simple: <strong>Every interaction is monitored, every provider is verified, and every transaction is secure.</strong>
                            </p>
                        </div>
                        <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
                            <img
                                src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop"
                                alt="Office meeting"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </Container>
            </section>

            {/* Stats */}
            <section className="py-20 bg-gray-50">
                <Container>
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-primary font-heading mb-2">2026</div>
                            <div className="text-gray-500">Founded</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary font-heading mb-2">15k+</div>
                            <div className="text-gray-500">Verified Pros</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary font-heading mb-2">$2B+</div>
                            <div className="text-gray-500">Assets Managed</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary font-heading mb-2">12</div>
                            <div className="text-gray-500">Cities Active</div>
                        </div>
                    </div>
                </Container>
            </section>

        </main>
    );
}
