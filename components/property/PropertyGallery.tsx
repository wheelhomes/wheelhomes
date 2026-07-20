import Image from "next/link";
import { Camera, Video, Map } from "lucide-react";

export default function PropertyGallery() {
    return (
        <div className="relative h-[60vh] min-h-[400px] mb-8 group">
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-2">
                {/* Main Image */}
                <div className="col-span-2 row-span-2 relative overflow-hidden rounded-l-lg">
                    {/* Using existing property image as placeholder */}
                    <img src="/images/property-1.png" alt="Property Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>

                {/* Secondary Images */}
                <div className="relative overflow-hidden">
                    <img src="/images/hero-bg.png" alt="Property Detail 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden rounded-tr-lg">
                    <img src="/images/property-1.png" alt="Property Detail 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden">
                    <img src="/images/hero-bg.png" alt="Property Detail 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden rounded-br-lg">
                    <img src="/images/property-1.png" alt="Property Detail 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />

                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button className="bg-white text-gray-800 text-xs font-bold px-3 py-2 rounded shadow-md hover:bg-primary hover:text-white transition-colors flex items-center gap-1">
                            <Camera className="w-4 h-4" /> 12 Photos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
