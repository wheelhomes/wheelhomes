import React from "react";
import Container from "@/components/ui/Container";
import { Search, UserCheck, CheckCircle2 } from "lucide-react";

const HowItWorksPreview = () => {
    const steps = [
        {
            step: 1,
            title: "Choose a Service",
            desc: "Select the specific property or technical service you need from our comprehensive list.",
            icon: <img src="/images/Choose a Service3.png" alt="Choose a Service" className="w-10 h-10 object-contain" />,
        },
        {
            step: 2,
            title: "Get Matched",
            desc: "Our system connects you with verified, admin-approved professionals instantly.",
            icon: <img src="/images/Get Matched3.png" alt="Get Matched" className="w-10 h-10 object-contain" />,
        },
        {
            step: 3,
            title: "Track & Confirm",
            desc: "Monitor progress, communicate securely, and confirm completion—all in one place.",
            icon: <img src="/images/Find your dream property.png" alt="Track & Confirm" className="w-10 h-10 object-contain" />,
        },
    ];

    return (
        <section className="py-24 bg-gray-50 relative overflow-hidden">
            {/* Decorative Lines */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <Container>
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold tracking-wide uppercase text-sm">Simple Process</span>
                    <h2 className="text-4xl font-bold font-heading text-accent mt-3">How Wheel of Comfort Works</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10" />

                    {steps.map((item, idx) => (
                        <div key={idx} className="relative flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-gray-100 flex items-center justify-center mb-8 shadow-sm group-hover:border-primary/20 group-hover:scale-110 transition-all duration-300 z-10 relative">
                                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary transition-colors">
                                    {item.icon}
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm border-2 border-white">
                                    {item.step}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-accent mb-3 font-heading">{item.title}</h3>
                            <p className="text-gray-500 max-w-xs leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

export default HowItWorksPreview;
