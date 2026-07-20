"use client";

import React from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { CheckCircle2, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export default function BecomeProviderPage() {
    return (
        <main className="min-h-screen bg-white">

            {/* Hero */}
            <section className="relative pt-32 pb-24 bg-accent text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 skew-x-12 transform translate-x-20" />

                <Container className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-semibold border border-white/20">For Professionals</span>
                        <h1 className="text-5xl lg:text-6xl font-bold font-heading leading-tight">
                            Grow Your Business
                            <span className="text-primary block">With Confidence.</span>
                        </h1>
                        <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                            Join the elite network of verified professionals. Get steady jobs, guaranteed payments, and admin support.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <Button size="xl" variant="primary">Apply Now</Button>
                            <Button size="xl" variant="outline" className="text-white border-white hover:bg-white hover:text-accent">Learn More</Button>
                        </div>
                    </div>
                    <div className="relative hidden lg:block">
                        {/* Mockup Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-xl font-bold text-gray-600">JD</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">John Doe</h3>
                                    <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified Plumber</p>
                                </div>
                                <div className="ml-auto text-yellow-500 font-bold">★ 4.9</div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                    <span className="text-gray-600">Jobs Completed</span>
                                    <span className="font-bold text-xl">142</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                    <span className="text-gray-600">Earnings (Mo)</span>
                                    <span className="font-bold text-xl text-primary">$4,250</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Benefits */}
            <section className="py-24">
                <Container>
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-accent font-heading">Why Join Wheel of Comfort?</h2>
                        <p className="text-gray-500 mt-4 text-lg">We handle the marketing and logistics so you can focus on the work.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-lg transition-all group hover:-translate-y-1">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-accent mb-3">Consistent Leads</h3>
                            <p className="text-gray-500 leading-relaxed">Access a steady stream of job requests from property owners and real estate agents in your area.</p>
                        </div>
                        <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-lg transition-all group hover:-translate-y-1">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-accent mb-3">Verified Status</h3>
                            <p className="text-gray-500 leading-relaxed">Stand out from the competition with our "Admin Verified" badge that builds instant trust with clients.</p>
                        </div>
                        <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-lg transition-all group hover:-translate-y-1">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <Wallet className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-accent mb-3">Guaranteed Payments</h3>
                            <p className="text-gray-500 leading-relaxed">No more chasing clients for money. Payments are secured in escrow and released upon job completion.</p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Application Steps */}
            <section className="py-20 bg-accent text-white">
                <Container>
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold font-heading mb-6">Verification Process</h2>
                            <p className="text-gray-400 mb-8">
                                To maintain our high standards, all providers must pass our verification process. Most approvals take 24-48 hours.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">1</div>
                                    <div>
                                        <h4 className="font-bold text-lg">Submit Application</h4>
                                        <p className="text-gray-400 text-sm mt-1">Fill out your profile and professional details.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">2</div>
                                    <div>
                                        <h4 className="font-bold text-lg">Upload Credentials</h4>
                                        <p className="text-gray-400 text-sm mt-1">Provide ID, licenses, and insurance documents.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">3</div>
                                    <div>
                                        <h4 className="font-bold text-lg">Admin Review</h4>
                                        <p className="text-gray-400 text-sm mt-1">Our team verifies your documents and background.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0">4</div>
                                    <div>
                                        <h4 className="font-bold text-lg">Start Working</h4>
                                        <p className="text-gray-400 text-sm mt-1">Get activated and start receiving job requests.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <h3 className="text-2xl font-bold mb-6 text-center">Ready to join?</h3>
                            <form className="space-y-4">
                                <input type="text" placeholder="Full Name" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary" />
                                <input type="email" placeholder="Email Address" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary" />
                                <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-gray-500 focus:outline-none focus:border-primary">
                                    <option>Select your trade...</option>
                                    <option>Plumbing</option>
                                    <option>Electrical</option>
                                    <option>HVAC</option>
                                    <option>Cleaning</option>
                                </select>
                                <Button fullWidth size="lg">Start Application</Button>
                            </form>
                        </div>
                    </div>
                </Container>
            </section>

        </main>
    );
}
