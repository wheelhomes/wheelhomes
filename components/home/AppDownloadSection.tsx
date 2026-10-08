"use client";

import React from "react";
import Link from "next/link";
import { Smartphone, Download, ShieldCheck, CheckCircle2, ArrowRight, Zap, QrCode } from "lucide-react";
import Container from "@/components/ui/Container";

export default function AppDownloadSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 via-accent to-slate-900 text-white relative overflow-hidden border-t border-white/5">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Info Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              Direct Mobile App
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-white leading-tight">
              Get the Wheel of Comfort App Directly to Your Phone
            </h2>

            <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-light max-w-xl mx-auto lg:mx-0">
              No store delays. Download our official Android application package (APK) or install directly on iOS for instant booking, live artisan dispatch, and secured escrow transactions.
            </p>

            {/* Quick Benefits list */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2 text-left max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Instant Job Push Notifications</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>100% Escrow Protected Booking</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Verified Service Provider KYC</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Zero Store Fees &bull; 100% Free</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="/downloads/wheelofcomfort.apk"
                download="wheelofcomfort.apk"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-xl shadow-primary/25 transition-all hover:scale-105"
              >
                <Download className="w-5 h-5" />
                <span>Download Android App (.APK)</span>
              </a>
            </div>
          </div>

          {/* Right Phone Visual Column (5 Cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-72 sm:w-80">
              {/* Phone Frame Mockup */}
              <div className="relative rounded-[40px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-primary/20">
                {/* Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

                {/* Inner Screen Preview */}
                <div className="rounded-[32px] bg-gradient-to-b from-[#0F172A] to-[#0B132B] p-5 space-y-4 border border-white/5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-xs text-white">
                        W
                      </div>
                      <span className="text-xs font-bold text-white">Wheel of Comfort</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="text-[10px] text-primary uppercase font-bold tracking-wider">
                      Verified Dispatch
                    </div>
                    <div className="text-sm font-bold text-white">Artisan Arriving in 15 mins</div>
                    <div className="text-[11px] text-gray-400">Escrow Locked: ₦25,000</div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-8 rounded-xl bg-white/5 flex items-center px-3 text-[11px] text-gray-300 gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Plumbing & Electrical KYC Active</span>
                    </div>
                    <div className="h-8 rounded-xl bg-white/5 flex items-center px-3 text-[11px] text-gray-300 gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant 1-Tap Booking</span>
                    </div>
                  </div>

                  <a
                    href="/downloads/wheelofcomfort.apk"
                    download="wheelofcomfort.apk"
                    className="w-full block py-2.5 rounded-xl bg-primary text-white text-center text-xs font-bold shadow-md hover:bg-primary/90 transition-colors"
                  >
                    Download Standalone APK &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
