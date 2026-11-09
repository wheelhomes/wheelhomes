"use client";

import React, { useState, useMemo } from "react";
import { Search, Delete, X } from "lucide-react";

interface EmojiItem {
    emoji: string;
    keywords: string;
}

interface EmojiCategory {
    id: string;
    icon: string;
    label: string;
    items: EmojiItem[];
}

export const WOC_EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        id: "quick",
        icon: "👍",
        label: "Quick & Status",
        items: [
            { emoji: "👍", keywords: "thumbs up ok yes approve good" },
            { emoji: "🙏", keywords: "thank you please pray appreciate" },
            { emoji: "👋", keywords: "hello hi wave good day welcome" },
            { emoji: "🤝", keywords: "deal handshake agreed partner" },
            { emoji: "✅", keywords: "done check completed verified confirm" },
            { emoji: "🆗", keywords: "ok okay noted" },
            { emoji: "😊", keywords: "smile happy friendly" },
            { emoji: "😄", keywords: "grin happy" },
            { emoji: "😂", keywords: "laugh joy" },
            { emoji: "🫡", keywords: "salute yes sir on it" },
            { emoji: "🙌", keywords: "celebrate great hands" },
            { emoji: "👏", keywords: "clap well done" },
            { emoji: "🔥", keywords: "fire fast urgent" },
            { emoji: "💯", keywords: "100 percent perfect" },
            { emoji: "⭐", keywords: "star rating five star quality" },
            { emoji: "❤️", keywords: "heart love thanks" },
            { emoji: "🎉", keywords: "party completed congrats" },
            { emoji: "🤔", keywords: "thinking checking" },
            { emoji: "😅", keywords: "sweat sorry delay" },
            { emoji: "👀", keywords: "looking checking inspect" },
            { emoji: "⏳", keywords: "waiting hourglass soon" },
            { emoji: "🚀", keywords: "fast quick on my way" },
            { emoji: "✨", keywords: "clean sparkling new" },
            { emoji: "💪", keywords: "strong ready work" },
        ],
    },
    {
        id: "trades",
        icon: "🛠️",
        label: "Repairs & Trades",
        items: [
            { emoji: "🛠️", keywords: "tools hammer wrench repair fix service" },
            { emoji: "🔧", keywords: "wrench spanner plumbing mechanic tighten" },
            { emoji: "🔨", keywords: "hammer carpentry build Knock" },
            { emoji: "🪛", keywords: "screwdriver electrical appliance fix" },
            { emoji: "🪚", keywords: "saw wood carpenter" },
            { emoji: "🔩", keywords: "nut bolt spare part" },
            { emoji: "⚙️", keywords: "gear machine engine" },
            { emoji: "🧰", keywords: "toolbox technician kit" },
            { emoji: "🪜", keywords: "ladder roof ceiling height" },
            { emoji: "🧱", keywords: "brick wall masonry pop" },
            { emoji: "🪠", keywords: "plunger toilet drain clog plumbing" },
            { emoji: "🚿", keywords: "shower bathroom water pipe plumbing" },
            { emoji: "🚰", keywords: "tap water faucet sink leak" },
            { emoji: "🚽", keywords: "toilet wc bathroom" },
            { emoji: "🛁", keywords: "bathtub plumbing" },
            { emoji: "🪣", keywords: "bucket water mop" },
            { emoji: "🧹", keywords: "broom sweep cleaning" },
            { emoji: "🧽", keywords: "sponge wash clean" },
            { emoji: "🧼", keywords: "soap hygiene wash" },
            { emoji: "🧺", keywords: "laundry basket washing" },
            { emoji: "🎨", keywords: "paint painter wall color" },
            { emoji: "🖌️", keywords: "paintbrush painting" },
            { emoji: "🦺", keywords: "safety vest worker technician" },
            { emoji: "👷", keywords: "worker technician engineer builder" },
        ],
    },
    {
        id: "power",
        icon: "⚡",
        label: "AC, Solar & Power",
        items: [
            { emoji: "❄️", keywords: "ac air conditioner cooling cold chill" },
            { emoji: "🌡️", keywords: "temperature thermometer heat cool" },
            { emoji: "💨", keywords: "airflow fan blowing gas" },
            { emoji: "🧊", keywords: "ice fridge freezer cooling" },
            { emoji: "☀️", keywords: "sun solar panel inverter" },
            { emoji: "🔋", keywords: "battery inverter charge power" },
            { emoji: "🔌", keywords: "plug socket wire electrical cable" },
            { emoji: "⚡", keywords: "electricity power voltage spark" },
            { emoji: "💡", keywords: "bulb light lighting electrical" },
            { emoji: "🔦", keywords: "torch flashlight inspect" },
            { emoji: "⛽", keywords: "fuel generator diesel petrol gas" },
            { emoji: "🔥", keywords: "gas cooker stove heating" },
            { emoji: "📺", keywords: "tv television appliance screen" },
            { emoji: "🖥️", keywords: "monitor computer smart home" },
            { emoji: "📡", keywords: "dish antenna cctv network" },
            { emoji: "🔔", keywords: "bell alarm doorbell" },
            { emoji: "🚨", keywords: "emergency alert alarm" },
            { emoji: "🧯", keywords: "fire extinguisher safety" },
        ],
    },
    {
        id: "property",
        icon: "🏠",
        label: "Home & Property",
        items: [
            { emoji: "🏠", keywords: "house home building client door" },
            { emoji: "🏡", keywords: "house garden duplex" },
            { emoji: "🏢", keywords: "office apartment flat estate" },
            { emoji: "🏘️", keywords: "estate neighborhood houses" },
            { emoji: "🏗️", keywords: "construction site building" },
            { emoji: "🚪", keywords: "door gate entrance" },
            { emoji: "🪟", keywords: "window glass" },
            { emoji: "🛋️", keywords: "sofa couch living room furniture" },
            { emoji: "🛏️", keywords: "bed bedroom mattress" },
            { emoji: "🪑", keywords: "chair carpentry wood" },
            { emoji: "🔑", keywords: "key access lock door" },
            { emoji: "🔒", keywords: "lock security closed" },
            { emoji: "🔓", keywords: "unlock open" },
            { emoji: "🛡️", keywords: "shield verified security woc" },
            { emoji: "📦", keywords: "box package moving delivery" },
            { emoji: "🪴", keywords: "plant garden landscaping" },
        ],
    },
    {
        id: "dispatch",
        icon: "🚗",
        label: "Dispatch & Billing",
        items: [
            { emoji: "🚗", keywords: "car driving on my way traffic" },
            { emoji: "🚐", keywords: "van service vehicle" },
            { emoji: "🚚", keywords: "truck delivery moving" },
            { emoji: "🛵", keywords: "bike dispatch rider fast" },
            { emoji: "📍", keywords: "location pin address map arrived" },
            { emoji: "🗺️", keywords: "map direction route" },
            { emoji: "⏰", keywords: "time alarm schedule arrival" },
            { emoji: "⏱️", keywords: "timer duration minutes" },
            { emoji: "📅", keywords: "calendar date booking" },
            { emoji: "📞", keywords: "phone call contact" },
            { emoji: "💬", keywords: "chat message reply" },
            { emoji: "📸", keywords: "camera photo picture evidence proof" },
            { emoji: "🪪", keywords: "id badge request code woc" },
            { emoji: "🧾", keywords: "receipt invoice final bill quote" },
            { emoji: "💰", keywords: "money payment fee budget naira" },
            { emoji: "💳", keywords: "card escrow paystack payment" },
            { emoji: "📋", keywords: "clipboard checklist inspection" },
            { emoji: "✔️", keywords: "approved verified check" },
        ],
    },
];

