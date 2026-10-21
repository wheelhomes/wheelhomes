"use client";

import { HelpCircle, Mail, Phone, MessageSquare, ExternalLink, ShieldCheck } from "lucide-react";

export default function SupportSettingsPage() {
    return (
        <div className="p-6 sm:p-8 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-gray-700" />
                    Help & Customer Support
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Have questions about your service requests, payments, or account? Our support team is here to help.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                    href="mailto:support@wheelofcomfort.com"
                    className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/70 transition-all space-y-3 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Email Support</h3>
                        <p className="text-xs text-gray-500 mt-0.5">support@wheelofcomfort.com</p>
                    </div>
                    <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
                        Send Email <ExternalLink className="w-3 h-3" />
                    </span>
                </a>

                <a
                    href="tel:+2348000000000"
                    className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/70 transition-all space-y-3 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Phone className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Direct Helpline</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Mon - Sat (8am - 6pm)</p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                        Call Support <ExternalLink className="w-3 h-3" />
                    </span>
                </a>

                <a
                    href="/contact"
                    className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/70 transition-all space-y-3 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Contact Desk</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Submit an inquiry ticket</p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        Open Contact Form <ExternalLink className="w-3 h-3" />
                    </span>
                </a>
            </div>

            <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Safe Service Guarantee
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                    All artisans on Wheel of Comfort have verified identities and compliance dossiers. Client payments are held securely in escrow until you approve job completion. If you ever need mediation or dispute resolution, contact support immediately.
                </p>
            </div>
        </div>
    );
}
