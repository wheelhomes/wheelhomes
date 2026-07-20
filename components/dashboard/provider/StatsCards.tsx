"use client";

import { Briefcase, Clock, CheckCircle, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
            color: "text-orange-600", // Primary (Brand)
            bg: "bg-orange-50",
            trend: "On Track"
        },
        {
            label: "Pending Requests",
            value: stats.pending,
            subtext: "Requires your attention",
            icon: Clock,
            color: "text-yellow-600", // Warning/Waiting
            bg: "bg-yellow-50",
            trend: "Action Needed"
        },
        {
            label: "Completed Jobs",
            value: stats.completed,
            subtext: "Lifetime total",
            icon: CheckCircle,
            color: "text-[#21C185]", // Secondary (Success)
            bg: "bg-[#21C185]/10",
            trend: "+12% this month"
        },
        {
            label: "Average Rating",
            value: stats.rating,
            subtext: `From ${stats.ratingCount} reviews`,
            icon: Star,
            color: "text-indigo-600", // Differentiate Rating
            bg: "bg-indigo-50",
            trend: "Top Rated"
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
                        {i === 2 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="w-3 h-3" /> 12%
                            </div>
                        )}
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
