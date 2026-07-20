import { Phone, MessageCircle } from "lucide-react";

export default function PropertyAgentSidebar() {
    return (
        <div className="sticky top-24 space-y-8">
            {/* Agent Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                        {/* Placeholder for agent image */}
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-500">IMG</div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Samuel Palmer</h3>
                        <p className="text-primary text-sm font-medium">Company Agent</p>
                        <div className="flex gap-1 mt-1 text-yellow-400 text-xs">★★★★★</div>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <button className="w-full border border-primary text-primary font-bold py-2 rounded hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4" /> (800) 123 4567
                    </button>
                    <button className="w-full bg-[#128C7E] text-white font-bold py-2 rounded hover:bg-[#075E54] transition-colors flex items-center justify-center gap-2">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                </div>

                <hr className="mb-6 border-gray-100" />

                <h4 className="font-bold text-gray-800 mb-4">Request a tour</h4>
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="py-2 text-sm border-b-2 border-primary font-bold text-gray-800">In Person</button>
                        <button type="button" className="py-2 text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-800">Video Chat</button>
                    </div>
                    <input type="date" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary" />
                    <input type="text" placeholder="Time" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary" />
                    <input type="text" placeholder="Name" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary" />
                    <input type="email" placeholder="Email" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary" />
                    <input type="tel" placeholder="Phone" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary" />
                    <textarea placeholder="Message" className="w-full px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary h-24"></textarea>
                    <button className="w-full bg-primary text-white font-bold py-3 rounded hover:bg-opacity-90 transition-colors">Submit Request</button>
                </form>
            </div>
        </div>
    );
}
