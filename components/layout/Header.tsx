"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, User, Phone, Plus, LogOut, Smartphone } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Pages that should always have a solid/dark header
    const alwaysSolidPages = ["/onboarding", "/signin", "/signup"];
    const isSolid = isScrolled || alwaysSolidPages.includes(pathname);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        // Check login status
        const checkLogin = () => {
            const loggedIn = localStorage.getItem("isLoggedIn") === "true";
            setIsLoggedIn(loggedIn);
        }

        checkLogin();

        window.addEventListener("scroll", handleScroll);
        // Add event listener for storage changes to sync across tabs/windows or after login
        window.addEventListener("storage", checkLogin);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("storage", checkLogin);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("isLoggedIn");
        setIsLoggedIn(false);
        router.push("/");
        router.refresh(); // Refresh to ensure valid state
    };

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isSolid ? "bg-white shadow-md py-2" : "bg-transparent py-4"
                }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group max-w-[240px] sm:max-w-md">
                    {/* Logo Placeholder */}
                    <div className="w-10 h-10 bg-primary/20 backdrop-blur rounded-lg flex items-center justify-center border border-white/10 flex-shrink-0">
                        <span className="text-primary font-bold text-xl">W</span>
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className={`text-lg sm:text-xl font-bold tracking-tight ${isSolid ? "text-accent" : "text-white"}`}>Wheel of Comfort</span>
                        <span className={`text-[10px] sm:text-xs font-semibold tracking-wide ${isSolid ? "text-gray-500" : "text-gray-300"}`}>& Multipurpose Services</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className={`hidden lg:flex items-center gap-6 xl:gap-8 font-medium text-sm ${isSolid ? "text-gray-700" : "text-gray-200"}`}>
                    <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                    <Link href="/real-estate" className="hover:text-primary transition-colors">Real Estate</Link>
                    <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
                    <Link href="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
                    <Link href="/become-a-provider" className="hover:text-primary transition-colors">Become a Provider</Link>
                    <Link href="/about-us" className="hover:text-primary transition-colors">About Us</Link>
                    <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                </nav>

                {/* Right Section */}
                <div className="hidden lg:flex items-center gap-3">
                    <Link
                        href="/download"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-primary/40 text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Get App</span>
                    </Link>

                    {!isLoggedIn ? (
                        <>
                            <Link href="/onboarding" className={`font-medium hover:text-primary transition-colors ${isSolid ? "text-gray-700" : "text-white"}`}>
                                Login
                            </Link>
                            <span className={`${isSolid ? "text-gray-300" : "text-white/30"}`}>/</span>
                            <Link href="/onboarding" className={`font-medium hover:text-primary transition-colors ${isSolid ? "text-gray-700" : "text-white"}`}>
                                Sign Up
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/dashboard" className={`flex items-center gap-2 font-medium hover:text-primary transition-colors ${isSolid ? "text-gray-700" : "text-white"}`}>
                                <User className="w-5 h-5" /> Dashboard
                            </Link>
                            <button
                                onClick={handleLogout}
                                className={`flex items-center gap-2 hover:text-red-500 transition-colors font-medium ${isSolid ? "text-gray-700" : "text-white"}`}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <Menu className={`w-8 h-8 ${isSolid ? "text-accent" : "text-white"}`} />
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden bg-white text-gray-800 shadow-2xl absolute top-full left-0 w-full py-6 px-4 flex flex-col gap-4 border-t border-gray-100">
                    <Link href="/" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">Home</Link>
                    <Link href="/real-estate" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">Real Estate</Link>
                    <Link href="/services" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">Services</Link>
                    <Link href="/how-it-works" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">How It Works</Link>
                    <Link href="/become-a-provider" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">Become a Provider</Link>
                    <Link href="/about-us" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">About Us</Link>
                    <Link href="/contact" className="hover:text-primary font-medium text-lg border-b border-gray-50 pb-2">Contact</Link>

                    <Link
                        href="/download"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-bold text-center shadow-md hover:opacity-95 transition-all"
                    >
                        <Smartphone className="w-4 h-4" />
                        <span>Download Mobile App (APK)</span>
                    </Link>

                    <div className="flex flex-col gap-3 mt-2">
                        {!isLoggedIn ? (
                            <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 rounded-lg">
                                <Link href="/onboarding" className="font-bold text-gray-700 hover:text-primary">
                                    Login
                                </Link>
                                <span className="text-gray-300">/</span>
                                <Link href="/onboarding" className="font-bold text-gray-700 hover:text-primary">
                                    Sign Up
                                </Link>
                            </div>
                        ) : (
                            <Link href="/dashboard" className="w-full py-3 rounded-lg bg-accent text-white text-center font-bold">
                                Go to Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
