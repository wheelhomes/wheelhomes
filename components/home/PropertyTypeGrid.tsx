import { Building, Building2, Home, Hotel, Store } from "lucide-react";
import Link from "next/link";

export default function PropertyTypeGrid() {
    const types = [
        { name: "Apartment", count: 3, icon: <Building2 className="w-8 h-8 text-primary" /> },
        { name: "Villa", count: 2, icon: <Home className="w-8 h-8 text-primary" /> },
        { name: "Studio", count: 1, icon: <Hotel className="w-8 h-8 text-primary" /> },
        { name: "Office", count: 5, icon: <Building className="w-8 h-8 text-primary" /> },
        { name: "Shop", count: 2, icon: <Store className="w-8 h-8 text-primary" /> },
    ];

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Properties by Type</h2>
                    <p className="text-gray-500">Find the perfect property type for you</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {types.map((item, index) => (
                        <Link
                            key={index}
                            href="#"
                            className="group flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="mb-4 bg-blue-50 p-4 rounded-full group-hover:bg-primary/10 transition-colors">
                                {item.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-500">{item.count} Properties</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
