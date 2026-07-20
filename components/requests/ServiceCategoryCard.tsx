import { LucideIcon } from "lucide-react";

interface ServiceCategoryCardProps {
    id: string;
    label: string;
    icon: LucideIcon;
    description: string;
    color: string;
    bg: string;
    onClick?: () => void;
}

export function ServiceCategoryCard({ id, label, icon: Icon, description, color, bg, onClick }: ServiceCategoryCardProps) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-100 transition-all cursor-pointer text-left w-full"
        >
            <div className={`p-4 rounded-xl w-fit mb-4 ${bg} ${color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-1">
                {label}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
                {description}
            </p>
        </button>
    );
}
