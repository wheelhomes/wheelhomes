"use client";

import React from "react";
import Container from "@/components/ui/Container";
import { CheckCircle, Shield, MessageSquare, Clock, CreditCard } from "lucide-react";

export default function TrustIndicators() {
    const indicators = [
        {
            icon: <CheckCircle className="w-5 h-5 text-primary" />,
            text: "Admin-approved professionals",
        },
        {
            icon: <Clock className="w-5 h-5 text-primary" />,
            text: "Transparent tracking",
        },
        {
            icon: <CreditCard className="w-5 h-5 text-primary" />,
            text: "Secure payments",
        },
        {
            icon: <MessageSquare className="w-5 h-5 text-primary" />,
            text: "In-app communication",
        },
        {
            icon: <Shield className="w-5 h-5 text-primary" />,
            text: "Real-time monitoring",
        },
    ];

    return (
        <section className="bg-white border-b border-gray-100 py-6">
            <Container>
                <div className="flex flex-wrap justify-center lg:justify-between items-center gap-6 text-sm font-medium text-gray-600">
                    {indicators.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
