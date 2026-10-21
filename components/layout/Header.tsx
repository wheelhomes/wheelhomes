"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, User, Phone, Plus, LogOut, Smartphone, Download, Briefcase, Clock, ShieldCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Pages that should always have a solid/dark header
    const alwaysSolidPages = ["/onboarding", "/signin", "/signup", "/register", "/verify-email"];
    const isSolid = isScrolled || alwaysSolidPages.some(p => pathname?.startsWith(p));

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);

        let unsubDoc: (() => void) | null = null;
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (unsubDoc) unsubDoc();

            if (user) {
                unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
                    if (snap.exists()) {
                        setUserProfile(snap.data());
                    } else {
                        setUserProfile(null);
                    }
                });
            } else {
                setUserProfile(null);
            }
        });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (unsubDoc) unsubDoc();
            unsubscribeAuth();
        };
    }, []);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            localStorage.clear();
            setCurrentUser(null);
            setUserProfile(null);
            router.push("/");
            router.refresh();
        } catch (e) {
            console.error("Logout error:", e);
        }
    };

    // Determine target dashboard link based on role and status
    const getDashboardCta = () => {
        if (!userProfile) return { href: "/dashboard", label: "Dashboard", badge: null };
        const role = userProfile.role;
        const status = userProfile.status;

        if (role === 'admin') {
            return { href: "/admin/dashboard", label: "Admin Portal", badge: "ADMIN" };
        }
        if (role === 'service_provider') {
            if (status === 'pending_review' || status === 'pending') {
                return { href: "/dashboard/pending", label: "Under Review", badge: "IN REVIEW" };
            }
            if (status === 'approved') {
                return { href: "/dashboard/provider", label: "Job Hub", badge: "PRO" };
            }
            return { href: "/register/provider", label: "Complete KYC", badge: "ONBOARDING" };
        }
        if (role === 'agent') {
            if (status === 'approved') return { href: "/dashboard/agent", label: "Agent Portal", badge: "AGENT" };
            return { href: "/dashboard/pending", label: "Agent Review", badge: "IN REVIEW" };
        }
        // Client / default user
        if (status === 'unverified') {
            return { href: "/onboarding/profile", label: "Complete Profile", badge: "SETUP" };
        }
        return { href: "/dashboard/user", label: "Client Hub", badge: null };
    };

    const cta = getDashboardCta();
    const isLoggedIn = !!currentUser;

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
                    <a
                        href="/downloads/wheelofcomfort.apk"
                        download="wheelofcomfort.apk"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-primary/40 text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Direct Download Wheel of Comfort Android App"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Get App</span>
                    </a>

                    {!isLoggedIn ? (
                        <>
                            <Link href="/signin" className={`font-medium hover:text-primary transition-colors ${isSolid ? "text-gray-700" : "text-white"}`}>
                                Login
                            </Link>
                            <span className={`${isSolid ? "text-gray-300" : "text-white/30"}`}>/</span>
                            <Link href="/signup" className={`font-medium hover:text-primary transition-colors ${isSolid ? "text-gray-700" : "text-white"}`}>
                                Sign Up
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href={cta.href}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                                    userProfile?.status === 'unverified' && userProfile?.role === 'service_provider'
                                        ? "bg-amber-500 text-white hover:bg-amber-600 animate-pulse"
                                        : userProfile?.status === 'pending_review' || userProfile?.status === 'pending'
                                        ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                                        : isSolid
                                        ? "bg-accent text-white hover:opacity-90"
                                        : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[130px]">
                                    {userProfile?.fullName?.split(' ')[0] || "Account"}
                                </span>
                                {cta.badge && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-black/20 text-white">
                                        {cta.badge}
                                    </span>
                                )}
                            </Link>
                            <button
                                onClick={handleLogout}
                                title="Sign Out"
                                className={`p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors ${
                                    isSolid ? "text-gray-600" : "text-white/80"
                                }`}
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
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

                    <a
                        href="/downloads/wheelofcomfort.apk"
                        download="wheelofcomfort.apk"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-bold text-center shadow-md hover:opacity-95 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download Mobile App (APK)</span>
                    </a>

                    <div className="flex flex-col gap-3 mt-2">
                        {!isLoggedIn ? (
                            <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 rounded-lg">
                                <Link
                                    href="/signin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="font-bold text-gray-700 hover:text-primary"
                                >
                                    Login
                                </Link>
                                <span className="text-gray-300">/</span>
                                <Link
                                    href="/signup"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="font-bold text-gray-700 hover:text-primary"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Link
                                    href={cta.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-3 px-4 rounded-xl bg-accent text-white font-bold flex items-center justify-between shadow-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>{cta.label} ({userProfile?.fullName?.split(' ')[0] || 'User'})</span>
                                    </div>
                                    {cta.badge && (
                                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-white/20">
                                            {cta.badge}
                                        </span>
                                    )}
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
