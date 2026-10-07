"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import {
    Building2,
    Search,
    Home,
    MapPin,
    Bed,
    Bath,
    Maximize2,
    Star,
    Trash2,
    Eye,
    X,
    CheckCircle,
    Clock,
    AlertCircle,
    User,
    DollarSign,
    ExternalLink
} from "lucide-react";

interface Property {
    id: string;
    title: string;
    price: string | number;
    address: string;
    beds: number;
    baths: number;
    sqft: number;
    type: string;
    status: string;
    image?: string;
    images?: string[];
    agentName?: string;
    agentImage?: string;
    agentId?: string;
    featured?: boolean;
    createdAt?: any;
}

export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterType, setFilterType] = useState("all");

    // Modal State
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const q = query(collection(db, "properties"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Property[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "Untitled Property",
                    price: data.price || "0",
                    address: data.address || "Address not provided",
                    beds: Number(data.beds || 0),
                    baths: Number(data.baths || 0),
                    sqft: Number(data.sqft || 0),
                    type: data.type || "Apartment",
                    status: (data.status || "available").toLowerCase(),
                    image: data.image || (data.images && data.images[0]) || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
                    images: data.images || (data.image ? [data.image] : []),
                    agentName: data.agentName || "Wheelhomes Agent",
                    agentImage: data.agentImage,
                    agentId: data.agentId || data.userId,
                    featured: Boolean(data.featured),
                    createdAt: data.createdAt
                };
            });

            // Sort newest first
            list.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            setProperties(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching properties:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Toggle Featured status
    const handleToggleFeatured = async (property: Property) => {
        try {
            await updateDoc(doc(db, "properties", property.id), {
                featured: !property.featured
            });
        } catch (err) {
            console.error("Error toggling featured property:", err);
            alert("Failed to update featured status.");
        }
    };

    // Update Property Status
    const handleStatusChange = async (propertyId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: newStatus
            });
        } catch (err) {
            console.error("Error updating property status:", err);
            alert("Failed to update status.");
        }
    };

    // Confirm Delete Property
    const handleDeleteProperty = async () => {
        if (!propertyToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "properties", propertyToDelete.id));
            setPropertyToDelete(null);
        } catch (err) {
            console.error("Error deleting property:", err);
            alert("Failed to delete property listing.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Metrics
    const totalCount = properties.length;
    const availableCount = properties.filter(p => p.status === 'available' || p.status === 'for rent' || p.status === 'for sale').length;
    const pendingCount = properties.filter(p => p.status === 'pending').length;
    const soldOrRentedCount = properties.filter(p => p.status === 'sold' || p.status === 'rented').length;

    // Filters
    const filteredProperties = properties.filter(p => {
        const matchesSearch =
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.agentName && p.agentName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus =
            filterStatus === "all" ||
            (filterStatus === "available" && (p.status === "available" || p.status === "for rent" || p.status === "for sale")) ||
            p.status === filterStatus;

        const matchesType =
            filterType === "all" ||
            p.type.toLowerCase().includes(filterType.toLowerCase());

        return matchesSearch && matchesStatus && matchesType;
    });

    const formatPrice = (val: string | number) => {
        if (typeof val === 'number') return `₦${val.toLocaleString()}`;
        if (typeof val === 'string') {
            if (val.startsWith('₦') || val.startsWith('$')) return val;
            const num = Number(val.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(num) && num > 0) return `₦${num.toLocaleString()}`;
            return val;
        }
        return '₦0';
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'available' || s === 'for rent' || s === 'for sale') {
            return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Available</span>;
        }
        if (s === 'pending') {
            return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Under Review</span>;
        }
        if (s === 'sold') {
            return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 w-fit">Sold</span>;
        }
        if (s === 'rented') {
            return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 w-fit">Rented</span>;
        }
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize w-fit">{status}</span>;
    };

    return (
        <div className="p-8 font-sans max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-orange-600" />
                        Property Moderation
                    </h1>
                    <p className="text-gray-500 mt-1">Review, approve, and manage verified real estate listings from mobile agents and partners.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Listings</p>
                        <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalCount}</h3>
                    </div>
                    <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Home className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Available</p>
                        <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{availableCount}</h3>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Under Review</p>
                        <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sold / Rented</p>
                        <h3 className="text-2xl font-extrabold text-blue-600 mt-1">{soldOrRentedCount}</h3>
                    </div>
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Star className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                        {(["all", "available", "pending", "sold", "rented"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === status
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900"
                                    }`}
                            >
                                {status === "all" ? "All Status" : status}
                            </button>
                        ))}
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">All Types</option>
                        <option value="duplex">Duplex</option>
                        <option value="apartment">Apartment</option>
                        <option value="terrace">Terrace</option>
                        <option value="penthouse">Penthouse</option>
                        <option value="commercial">Commercial</option>
                        <option value="land">Land</option>
                    </select>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by title, location, agent..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Properties Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/70 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type & Specs</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agent / Poster</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Featured</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                                            <span>Loading real estate listings...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProperties.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-400">
                                        No properties found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredProperties.map((prop) => (
                                    <tr key={prop.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={prop.image}
                                                    alt={prop.title}
                                                    className="w-16 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                                                />
                                                <div className="max-w-xs">
                                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{prop.title}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                                                        <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                                                        {prop.address}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 font-mono">ID: {prop.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 mb-1">
                                                {prop.type}
                                            </span>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {prop.beds} Beds</span>
                                                <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {prop.baths} Baths</span>
                                                {prop.sqft > 0 && (
                                                    <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> {prop.sqft} sqft</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-extrabold text-gray-900 text-sm">
                                                {formatPrice(prop.price)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                                                    {prop.agentName?.charAt(0) || "A"}
                                                </div>
                                                <div className="text-xs">
                                                    <p className="font-semibold text-gray-900">{prop.agentName}</p>
                                                    <p className="text-gray-400 text-[10px]">Verified Partner</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={prop.status}
                                                onChange={(e) => handleStatusChange(prop.id, e.target.value)}
                                                className="text-xs font-bold rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            >
                                                <option value="available">Available</option>
                                                <option value="pending">Under Review</option>
                                                <option value="sold">Sold</option>
                                                <option value="rented">Rented</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleToggleFeatured(prop)}
                                                className={`p-2 rounded-xl transition-all ${prop.featured
                                                    ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                                    : "text-gray-300 hover:text-gray-400 hover:bg-gray-100"
                                                    }`}
                                                title={prop.featured ? "Featured on Homepage" : "Click to Feature"}
                                            >
                                                <Star className={`w-4 h-4 ${prop.featured ? "fill-amber-400" : ""}`} />
                                            </button>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProperty(prop);
                                                        setActiveImageIndex(0);
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                                    title="View Full Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setPropertyToDelete(prop)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    title="Delete Property"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Property Full Details Modal */}
            {selectedProperty && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedProperty.title}</h2>
                                    {getStatusBadge(selectedProperty.status)}
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    {selectedProperty.address}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProperty(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Photo Gallery */}
                            <div>
                                <div className="rounded-2xl overflow-hidden bg-gray-100 h-72 border border-gray-200">
                                    <img
                                        src={selectedProperty.images && selectedProperty.images[activeImageIndex] ? selectedProperty.images[activeImageIndex] : selectedProperty.image}
                                        alt={selectedProperty.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {selectedProperty.images && selectedProperty.images.length > 1 && (
                                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                        {selectedProperty.images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImageIndex === idx ? "border-orange-500 ring-2 ring-orange-200" : "border-gray-200 opacity-60"
                                                    }`}
                                            >
                                                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Price</p>
                                    <p className="text-lg font-extrabold text-orange-600 mt-1">{formatPrice(selectedProperty.price)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Property Type</p>
                                    <p className="text-base font-bold text-gray-800 mt-1">{selectedProperty.type}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Bedrooms</p>
                                    <p className="text-base font-bold text-gray-800 mt-1">{selectedProperty.beds} Beds</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Bathrooms</p>
                                    <p className="text-base font-bold text-gray-800 mt-1">{selectedProperty.baths} Baths</p>
                                </div>
                            </div>

                            {/* Agent Info & Controls */}
                            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-orange-200">
                                        {selectedProperty.agentName?.charAt(0) || "A"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{selectedProperty.agentName}</p>
                                        <p className="text-xs text-gray-500">Agent / Poster ID: {selectedProperty.agentId || "Verified System Agent"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleFeatured(selectedProperty)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${selectedProperty.featured
                                            ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <Star className="w-3.5 h-3.5" />
                                        {selectedProperty.featured ? "Featured" : "Mark as Featured"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedProperty(null)}
                                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {propertyToDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Delist Property?</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Are you sure you want to permanently remove <span className="font-semibold text-gray-800">"{propertyToDelete.title}"</span>? This will delist the property across both web and mobile platforms.
                        </p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setPropertyToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProperty}
                                disabled={isDeleting}
                                className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Confirm Delist"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
