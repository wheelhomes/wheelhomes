import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-accent text-white pt-20 pb-10 border-t border-white/5">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Column 1: Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white">W</div>
                            <span className="text-xl font-bold font-heading">Wheel of Comfort</span>
                        </div>
                        <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                            A trusted digital infrastructure for real estate operations and verified service fulfillment.
                        </p>
                        <div className="space-y-3 text-sm text-gray-400">
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Approved by Industry Leaders</p>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> 24/7 Support Certified</p>
                        </div>
                    </div>

                    {/* Column 2: Platform */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading text-white">Platform</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link href="/real-estate" className="hover:text-primary transition-colors">Residential Properties</Link></li>
                            <li><Link href="/real-estate" className="hover:text-primary transition-colors">Commercial Leases</Link></li>
                            <li><Link href="/services" className="hover:text-primary transition-colors">Book a Technician</Link></li>
                            <li><Link href="/become-a-provider" className="hover:text-primary transition-colors">Provider Application</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Pricing & Fees</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Company */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading text-white">Company</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link href="/about-us" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Safety Standards</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading text-white">Stay Informed</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Get the latest updates on property trends and service standards.
                        </p>
                        <form className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Email address"
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors"
                            />
                            <button className="bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-lg">
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-center md:text-left">
                        <p>&copy; {new Date().getFullYear()} Wheel of Comfort Inc.</p>
                        <div className="flex gap-4">
                            <Link href="#" className="hover:text-white">Privacy Policy</Link>
                            <Link href="#" className="hover:text-white">Terms of Service</Link>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Link href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all"><Facebook className="w-4 h-4" /></Link>
                        <Link href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all"><Twitter className="w-4 h-4" /></Link>
                        <Link href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all"><Instagram className="w-4 h-4" /></Link>
                        <Link href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all"><Linkedin className="w-4 h-4" /></Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
