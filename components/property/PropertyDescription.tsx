interface PropertyDescriptionProps {
    description?: string;
}

export default function PropertyDescription({ description }: PropertyDescriptionProps) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Property Description</h3>
            <div className="text-gray-700 leading-relaxed space-y-4 text-sm">
                <p>
                    {description || "Architecturally designed executive residence situated in an exclusive and fully secured enclave. Built with premium reinforced engineering, modern aesthetics, and generous interior living spaces tailored for discerning families and diplomats."}
                </p>
                <p>
                    Benefiting from 24/7 dedicated security patrols, access-controlled entrance gates, uninterrupted power support, and close proximity to premier international schools, shopping malls, and prime business centers.
                </p>
            </div>
        </div>
    );
}
