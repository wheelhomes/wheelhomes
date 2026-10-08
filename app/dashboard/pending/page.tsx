"use client";

import { Clock, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PendingReviewPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-10">
                <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Clock className="w-10 h-10" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                    Thank you for registering. Your application is currently <span className="font-bold text-gray-900">Under Review</span> by our Admin team.
                </p>

                <div className="bg-blue-50 p-6 rounded-xl text-left mb-8">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-5 h-5" /> What happens next?
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                        <li>We will verify your documents (ID & Experience).</li>
                        <li>This usually takes 24-48 hours.</li>
                        <li>You will be notified via email once approved.</li>
                        <li>Once approved, you can log in to access jobs.</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href="/signin"
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-md transition-all text-center"
                    >
                        Sign In to Your Account
                    </Link>
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 font-medium text-sm transition-all text-center inline-flex items-center justify-center gap-1.5"
                    >
                        <span>Back to Home</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                        href="/downloads/wheelofcomfort.apk"
                        download="wheelofcomfort.apk"
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                        📱 Download the Mobile App for Android (.APK)
                    </a>
                </div>
            </div>
        </div>
    );
}
