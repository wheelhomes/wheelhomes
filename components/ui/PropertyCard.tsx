import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Move, MapPin, Heart, Plus } from "lucide-react";

interface PropertyProps {
    id: number | string;
    image: string;
    title: string;
    price: string;
    address: string;
    beds: number;
    baths: number;
    sqft: number;
    type: string;
    status: string;
    agentName: string;
    agentImage?: string;
}

export default function PropertyCard({ property }: { property: PropertyProps }) {
    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group border border-gray-100">
            {/* Image Container */}
            <div className="relative h-64 overflow-hidden">
                <Link href={`/property/details?id=${property.id}`} className="block w-full h-full">
                    <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded uppercase">
                            {property.status}
                        </span>
                        {property.type === 'Appartment' || property.type === 'Studio' ? (
                            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                                FEATURED
                            </span>
                        ) : null}
                    </div>

                    {/* Price */}
                    <div className="absolute bottom-4 left-4 text-white font-bold text-xl drop-shadow-md">
                        {property.price}
                        <span className="text-xs font-normal ml-1 opacity-90">/ mo</span>
                    </div>
                </Link>

                {/* Actions - Kept outside Link to prevent nesting issues if they were buttons, but here they are absolute positioned. 
                    However, they are buttons. Buttons inside Anchor tags are invalid HTML.
                    They must be positioned absolutely on top of the Link or the Hierachy adjusted.
                    Since they are absolute, we can keep them as siblings to the Link if the parent is relative.
                 */}
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <button className="p-2 bg-gray-900/50 hover:bg-primary text-white rounded transition-colors z-10" title="Add to Favorites">
                        <Heart className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-gray-900/50 hover:bg-primary text-white rounded transition-colors z-10" title="Compare">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <Link href={`/property/details?id=${property.id}`} className="block mb-2">
                    <h3 className="text-lg font-bold text-gray-800 hover:text-primary transition-colors truncate">
                        {property.title}
                    </h3>
                </Link>
                <div className="flex items-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{property.address}</span>
                </div>

                {/* Features */}
                <div className="flex items-center justify-between text-gray-600 text-sm mb-4">
                    <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" /> <span className="font-bold">{property.beds}</span> Beds
                    </div>
                    <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" /> <span className="font-bold">{property.baths}</span> Baths
                    </div>
                    <div className="flex items-center gap-1">
                        <Move className="w-4 h-4" /> <span className="font-bold">{property.sqft}</span> Sq Ft
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                            {/* Placeholder for agent image, or use Next Image if available */}
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-600">A</div>
                        </div>
                        <span>{property.agentName}</span>
                    </div>
                    <span>4 years ago</span>
                </div>
            </div>
        </div>
    );
}
