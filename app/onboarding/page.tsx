"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function OnboardingPage() {
    const router = useRouter();
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 0,
            image: "/images/Find your dream property.png",
            title: "Find your dream property",
            description: "Explore verified homes, apartments, and commercial spaces near you."
        },
        {
            id: 1,
            image: "/images/Hire trusted professionals.png",
            title: "Hire trusted professionals",
            description: "From plumbers to electricians — find skilled experts for your home or office."
        },
        {
            id: 2,
            image: "/images/All in one platform.png",
            title: "All in one platform",
            description: "Buy, rent, manage, and maintain properties with ease."
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            router.push("/signup");
        }
    };

    const handleGetStarted = () => {
        router.push("/signup");
    };

    const content = slides[currentSlide];

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-between py-12 px-6">

            {/* Top Indicators */}
            <div className="w-full flex justify-center gap-2 mt-4">
                {slides.map((slide) => (
                    <div
                        key={slide.id}
                        className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === slide.id
                            ? `w-8 bg-primary`
                            : "w-8 bg-gray-200"
                            }`}
                    />
                ))}
            </div>

            {/* Center Content */}
            <div className="flex flex-col items-center text-center max-w-sm w-full">
                <div className="relative w-full max-w-[16rem] aspect-square mb-8 animate-in fade-in zoom-in duration-500">
                    <Image
                        src={content.image}
                        alt={content.title}
                        fill
                        className="object-contain drop-shadow-xl"
                        priority
                    />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-4 transition-all duration-300">
                    {content.title}
                </h1>

                <p className="text-gray-500 leading-relaxed transition-all duration-300">
                    {content.description}
                </p>
            </div>

            {/* Bottom Actions */}
            <div className="w-full max-w-md mb-8">
                {currentSlide < 2 ? (
                    <button
                        onClick={handleNext}
                        className="w-full bg-primary text-white font-semibold py-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleGetStarted}
                            className="w-full bg-primary text-white font-semibold py-4 rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                        >
                            Get Started
                        </button>
                        <Link href="/signin" className="text-center text-sm font-medium text-gray-600 hover:text-gray-900">
                            I already have an account
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
