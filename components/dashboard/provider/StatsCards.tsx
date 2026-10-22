"use client";

import { Briefcase, Clock, CheckCircle, Star } from "lucide-react";

interface StatsProps {
    stats: {
        active: number;
        pending: number;
        completed: number;
        rating: number;
        ratingCount: number;
    }
}

export default function StatsCards({ stats }: StatsProps) {
    const cards = [
        {
            label: "Active Jobs",
            value: stats.active,
            subtext: "Currently in progress",
            icon: Briefcase,
            color: "text-orange-600",
            bg: "bg-orange-50",
            trend: stats.active > 0 ? "In Execution" : "Ready for Work"
        },
        {
            label: "Pending Requests",
            value: stats.pending,
            subtext: "Requires your attention",
            icon: Clock,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
            trend: stats.pending > 0 ? "Action Needed" : "All Caught Up"
        },
        {
            label: "Completed Jobs",
            value: stats.completed,
            subtext: "Lifetime total",
            icon: CheckCircle,
            color: "text-[#21C185]",
            bg: "bg-[#21C185]/10",
            trend: stats.completed > 0 ? `${stats.completed} Settled` : "Start Earning"
        },
        {
            label: "Average Rating",
            value: typeof stats.rating === 'number' ? stats.rating.toFixed(1) : "5.0",
            subtext: `From ${stats.ratingCount} verified reviews`,
            icon: Star,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            trend: stats.ratingCount > 0 ? "Verified Specialist" : "New Specialist"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                            {card.trend}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{card.value}</h3>
                        <p className="font-bold text-gray-700 text-sm mb-1">{card.label}</p>
                        <p className="text-xs text-gray-500">{card.subtext}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
