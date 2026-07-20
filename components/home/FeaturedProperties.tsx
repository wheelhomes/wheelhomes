import PropertyCard from "@/components/ui/PropertyCard";

export default function FeaturedProperties() {
    const properties = [
        {
            id: 1,
            title: "Luxury Villa in Miami",
            price: "₦13,000",
            address: "123 Ocean Dr, Miami, FL 33139",
            beds: 3,
            baths: 2,
            sqft: 2500,
            type: "Villa",
            status: "For Rent",
            agentName: "Samuel Palmer",
            image: "/images/property-1.png",
        },
        {
            id: 2,
            title: "Modern Apartment Downtown",
            price: "₦5,500",
            address: "542 S Dearborn St, Chicago, IL 60605",
            beds: 2,
            baths: 2,
            sqft: 1200,
            type: "Appartment",
            status: "For Rent",
            agentName: "Vincent Fuller",
            image: "/images/property-1.png", // Reusing image for demo
        },
        {
            id: 3,
            title: "Renovated Studio",
            price: "₦2,800",
            address: "58 Howard St, New York, NY 10013",
            beds: 1,
            baths: 1,
            sqft: 600,
            type: "Studio",
            status: "For Rent",
            agentName: "Brittany Watkin",
            image: "/images/property-1.png",
        },
    ];

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Discover Our Featured Listings</h2>
                    <p className="text-gray-500">Lorem ipsum dolor sit amet, consectetur adipisicing elit</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {properties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>

                <div className="text-center mt-12">
                    <button className="px-8 py-3 bg-primary text-white font-bold rounded hover:bg-sky-500 transition-colors">
                        Load More
                    </button>
                </div>
            </div>
        </section>
    );
}
