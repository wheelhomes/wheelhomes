"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Simple Settings Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="h-6 w-px bg-gray-200"></div>
                <h1 className="font-bold text-gray-900 text-lg">Account Settings</h1>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
                {children}
            </main>
        </div>
    );
}
