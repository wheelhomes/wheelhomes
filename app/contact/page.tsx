"use client";

import React from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-gray-50">

            <section className="relative pt-32 pb-20 bg-accent text-white">
                <Container className="text-center relative z-10">
                    <h1 className="text-4xl font-bold font-heading mb-6">Get in Touch</h1>
                    <p className="text-xl text-gray-300">We're here to help you via email, chat, or phone.</p>
                </Container>
            </section>

            <section className="py-20 -mt-16 relative z-10">
                <Container>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Contact Info Card */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                <h3 className="text-xl font-bold text-accent mb-6 font-heading">Contact Information</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Phone</p>
                                            <p className="text-gray-500 text-sm mt-1">(800) 123 4567</p>
                                            <p className="text-gray-400 text-xs">Mon-Fri 9am-6pm EST</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Email</p>
                                            <p className="text-gray-500 text-sm mt-1">support@wheelofcomfort.co</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Office</p>
                                            <p className="text-gray-500 text-sm mt-1">774 NE 84th St<br />Miami, FL 33879</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-secondary text-white p-8 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-lg mb-2">Frequent Questions?</h3>
                                <p className="text-white/80 text-sm mb-4">Check out our Help Center for quick answers significantly faster.</p>
                                <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-secondary w-full justify-center">Visit Help Center</Button>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg border border-gray-100">
                                <h2 className="text-2xl font-bold text-accent mb-6 font-heading">Send us a message</h2>
                                <form className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Email Address</label>
                                            <input type="email" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Subject</label>
                                        <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white">
                                            <option>General Inquiry</option>
                                            <option>Support Issue</option>
                                            <option>Business Partnership</option>
                                            <option>Report a Problem</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Message</label>
                                        <textarea rows={6} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"></textarea>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button size="lg" className="w-full md:w-auto" rightIcon={<MessageSquare className="w-4 h-4" />}>Send Message</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

        </main>
    );
}
