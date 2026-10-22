"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Smartphone, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";

export default function DownloadPage() {
    const [downloadTriggered, setDownloadTriggered] = useState(false);

    useEffect(() => {
        // Automatically start the download after 800ms
        const timer = setTimeout(() => {
            const link = document.createElement("a");
            link.href = "/downloads/wheelofcomfort.apk";
            link.download = "wheelofcomfort.apk";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownloadTriggered(true);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between p-4 sm:p-8">
            {/* Top Navigation */}
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Wheelhomes</span>
                </Link>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Official Android Release
                </span>
            </div>

            {/* Main Download Card */}
            <div className="max-w-xl w-full mx-auto my-auto py-8">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-primary/10 text-center space-y-6">
                    {/* App Icon */}
                    <div className="relative inline-flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 shadow-xl shadow-orange-500/20">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <Smartphone className="w-10 h-10 text-orange-400" />
                            </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    </div>

                    {/* App Title & Version */}
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Wheel of Comfort
                        </h1>
                        <p className="text-sm text-slate-400">
                            All-in-one real estate, verified artisan services & escrow management
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                            <span className="font-semibold text-orange-400">v1.0.0</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-400">21.8 MB (Optimized)</span>
                            <span>•</span>
                            <span>Android 8.0+</span>
                        </div>
                    </div>

                    {/* Auto-download notification */}
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>
                            {downloadTriggered
                                ? "Your download has started!"
                                : "Preparing your download..."}
                        </span>
                    </div>

                    {/* Direct Download Button (Manual fallback) */}
                    <div className="space-y-3">
                        <a
                            href="/downloads/wheelofcomfort.apk"
                            download="wheelofcomfort.apk"
                            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02]"
                        >
                            <Download className="w-5 h-5" />
                            <span>Download Again (21.8 MB)</span>
                        </a>

                        <p className="text-xs text-slate-400">
                            If your browser blocked the automatic download, tap the button above.
                        </p>
                    </div>

                    {/* 3 Step Installation Guide */}
                    <div className="pt-6 border-t border-white/10 text-left space-y-3">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Quick Installation Steps
                        </h2>
                        <div className="grid gap-2.5 text-xs text-slate-300">
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                                    1
                                </span>
                                <div>
                                    <span className="font-semibold text-white">Tap the downloaded notification:</span> Once the 21.8 MB download completes, tap <code className="text-orange-300 font-mono">wheelofcomfort.apk</code>.
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                                    2
                                </span>
                                <div>
                                    <span className="font-semibold text-white">Allow Installation:</span> If prompted by Chrome or Android, toggle <span className="text-slate-200">"Allow from this source"</span> and tap <b>Install</b>.
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                                    3
                                </span>
                                <div>
                                    <span className="font-semibold text-white">Sign In & Explore:</span> Open Wheel of Comfort to book verified artisans or manage properties.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legacy / 32-bit Option */}
                    <div className="pt-4 border-t border-white/5 text-center text-xs text-slate-400">
                        Using an older 32-bit Android device?{" "}
                        <a
                            href="/downloads/wheelofcomfort-legacy.apk"
                            download="wheelofcomfort-legacy.apk"
                            className="text-orange-400 hover:text-orange-300 underline font-medium"
                        >
                            Download Legacy Build (19.5 MB)
                        </a>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <div className="max-w-4xl w-full mx-auto text-center py-4 text-xs text-slate-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Clean &amp; Safe APK &bull; Signed by Wheelhomes Production</span>
            </div>
        </main>
    );
}
