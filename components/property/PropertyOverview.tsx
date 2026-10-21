interface OverviewItemProps {
    label: string;
    value: string;
}

function OverviewItem({ label, value }: OverviewItemProps) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 text-sm">
            <span className="font-bold text-gray-700">{label}</span>
            <span className="text-gray-900 font-medium">{value}</span>
        </div>
    );
}

interface PropertyOverviewProps {
    property?: {
        id?: string;
        price?: string;
        sqft?: number;
        beds?: number;
        baths?: number;
        type?: string;
        status?: string;
        yearBuilt?: string;
    };
}

export default function PropertyOverview({ property }: PropertyOverviewProps) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Overview</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <div>
                    <OverviewItem label="Property ID" value={property?.id ? `#${property.id.slice(0, 8).toUpperCase()}` : "#WH-702"} />
                    <OverviewItem label="Price" value={property?.price || "Contact for Price"} />
                    <OverviewItem label="Property Size" value={`${property?.sqft || 3500} Sq Ft`} />
                    <OverviewItem label="Market Status" value={property?.status || "For Sale"} />
                </div>
                <div>
                    <OverviewItem label="Bedrooms" value={`${property?.beds || 4} En-suite`} />
                    <OverviewItem label="Bathrooms" value={`${property?.baths || 5} Modern`} />
                    <OverviewItem label="Parking" value="4+ Vehicles" />
                    <OverviewItem label="Property Type" value={property?.type || "Detached Duplex"} />
                </div>
            </div>
        </div>
    );
}
