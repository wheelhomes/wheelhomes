import { Check } from "lucide-react";

export default function PropertyFeatures() {
    const features = [
        "Air Conditioning", "Barbeque", "Dryer", "Gym", "Laundry", "Lawn", "Microwave", "Outdoor Shower",
        "Refrigerator", "Sauna", "Swimming Pool", "TV Cable", "Washer", "WiFi", "Window Coverings"
    ];

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Features & Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                            <Check className="w-3 h-3 text-primary" />
                        </div>
                        {feature}
                    </div>
                ))}
            </div>
        </div>
    );
}
