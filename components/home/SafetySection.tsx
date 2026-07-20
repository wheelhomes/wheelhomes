import React from "react";
import Container from "@/components/ui/Container";
import { ShieldCheck, MessageSquare, Briefcase, UserCheck, Eye } from "lucide-react";

const SafetySection = () => {
    const safetyFeatures = [
        { text: "All providers verified & approved", icon: UserCheck },
        { text: "Admin monitors job activity", icon: Eye },
        { text: "No off-platform dealings", icon: Briefcase },
        { text: "Secure in-app chat", icon: MessageSquare },
        { text: "Clear job completion rules", icon: ShieldCheck },
    ];

    return (
        <section className="py-24 bg-accent text-white overflow-hidden relative">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 transform translate-x-1/4" />

            <Container className="relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="text-4xl lg:text-5xl font-bold font-heading">
                            Built on Trust & <br />
                            <span className="text-primary">Accountability</span>
                        </h2>

                        <p className="text-gray-300 text-lg leading-relaxed">
                            We don't just connect you; we protect you. Our platform is designed with enterprise-grade security and oversight to ensure every job is done right.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 pt-4">
                            {safetyFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <feature.icon className="w-6 h-6 text-primary flex-shrink-0" />
                                    <span className="font-medium text-gray-200">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                            <img
                                src="/images/Nigerian Trust Scene - New.png"
                                alt="Secure handshake"
                                className="w-full h-full object-cover opacity-80"
                            />

                            {/* Floating Badge */}
                            <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur text-accent p-6 rounded-xl shadow-lg border-l-4 border-primary">
                                <div className="flex items-start gap-4">
                                    <ShieldCheck className="w-10 h-10 text-primary flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-lg">100% Secure Process</h4>
                                        <p className="text-sm text-gray-600 mt-1">From initial request to final payment, every step is guarded by our admin oversight system.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default SafetySection;
