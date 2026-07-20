"use client";

import React, { useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { User, Briefcase, Building, CheckCircle2, Search, Calendar, MessageSquare, CreditCard, Wrench } from "lucide-react";

const TABS = [
    { id: "user", label: "For Users", icon: User },
    { id: "provider", label: "For Service Providers", icon: Briefcase },
    { id: "agent", label: "For Real Estate Agents", icon: Building },
];

const CONTENT = {
    user: [
        { title: "Browse & Search", desc: "Explore verified properties or search for a specific service you need.", icon: Search },
        { title: "Book a Professional", desc: "Select a provider based on reviews, price, and availability.", icon: Calendar },
        { title: "Track & Communicate", desc: "Chat securely within the app and track job progress in real-time.", icon: MessageSquare },
        { title: "Secure Payment", desc: "Pay only when the job is done and you are satisfied.", icon: CreditCard },
    ],
    provider: [
        { title: "Apply & Verify", desc: "Submit your credentials and pass our background check.", icon: CheckCircle2 },
        { title: "Get Notified", desc: "Receive job requests in your area that match your skills.", icon: MessageSquare },
        { title: "Complete Jobs", desc: "Do quality work and update status via the provider dashboard.", icon: Briefcase },
        { title: "Get Paid", desc: "Receive automated payouts directly to your bank account.", icon: CreditCard },
    ],
    agent: [
        { title: "List Properties", desc: "Upload detailed listings with high-quality photos and tours.", icon: Building },
        { title: "Manage Leads", desc: "Receive inquiries and schedule viewings efficiently.", icon: Calendar },
        { title: "Coordinate Services", desc: "Order maintenance or inspections for your listings instantly.", icon: Wrench },
        { title: "Close Deals", desc: "Streamline the paperwork and closing process.", icon: CheckCircle2 },
    ]
};

export default function HowItWorksPage() {
    const [activeTab, setActiveTab] = useState("user");

    return (
        <main className="min-h-screen bg-white">

            {/* Hero */}
            <section className="bg-accent pt-32 pb-20 text-white min-h-[40vh] flex items-center">
                <Container className="text-center">
                    <h1 className="text-5xl font-bold font-heading mb-6">How Wheel of Comfort Works</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Whether you're looking for a service, offering one, or managing properties, we make the process seamless and secure.
                    </p>
                </Container>
            </section>

            {/* Tabs */}
            <section className="-mt-8 relative z-10">
                <Container>
                    <div className="flex flex-col md:flex-row justify-center bg-white shadow-xl rounded-xl overflow-hidden max-w-3xl mx-auto border border-gray-100">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-6 px-6 transition-all duration-300 border-b-4 ${activeTab === tab.id
                                        ? "border-primary bg-primary/5 text-primary font-bold"
                                        : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-primary" : "text-gray-400"}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Content */}
            <section className="py-24">
                <Container>
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="animate-in fade-in slide-in-from-left duration-500">
                            <h2 className="text-3xl font-bold text-accent mb-8 font-heading">
                                {activeTab === "user" && "Simple steps to get things done."}
                                {activeTab === "provider" && "Grow your business with trust."}
                                {activeTab === "agent" && "Streamline your property workflow."}
                            </h2>

                            <div className="space-y-8">
                                {(CONTENT as any)[activeTab].map((step: any, idx: number) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                                                {step.title}
                                            </h3>
                                            <p className="text-gray-500 leading-relaxed">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12">
                                <Button size="lg">Get Started Now</Button>
                            </div>
                        </div>

                        <div className="relative animate-in fade-in slide-in-from-right duration-500 delay-200">
                            <div className="aspect-square rounded-full bg-accent/5 absolute inset-0 transform translate-x-12 translate-y-12" />
                            <img
                                src={
                                    activeTab === "user" ? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2670&auto=format&fit=crop" :
                                        activeTab === "provider" ? "https://images.unsplash.com/photo-1581578731117-10452a792d23?q=80&w=2670&auto=format&fit=crop" :
                                            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2673&auto=format&fit=crop"
                                }
                                alt="How it works"
                                className="relative z-10 rounded-2xl shadow-2xl object-cover w-full aspect-[4/5]"
                            />
                        </div>
                    </div>
                </Container>
            </section>

        </main>
    );
}