export const WOC_QUICK_CHIPS = [
    "🚗 On my way",
    "📍 I'm at your gate",
    "🪪 Ready with #WOC ID",
    "🛠️ Inspecting the unit",
    "🧾 Final bill submitted",
    "✅ Work completed",
];

interface WhatsAppEmojiPickerProps {
    onSelectEmoji: (emoji: string) => void;
    onBackspace?: () => void;
    onClose: () => void;
}

export const WhatsAppEmojiPicker: React.FC<WhatsAppEmojiPickerProps> = ({
    onSelectEmoji,
    onBackspace,
    onClose,
}) => {
    const [activeCat, setActiveCat] = useState<string>("quick");
    const [search, setSearch] = useState<string>("");

    const displayedEmojis = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) {
            const cat = WOC_EMOJI_CATEGORIES.find((c) => c.id === activeCat);
            return cat ? cat.items : WOC_EMOJI_CATEGORIES[0].items;
        }
        const all: EmojiItem[] = [];
        const seen = new Set<string>();
        for (const cat of WOC_EMOJI_CATEGORIES) {
            for (const item of cat.items) {
                if (
                    !seen.has(item.emoji) &&
                    (item.keywords.includes(q) || item.emoji.includes(q))
                ) {
                    seen.add(item.emoji);
                    all.push(item);
                }
            }
        }
        return all;
    }, [activeCat, search]);

    const currentCategory = WOC_EMOJI_CATEGORIES.find((c) => c.id === activeCat);

    return (
        <div className="mb-2.5 bg-[#f0f2f5] border border-gray-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Quick Service Status Chips (1-Tap Insert) */}
            <div className="px-2.5 pt-2.5 pb-1.5 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {WOC_QUICK_CHIPS.map((chip) => (
                    <button
                        key={chip}
                        type="button"
                        onClick={() => onSelectEmoji(`${chip} `)}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200/70 text-[11px] font-semibold text-orange-900 transition-colors cursor-pointer"
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* WhatsApp-Style Category Tab Bar */}
            <div className="flex items-center justify-between bg-white px-2 py-1 border-b border-gray-200">
                <div className="flex items-center gap-0.5 flex-1">
                    {WOC_EMOJI_CATEGORIES.map((cat) => {
                        const isActive = !search && activeCat === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setActiveCat(cat.id);
                                }}
                                title={cat.label}
                                className={`flex-1 py-1.5 rounded-lg text-base flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                                    isActive
                                        ? "bg-orange-50 text-orange-600"
                                        : "text-gray-500 hover:bg-gray-100"
                                }`}
                            >
                                <span>{cat.icon}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    title="Close Emoji Picker"
                    className="p-1.5 ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search Bar inside Emoji Drawer (WhatsApp Style) */}
            <div className="px-2.5 pt-2 pb-1">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search service emojis (e.g. ac, solar, tool, car, bill)..."
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* Section Label */}
            <div className="px-3 pt-1 pb-0.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {search.trim()
                        ? `Search Results (${displayedEmojis.length})`
                        : currentCategory?.label || "Emojis"}
                </span>
            </div>

            {/* Emoji Grid */}
            <div className="px-2 pb-2 max-h-44 overflow-y-auto grid grid-cols-8 gap-1">
                {displayedEmojis.length === 0 ? (
                    <div className="col-span-8 py-6 text-center text-xs text-gray-400">
                        No matching emojis found
                    </div>
                ) : (
                    displayedEmojis.map((item) => (
                        <button
                            key={item.emoji}
                            type="button"
                            onClick={() => onSelectEmoji(item.emoji)}
                            className="h-9 flex items-center justify-center text-xl rounded-xl hover:bg-white hover:shadow-sm active:scale-90 transition-all cursor-pointer"
                        >
                            {item.emoji}
                        </button>
                    ))
                )}
            </div>

            {/* Bottom Bar with Backspace (WhatsApp Style) */}
            {onBackspace && (
                <div className="px-3 py-1.5 bg-white/80 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Wheel of Comfort Service Keyboard</span>
                    <button
                        type="button"
                        onClick={onBackspace}
                        title="Backspace"
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                        <Delete className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

