"use client";

import { Home } from "lucide-react";

export default function BuyerDashboard() {
    return (
        <div className="p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer / Renter Dashboard</h1>
                <p className="text-gray-600">Welcome! This is where you will track your saved properties and inquiries.</p>
            </div>
        </div>
    );
}
