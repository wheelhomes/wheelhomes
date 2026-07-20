import Link from "next/link";
import { MapPin, Share2, Heart, Printer, GitCompare } from "lucide-react";

interface PropertyHeaderProps {
    title: string;
    address: string;
    price: string;
    type: string;
    status: string;
}

export default function PropertyHeader({ title, address, price, type, status }: PropertyHeaderProps) {
    return (
        <div className="mb-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <span>/</span>
                <span className="text-gray-800">{title}</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex gap-2 mb-3">
                        <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded uppercase">{status}</span>
                        <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded uppercase">{type}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
                    <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {address}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                    <div className="text-3xl font-bold text-primary">
                        {price} <span className="text-lg font-normal text-gray-500">/ mo</span>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm">
                            <Heart className="w-4 h-4" /> Save
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm">
                            <GitCompare className="w-4 h-4" /> Compare
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
