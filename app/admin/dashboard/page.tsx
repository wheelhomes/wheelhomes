"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import {
    Users,
    Briefcase,
    DollarSign,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle,
    AlertCircle,
    Clock,
    Server,
    Database,
    ShieldCheck,
    MoreHorizontal,
    Building2,
    CreditCard
} from "lucide-react";
import Link from "next/link";


// Utility for formatting time
const timeAgo = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return Math.floor(seconds) + " seconds ago";
    } catch (e) {
        return "Just now";
    }
};

export default function AdminDashboardOverview() {
    // State for Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeProviders: 0,
        pendingProviders: 0,
        totalProperties: 0,
        revenue: 0,
        escrowHeld: 0
    });

    // State for Activity Feed
    const [activities, setActivities] = useState<any[]>([]);
    const [isLive, setIsLive] = useState(true);

    useEffect(() => {
        // 1. Fetch Users Data (Real-time)
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const totalUsers = users.length;
            const activeProviders = users.filter((u: any) => u.role === 'service_provider' && u.status === 'approved').length;

            setStats(prev => ({ ...prev, totalUsers, activeProviders }));
        }, (err) => console.warn("Dashboard users listener:", err.message));

        // 2. Fetch Pending Applications (Real-time)
        const appsQuery = query(collection(db, "user_applications"), where("status", "==", "pending"));
        const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
            const pendingProviders = snapshot.size;
            setStats(prev => ({ ...prev, pendingProviders }));
        }, (err) => console.warn("Dashboard apps listener:", err.message));

        // 3. Fetch Properties Count (Real-time)
        const propsQuery = query(collection(db, "properties"));
        const unsubscribeProps = onSnapshot(propsQuery, (snapshot) => {
            const totalProperties = snapshot.size;
            setStats(prev => ({ ...prev, totalProperties }));
        }, (err) => console.warn("Dashboard properties listener:", err.message));

        // 4. Fetch Transactions for Real Revenue & Escrow (Real-time)
        const txQuery = query(collection(db, "transactions"));
        const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
            let totalRev = 0;
            let escrowHeld = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const amt = Number(data.amount || 0);
                totalRev += amt;
                if (data.status === 'escrow_held') {
                    escrowHeld += amt;
                }
            });
            setStats(prev => ({ ...prev, revenue: totalRev, escrowHeld }));
        }, (err) => console.warn("Dashboard transactions listener:", err.message));

        // 5. Fetch Notifications for Activity Feed
        const notificationsQuery = query(
            collection(db, "notifications"),
            where("recipientId", "==", "admin"),
            orderBy("createdAt", "desc"),
            limit(20)
        );

        const unsubscribeNotifs = onSnapshot(notificationsQuery, (snapshot) => {
            const alerts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.type || 'info',
                    user: "System",
                    role: 'admin',
                    time: timeAgo(data.createdAt),
                    msg: data.title,
                    description: data.message,
                    rawTime: data.createdAt,
                    link: data.link
                };
            });
            setActivities(alerts);
        }, (err) => console.warn("Dashboard notifications listener:", err.message));

        // Live Pulse Effect
        const interval = setInterval(() => setIsLive(p => !p), 2000);

        return () => {
            unsubscribeUsers();
            unsubscribeApps();
            unsubscribeProps();
            unsubscribeTx();
            unsubscribeNotifs();
            clearInterval(interval);
        };
    }, []);

    // Derived Stats
    const DISPLAY_STATS = [
        {
            label: "Total Users",
            value: stats.totalUsers.toLocaleString(),
            change: "Live",
            trend: "up",
            icon: Users,
            color: "text-gray-600",
            href: "/admin/users"
        },
        {
            label: "Active Providers",
            value: stats.activeProviders.toLocaleString(),
            change: stats.pendingProviders > 0 ? `${stats.pendingProviders} pending` : "Active",
            trend: stats.pendingProviders > 0 ? "down" : "up",
            icon: Briefcase,
            color: "text-orange-600",
            href: "/admin/approvals"
        },
        {
            label: "Property Listings",
            value: stats.totalProperties.toLocaleString(),
            change: "Real Estate",
            trend: "up",
            icon: Building2,
            color: "text-blue-600",
            href: "/admin/properties"
        },
        {
            label: "Escrow Vault",
            value: stats.escrowHeld > 0 ? `₦${stats.escrowHeld.toLocaleString()}` : `₦${stats.revenue.toLocaleString()}`,
            change: stats.escrowHeld > 0 ? "Held Safe" : "Total Volume",
            trend: "up",
            icon: CreditCard,
            color: "text-green-600",
            href: "/admin/transactions"
        },
    ];

    return (
        <div className="space-y-8 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-500 text-sm">Real-time system insights.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500" : "bg-green-200"} transition-colors duration-500`}></span>
                    System Online
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {DISPLAY_STATS.map((stat, i) => (
                    <Link
                        key={i}
                        href={stat.href}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group block"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-orange-50 transition-colors">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <span className={`flex items-center text-xs font-bold ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-amber-600' : 'text-gray-400'}`}>
                                {stat.change}
                                {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
                                {stat.trend === 'down' && <AlertCircle className="w-3 h-3 ml-0.5" />}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{stat.value}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Activity Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-400" /> Recent Activity
                        </h2>
                        <Link href="/admin/users" className="text-xs text-orange-600 font-medium hover:underline">Manage Users</Link>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">No recent activity detected.</div>
                            ) : (
                                activities.map((act) => (
                                    <div key={act.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 animate-in fade-in duration-300">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                            ${act.type === 'warning' ? 'bg-orange-50 text-orange-600' :
                                                act.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {act.type === 'warning' ? <Briefcase className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                <span className="font-bold">{act.msg}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                {act.description}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {act.time}
                                            </p>
                                        </div>
                                        {act.link && (
                                            <Link href={act.link} className="text-xs font-medium text-orange-600 hover:underline">
                                                View
                                            </Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                            <span className="text-xs text-gray-400 flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Listening for events...
                            </span>
                        </div>
                    </div>
                </div>

                {/* System Status & Quick Links */}
                <div className="space-y-8">
                    {/* System Status */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            System Status
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Database className="w-4 h-4 text-gray-400" /> Firestore
                                </div>
                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <ShieldCheck className="w-4 h-4 text-gray-400" /> Auth
                                </div>
                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Server className="w-4 h-4 text-gray-400" /> Storage
                                </div>
                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                        <h3 className="text-sm font-bold opacity-90 uppercase tracking-wider mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link href="/admin/users" className="block w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group">
                                Review Approvals
                                {stats.pendingProviders > 0 && (
                                    <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{stats.pendingProviders}</span>
                                )}
                            </Link>
                            <button className="block w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group text-left">
                                View Request Log
                                <Activity className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </button>
                            <button className="block w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group text-left">
                                Server Settings
                                <Server className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                        <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Danger Zone
                        </h3>
                        <p className="text-xs text-red-700 mb-4 leading-relaxed">
                            Authorized actions only. Data deletion is permanent.
                        </p>
                        <button
                            onClick={async () => {
                                if (confirm("DANGER: This will delete ALL job requests and seed providers from the database.\n\nAre you sure you want to proceed?")) {
                                    if (confirm("FINAL WARNING: This cannot be undone. Confirm wipe?")) {
                                        const { wipeAllData } = await import("../../../lib/seed-data");
                                        const success = await wipeAllData();
                                        if (success) alert("System data wiped successfully.");
                                        else alert("Wipe failed. Check console.");
                                    }
                                }
                            }}
                            className="w-full py-2 px-3 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            Wipe All Request Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
