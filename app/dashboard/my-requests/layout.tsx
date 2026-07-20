import Sidebar from "@/components/dashboard/Sidebar";

export default function MyRequestsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar />
            <main className="flex-1 lg:ml-64 relative">
                {children}
            </main>
        </div>
    );
}
