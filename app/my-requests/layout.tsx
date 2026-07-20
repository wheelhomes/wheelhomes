import React from 'react';

export default function MyRequestsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">My Requests</h1>
                {children}
            </div>
        </div>
    );
}
