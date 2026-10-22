"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Sparkles,
    Smartphone,
    Globe,
    Send,
    Download,
    CheckCircle2,
    Bell,
    Users,
    FileCode,
    RefreshCw
} from "lucide-react";

export default function AdminUpdatesPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);
    const [activeVersionData, setActiveVersionData] = useState<any>(null);

    // Broadcast Announcement Form State
    const [broadcastTitle, setBroadcastTitle] = useState("Wheelhomes Platform Update Available! 🚀");
    const [broadcastMessage, setBroadcastMessage] = useState(
        "We've released exciting enhancements including streamlined user roles (Clients, Service Providers, and Real Estate Agents), faster property searches, and direct job alerts. Tap to update!"
    );
    const [targetAudience, setTargetAudience] = useState<"all" | "user" | "service_provider" | "agent">("all");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

    // Fetch version data & user count on mount
    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Version Endpoint
            const res = await fetch("/api/version", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setActiveVersionData(data);
            }

            // 2. Fetch User Count
            const usersSnap = await getDocs(collection(db, "users"));
            setUserCount(usersSnap.size);
        } catch (e) {
            console.error("Error fetching update metadata:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Broadcast Announcement to Firestore `notifications`
    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
            alert("Please enter both a title and a message.");
            return;
        }

        const confirmMsg = `Send broadcast update notification to ${targetAudience === 'all' ? `ALL ${userCount} users` : `${targetAudience.replace('_', ' ')}s`}?`;
        if (!confirm(confirmMsg)) return;

        setIsBroadcasting(true);
        setBroadcastSuccess(null);

        try {
            const usersSnap = await getDocs(collection(db, "users"));
            const targetUsers = usersSnap.docs.filter(d => {
                if (targetAudience === "all") return true;
                const data = d.data();
                return data.role === targetAudience;
            });

            const nowIso = new Date().toISOString();
            let sentCount = 0;

            // Batch insert in chunks of 50
            for (const userDoc of targetUsers) {
                const uid = userDoc.id;
                await addDoc(collection(db, "notifications"), {
                    userId: uid,
                    recipientId: uid,
                    title: broadcastTitle.trim(),
                    message: broadcastMessage.trim(),
                    body: broadcastMessage.trim(),
                    type: "system_update",
                    read: false,
                    isRead: false,
                    createdAt: nowIso,
                    link: "/download"
                });
                sentCount++;
            }

            setBroadcastSuccess(`Successfully broadcasted update notification to ${sentCount} user(s)! 🎉`);
        } catch (err: any) {
            console.error("Broadcast error:", err);
            alert(`Failed to send broadcast: ${err.message}`);
        } finally {
            setIsBroadcasting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-orange-600" /> Platform Updates & Releases
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Control release versions, monitor live update checks, and broadcast in-app update notices to all web & mobile users.
                    </p>
                </div>

                <button
                    onClick={fetchStatus}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 shadow-xs transition-colors self-start cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Status
                </button>
            </div>

            {/* Version Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Web App */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Globe className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            Live on Web
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Web Application</p>
                    <h2 className="text-2xl font-black text-gray-900 mt-1">
                        v{activeVersionData?.version || "1.0.1"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Automatic background update detection enabled via <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">WebUpdateBanner</code>.
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Live Check Active
                    </div>
                </div>

                {/* 2. Mobile App (APK) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            Direct APK
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile App (Flutter)</p>
                    <h2 className="text-2xl font-black text-gray-900 mt-1">
                        v{activeVersionData?.mobile?.latestVersion || "1.0.0"} <span className="text-xs text-gray-400 font-normal">(Build {activeVersionData?.mobile?.latestBuildNumber || 1})</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Automatic startup check & in-app download dialog enabled via <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">UpdateService</code>.
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <a
                            href="/downloads/wheelofcomfort.apk"
                            target="_blank"
                            className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                        >
                            <Download className="w-3.5 h-3.5" /> Test APK Link
                        </a>
                        <span className="text-[11px] text-gray-400 font-mono">wheelofcomfort.apk</span>
                    </div>
                </div>

                {/* 3. Platform Audience */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            Real-Time
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered Accounts</p>
                    <h2 className="text-2xl font-black text-gray-900 mt-1">
                        {userCount} Users
                    </h2>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Clients, Service Providers, and Real Estate Agents ready to receive instant update dispatches.
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Notification Sync Ready
                    </div>
                </div>
            </div>

            {/* Broadcast In-App Notification Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
                        <Bell className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Broadcast Update Notice to Users</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Pushes an alert to every user's notification bell on both Web and Mobile apps with a link to update.
                        </p>
                    </div>
                </div>

                {broadcastSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{broadcastSuccess}</span>
                    </div>
                )}

                <form onSubmit={handleBroadcast} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700">Notification Title</label>
                            <input
                                type="text"
                                required
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                placeholder="e.g. Wheelhomes Update Available! 🚀"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700">Target Audience</label>
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value as any)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 font-medium cursor-pointer"
                            >
                                <option value="all">All Users ({userCount})</option>
                                <option value="user">Clients / Residents Only</option>
                                <option value="service_provider">Service Providers Only</option>
                                <option value="agent">Real Estate Agents Only</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700">Release Notes / Announcement Message</label>
                        <textarea
                            required
                            rows={3}
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            placeholder="Explain the new features and prompt users to refresh or update..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed font-normal"
                        />
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={isBroadcasting}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-200 flex items-center gap-2 cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                            {isBroadcasting ? "Sending Broadcast..." : "Broadcast Update Alert"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Release Instructions Card */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-xs text-gray-600 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-orange-600" /> How to Release a New APK in 3 Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>
                        In <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">mobile/pubspec.yaml</code>, increment the version (e.g. <code className="font-mono">1.0.1+2</code>).
                    </li>
                    <li>
                        Run <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">cd mobile && flutter build apk --release</code> in terminal.
                    </li>
                    <li>
                        Copy the generated <code className="font-mono">app-release.apk</code> into <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">public/downloads/wheelofcomfort.apk</code>.
                    </li>
                </ol>
                <p className="text-[11px] text-gray-500 pt-1">
                    Mobile devices will automatically detect the new release and show the download modal with your release notes!
                </p>
            </div>
        </div>
    );
}
