interface OverviewItemProps {
    label: string;
    value: string;
}

function OverviewItem({ label, value }: OverviewItemProps) {
    return (
        <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <span className="font-bold text-gray-700">{label}</span>
            <span className="text-gray-600">{value}</span>
        </div>
    );
}

export default function PropertyOverview() {
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Overview</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <div>
                    <OverviewItem label="Property ID" value="HZ-01" />
                    <OverviewItem label="Price" value="₦1,500/mo" />
                    <OverviewItem label="Property Size" value="1200 Sq Ft" />
                    <OverviewItem label="Year Built" value="2021" />
                </div>
                <div>
                    <OverviewItem label="Bedrooms" value="2" />
                    <OverviewItem label="Bathrooms" value="2" />
                    <OverviewItem label="Garage" value="1" />
                    <OverviewItem label="Property Type" value="Apartment" />
                </div>
            </div>
        </div>
    );
}
