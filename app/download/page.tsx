"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  PlusSquare,
  QrCode,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Lock,
} from "lucide-react";

export default function DownloadPage() {
  const [activePlatform, setActivePlatform] = useState<"android" | "ios">("android");
  const [downloadStarted, setDownloadStarted] = useState(false);

  // APK download URL (can be customized via NEXT_PUBLIC_APK_URL or GitHub Releases / Firebase Storage / local file)
  const apkDownloadUrl =
    process.env.NEXT_PUBLIC_APK_URL || "/downloads/wheelofcomfort.apk";

  const handleDownload = () => {
    setDownloadStarted(true);
    // Trigger download
    const link = document.createElement("a");
    link.href = apkDownloadUrl;
    link.setAttribute("download", "wheelofcomfort.apk");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-32 pb-24">
        {/* Header Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            Official Wheel of Comfort Mobile App
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Home Services & Real Estate in Your Pocket
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-slate-300 leading-relaxed font-light">
            Download the official app directly to your phone. Connect with background-checked artisans, 
            explore verified properties, and manage escrow payments on the go.
          </p>

          {/* Platform Toggle */}
          <div className="inline-flex items-center gap-2 mt-8 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 backdrop-blur-md shadow-xl">
            <button
              onClick={() => setActivePlatform("android")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activePlatform === "android"
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Android (.APK)
            </button>
            <button
              onClick={() => setActivePlatform("ios")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activePlatform === "ios"
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Share2 className="w-4 h-4" />
              iPhone / iOS (Instant Web App)
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Download / Install Action (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {activePlatform === "android" ? (
              // ANDROID APK CARD
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Wheel of Comfort for Android</h2>
                      <p className="text-xs text-slate-400">Direct Standalone Package (APK)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      v1.0.0 Stable
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                      ~28 MB
                    </span>
                  </div>
                </div>

                {/* Primary Download Button */}
                <div className="py-8 text-center space-y-4">
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] active:scale-[0.99] transition-all"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>Download Android App (APK)</span>
                  </button>

                  {downloadStarted && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Download initiated! Check your browser downloads if it did not start automatically.</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    100% Free Direct Download &bull; Verified Safe &bull; No Google Play Account Required
                  </p>
                </div>

                {/* 3-Step Installation Guide */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    How to install on your Android device (3 Steps)
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Tap "Download APK"</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          If your browser displays <span className="text-amber-300 font-medium">"File might be harmful"</span>, tap <span className="text-white font-semibold">"Download anyway"</span>. This is Android's standard prompt for apps installed directly outside Google Play.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Allow Installation</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Open the downloaded file. If prompted with <span className="text-amber-300 font-medium">"Install unknown apps"</span>, tap <span className="text-white font-semibold">Settings</span> and toggle <span className="text-white font-semibold">"Allow from this source"</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Tap Install & Launch</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Tap <span className="text-white font-semibold">Install</span>, wait 5 seconds, then tap <span className="text-white font-semibold">Open</span>. Sign in or register to begin!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // IOS / IPHONE PWA CARD
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Wheel of Comfort for iPhone (iOS)</h2>
                      <p className="text-xs text-slate-400">Instant Fullscreen Web App &bull; No App Store Required</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    Instant 0-Second Setup
                  </span>
                </div>

                <div className="py-6">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Because Apple restricts installing raw files, you can install the complete Wheel of Comfort app to your iPhone Home Screen via Safari. It looks, feels, and performs just like an App Store app with full offline caching and push notifications.
                  </p>
                </div>

                {/* 3 Steps for iOS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Open in Safari</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Open <span className="text-sky-400 font-semibold">wheelofcomfort.vercel.app</span> inside your iPhone's Safari browser.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Tap the Share Button</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tap the <span className="text-white font-semibold">Share icon</span> at the bottom of Safari (the square icon with an arrow pointing up 📤).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Tap "Add to Home Screen"</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Scroll down the menu, tap <span className="text-white font-semibold">"Add to Home Screen"</span>, then tap <span className="text-emerald-400 font-bold">"Add"</span>. The app icon will appear directly on your home screen!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <Link
                    href="/signin"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <span>Launch Web App Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Scan to Download + App Highlights (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Desktop QR Code Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Browsing from a PC or Mac?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scan this QR code with your phone camera to open this download page directly on your phone.
                </p>
              </div>

              {/* Styled QR Code Box */}
              <div className="inline-block p-4 bg-white rounded-2xl shadow-inner border-4 border-slate-700/50">
                <svg
                  className="w-36 h-36 mx-auto"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Clean SVG QR Code Representation */}
                  <rect width="100" height="100" fill="white" />
                  {/* Top-Left Finder */}
                  <rect x="10" y="10" width="28" height="28" rx="4" fill="#0F172A" />
                  <rect x="16" y="16" width="16" height="16" rx="2" fill="white" />
                  <rect x="20" y="20" width="8" height="8" rx="1" fill="#0284C7" />

                  {/* Top-Right Finder */}
                  <rect x="62" y="10" width="28" height="28" rx="4" fill="#0F172A" />
                  <rect x="68" y="16" width="16" height="16" rx="2" fill="white" />
                  <rect x="72" y="20" width="8" height="8" rx="1" fill="#0284C7" />

                  {/* Bottom-Left Finder */}
                  <rect x="10" y="62" width="28" height="28" rx="4" fill="#0F172A" />
                  <rect x="16" y="68" width="16" height="16" rx="2" fill="white" />
                  <rect x="20" y="72" width="8" height="8" rx="1" fill="#0284C7" />

                  {/* QR Pattern Modules */}
                  <rect x="44" y="12" width="6" height="6" fill="#0F172A" />
                  <rect x="52" y="18" width="6" height="6" fill="#0F172A" />
                  <rect x="44" y="26" width="6" height="6" fill="#0F172A" />
                  <rect x="52" y="32" width="6" height="6" fill="#0284C7" />

                  <rect x="14" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="24" y="52" width="6" height="6" fill="#0284C7" />
                  <rect x="34" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="44" y="48" width="6" height="6" fill="#0F172A" />
                  <rect x="54" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="64" y="52" width="6" height="6" fill="#0284C7" />
                  <rect x="74" y="44" width="6" height="6" fill="#0F172A" />
                  <rect x="84" y="52" width="6" height="6" fill="#0F172A" />

                  <rect x="44" y="64" width="6" height="6" fill="#0F172A" />
                  <rect x="52" y="70" width="6" height="6" fill="#0284C7" />
                  <rect x="62" y="64" width="6" height="6" fill="#0F172A" />
                  <rect x="72" y="74" width="6" height="6" fill="#0F172A" />
                  <rect x="80" y="64" width="6" height="6" fill="#0F172A" />
                  <rect x="84" y="78" width="6" height="6" fill="#0284C7" />
                  <rect x="52" y="82" width="6" height="6" fill="#0F172A" />
                  <rect x="64" y="86" width="6" height="6" fill="#0F172A" />
                  <rect x="76" y="84" width="6" height="6" fill="#0F172A" />
                </svg>
              </div>

              <p className="text-[11px] text-slate-500 font-mono">
                wheelofcomfort.vercel.app/download
              </p>
            </div>

            {/* Feature Highlights Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Why use the Mobile App?
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Instant Dispatch Alerts</h4>
                    <p className="text-xs text-slate-400">Receive real-time notifications for job requests and property bookings directly on your screen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">100% Escrow Protection</h4>
                    <p className="text-xs text-slate-400">Payments remain securely locked until both provider and client approve work completion.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">KYC Verified Artisans</h4>
                    <p className="text-xs text-slate-400">Every plumber, electrician, builder, and cleaner is vetted with government-issued IDs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
