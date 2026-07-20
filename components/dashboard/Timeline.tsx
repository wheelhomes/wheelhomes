import React from "react";
import { Check, Circle } from "lucide-react";

interface TimelineStep {
    label: string;
    date?: string;
    description?: string;
    completed: boolean;
    current: boolean;
}

interface TimelineProps {
    steps: TimelineStep[];
}

export const Timeline: React.FC<TimelineProps> = ({ steps }) => {
    return (
        <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-200" />
            <ul className="space-y-8 relative">
                {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    // Hide the connector for the last one if we want, but the absolute div handles the line.
                    // Actually, to be cleaner, we can stop the line at the last circle, but a full line is common too.
                    // Let's keep it simple.

                    return (
                        <li key={step.label} className="flex gap-4">
                            <div
                                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors flex-shrink-0 bg-white
                                ${step.completed
                                        ? "border-orange-500 bg-orange-50 text-orange-600"
                                        : step.current
                                            ? "border-orange-500 text-orange-600 ring-4 ring-orange-100"
                                            : "border-gray-300 text-gray-300"
                                    }`}
                            >
                                {step.completed ? (
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                ) : (
                                    <div className={`w-2 h-2 rounded-full ${step.current ? "bg-orange-600" : "bg-gray-300"}`} />
                                )}
                            </div>

                            <div className="pt-0.5">
                                <h4
                                    className={`text-sm font-semibold ${step.completed || step.current ? "text-gray-900" : "text-gray-500"
                                        }`}
                                >
                                    {step.label}
                                </h4>
                                {step.date && <p className="text-xs text-gray-500 mt-0.5">{step.date}</p>}
                                {step.description && <p className="text-sm text-gray-600 mt-1">{step.description}</p>}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
