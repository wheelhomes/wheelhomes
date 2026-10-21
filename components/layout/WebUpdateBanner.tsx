"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

export default function WebUpdateBanner() {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [initialBuildTime, setInitialBuildTime] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function checkVersion() {
            try {
                const res = await fetch("/api/version", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.buildTime) return;

                if (initialBuildTime === null) {
                    // First check on page load: record current session build time
                    setInitialBuildTime(data.buildTime);
                } else if (data.buildTime > initialBuildTime) {
                    // Subsequent check: newer build deployed on server!
                    if (isMounted) {
                        setLatestVersion(data.version || null);
                        setReleaseNotes(data.releaseNotes || null);
                        setHasUpdate(true);
                    }
                }
            } catch (err) {
                // Silently ignore network hiccup during background check
            }
        }

        // Check on initial load
        checkVersion();

        // Check periodically every 10 minutes
        const interval = setInterval(checkVersion, 10 * 60 * 1000);

        // Check when user switches back to this browser tab
        const onFocus = () => checkVersion();
        window.addEventListener("focus", onFocus);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [initialBuildTime]);

    if (!hasUpdate || isDismissed) {
        return null;
    }

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <aside
            aria-label="Platform update notification"
            className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-md border border-orange-200/80 rounded-2xl p-4 shadow-2xl shadow-orange-500/10 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                            Update Available {latestVersion ? `(v${latestVersion})` : ""}
                        </h4>
                        <button
                            onClick={() => setIsDismissed(true)}
                            aria-label="Dismiss update notification"
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                        {releaseNotes || "A new version of Wheelhomes is ready with improvements."}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={handleReload}
                            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Reload to Update
                        </button>
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
