"use client";

import { useState, useEffect } from "react";
import { Bell, Save, CheckCircle2, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function NotificationsSettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [settings, setSettings] = useState({
        serviceUpdates: true,
        chatMessages: true,
        receiptsAndBilling: true,
        promotions: false,
    });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const snap = await getDoc(doc(db, "users", currentUser.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        const notif = data.clientNotificationPreferences || {};
                        setSettings({
                            serviceUpdates: notif.serviceUpdates ?? true,
                            chatMessages: notif.chatMessages ?? true,
                            receiptsAndBilling: notif.receiptsAndBilling ?? true,
                            promotions: notif.promotions ?? false,
                        });
                    }
                } catch (e) {
                    console.warn("Could not load notification preferences", e);
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!user?.uid) return;
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await updateDoc(doc(db, "users", user.uid), {
                clientNotificationPreferences: settings,
                updatedAt: new Date().toISOString(),
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (e) {
            console.error("Failed to save notification settings", e);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-12 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-900 mb-2" />
                <p className="text-sm">Loading notification settings...</p>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-700" />
                    Notification Preferences
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Choose what alerts and service notifications you receive about your home maintenance requests.
                </p>
            </div>

            {saveSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>Notification preferences updated successfully.</span>
                </div>
            )}

            <div className="divide-y divide-gray-100">
                <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Service Request Status Changes</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Get notified when an artisan accepts, starts, or completes your request.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.serviceUpdates}
                            onChange={(e) => setSettings({ ...settings, serviceUpdates: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Artisan Chat Messages</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Real-time chat alerts when an assigned technician sends you an update.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.chatMessages}
                            onChange={(e) => setSettings({ ...settings, chatMessages: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Receipts & Payment Statements</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Email copies of escrow releases, invoices, and completed service receipts.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.receiptsAndBilling}
                            onChange={(e) => setSettings({ ...settings, receiptsAndBilling: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Seasonal Offers & Tips</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Occasional home maintenance recommendations and seasonal discounts.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.promotions}
                            onChange={(e) => setSettings({ ...settings, promotions: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                    </label>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Save Preferences</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
