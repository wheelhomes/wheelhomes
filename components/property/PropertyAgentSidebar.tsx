import { Phone, MessageCircle, ShieldCheck } from "lucide-react";

interface PropertyAgentSidebarProps {
    agentName?: string;
    agentPhone?: string;
}

export default function PropertyAgentSidebar({
    agentName = "Babatunde Balogun",
    agentPhone = "+234 803 555 0192"
}: PropertyAgentSidebarProps) {
    const initials = agentName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

    return (
        <div className="sticky top-24 space-y-8">
            {/* Agent Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm">
                        {initials}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-gray-900">{agentName}</h3>
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-gray-500 text-xs font-semibold">Verified Wheelhomes Partner</p>
                        <div className="flex gap-0.5 mt-1 text-amber-400 text-xs">★★★★★</div>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <a
                        href={`tel:${agentPhone}`}
                        className="w-full border border-gray-300 hover:border-gray-900 text-gray-800 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Phone className="w-4 h-4 text-gray-600" /> {agentPhone}
                    </a>
                    <a
                        href={`https://wa.me/${agentPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#128C7E] hover:bg-[#075E54] text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                        <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                    </a>
                </div>

                <hr className="mb-6 border-gray-100" />

                <h4 className="font-bold text-gray-900 text-sm mb-4">Request a Private Inspection</h4>
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert("Inspection request submitted successfully! An agent will contact you shortly."); }}>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="py-2 text-xs border-b-2 border-orange-600 font-bold text-gray-900">In Person</button>
                        <button type="button" className="py-2 text-xs border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-semibold">Virtual Tour</button>
                    </div>
                    <input type="date" required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500" />
                    <input type="text" placeholder="Preferred Time (e.g. 11:00 AM)" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500" />
                    <input type="text" placeholder="Your Full Name" required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500" />
                    <input type="tel" placeholder="Phone Number" required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500" />
                    <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-sm">
                        Submit Inspection Request
                    </button>
                </form>
            </div>
        </div>
    );
}
