import { Camera } from "lucide-react";

interface PropertyGalleryProps {
    mainImage?: string;
    images?: string[];
}

export default function PropertyGallery({ mainImage, images }: PropertyGalleryProps) {
    const defaultPlaceholder = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80";
    const primary = mainImage || (images && images[0]) || defaultPlaceholder;
    const secondary1 = (images && images[1]) || (images && images[0]) || primary;
    const secondary2 = (images && images[2]) || primary;
    const secondary3 = (images && images[3]) || secondary1;
    const secondary4 = (images && images[4]) || primary;
    const totalPhotos = images && images.length > 0 ? images.length : 1;

    return (
        <div className="relative h-[60vh] min-h-[400px] mb-8 group">
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-2">
                {/* Main Image */}
                <div className="col-span-2 row-span-2 relative overflow-hidden rounded-l-lg bg-gray-100">
                    <img src={primary} alt="Property Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>

                {/* Secondary Images */}
                <div className="relative overflow-hidden bg-gray-100">
                    <img src={secondary1} alt="Property Detail 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden rounded-tr-lg bg-gray-100">
                    <img src={secondary2} alt="Property Detail 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden bg-gray-100">
                    <img src={secondary3} alt="Property Detail 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                </div>
                <div className="relative overflow-hidden rounded-br-lg bg-gray-100">
                    <img src={secondary4} alt="Property Detail 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />

                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button className="bg-white text-gray-800 text-xs font-bold px-3 py-2 rounded shadow-md hover:bg-orange-600 hover:text-white transition-colors flex items-center gap-1">
                            <Camera className="w-4 h-4" /> {totalPhotos > 1 ? `${totalPhotos} Photos` : "Verified Photos"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
