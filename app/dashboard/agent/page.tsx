"use client";

import { Briefcase } from "lucide-react";

export default function AgentDashboard() {
    return (
        <div className="p-8">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Dashboard</h1>
                <p className="text-gray-600">Welcome! This is where you will manage your property listings and leads.</p>
            </div>
        </div>
    );
}
