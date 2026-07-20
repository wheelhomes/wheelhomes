"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
    size?: "sm" | "md" | "lg" | "xl";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    className = "",
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    ...props
}) => {
    const baseStyles =
        "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg";

    const variants = {
        primary:
            "bg-primary text-white hover:bg-primary/90 hover:shadow-lg focus:ring-primary shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
        secondary:
            "bg-secondary text-white hover:bg-secondary/90 hover:shadow-lg focus:ring-secondary shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
        outline:
            "bg-transparent border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary",
        ghost:
            "bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200",
        link: "bg-transparent text-primary hover:underline p-0 h-auto shadow-none transform-none",
    };

    const sizes = {
        sm: "text-sm px-3 py-1.5 gap-1.5",
        md: "text-base px-5 py-2.5 gap-2",
        lg: "text-lg px-6 py-3 gap-2.5",
        xl: "text-xl px-8 py-4 gap-3 font-semibold",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyles} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </button>
    );
};

export default Button;
