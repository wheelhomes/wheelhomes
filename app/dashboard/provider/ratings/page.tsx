"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, Award, CheckCircle2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";

interface ReviewJob {
    id: string;
    clientName?: string;
    clientReview?: string;
    clientRating?: number;
    rating?: number;
    serviceType?: string;
    status?: string;
    isArchived?: boolean;
    actualEndTime?: string;
    createdAt?: any;
    budget?: number;
    price?: number;
}

export default function ProviderRatingsPage() {
    const [profile, setProfile] = useState<any>(null);
    const [reviews, setReviews] = useState<ReviewJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubReviews: (() => void) | null = null;
        let unsubUser: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                // Profile listener
                unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
                    if (snap.exists()) setProfile(snap.data());
                }, (err) => console.warn("Ratings profile listener notice:", err));

                // Jobs with reviews listener
                const q = query(
                    collection(db, "job_requests"),
                    where("providerId", "==", user.uid)
                );

                unsubReviews = onSnapshot(q, (snapshot) => {
                    const jobs: ReviewJob[] = snapshot.docs
                        .map(d => ({ id: d.id, ...d.data() } as ReviewJob))
                        .filter(j => j.clientReview && j.clientReview.trim().length > 0 && !((j as any).isArchived) && (j.status as string) !== 'archived');

                    // Sort newest first
                    jobs.sort((a, b) => {
                        const timeA = new Date(a.actualEndTime || a.createdAt || 0).getTime();
                        const timeB = new Date(b.actualEndTime || b.createdAt || 0).getTime();
                        return timeB - timeA;
                    });

                    setReviews(jobs);
                    setIsLoading(false);
                }, (err) => {
                    console.warn("Reviews query notice:", err);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        });

        return () => {
            if (unsubUser) unsubUser();
            if (unsubReviews) unsubReviews();
            unsubscribeAuth();
        };
    }, []);

    const totalReviews = reviews.length;
    const computedAverage = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + (r.clientRating ?? r.rating ?? 5), 0) / totalReviews
        : (profile?.rating || 5.0);

    // Calculate star breakdown percentages
    const starCounts = {
        5: reviews.filter(r => (r.clientRating ?? r.rating ?? 5) >= 4.75).length,
        4: reviews.filter(r => (r.clientRating ?? r.rating ?? 5) >= 3.75 && (r.clientRating ?? r.rating ?? 5) < 4.75).length,
        3: reviews.filter(r => (r.clientRating ?? r.rating ?? 5) >= 2.75 && (r.clientRating ?? r.rating ?? 5) < 3.75).length,
        2: reviews.filter(r => (r.clientRating ?? r.rating ?? 5) >= 1.75 && (r.clientRating ?? r.rating ?? 5) < 2.75).length,
        1: reviews.filter(r => (r.clientRating ?? r.rating ?? 5) < 1.75).length,
    };

    const getPct = (count: number) => totalReviews > 0 ? Math.round((count / totalReviews) * 100) : (count === 5 ? 100 : 0);

    const breakdown = [
        { stars: 5, pct: getPct(starCounts[5]) },
        { stars: 4, pct: getPct(starCounts[4]) },
        { stars: 3, pct: getPct(starCounts[3]) },
        { stars: 2, pct: getPct(starCounts[2]) },
        { stars: 1, pct: getPct(starCounts[1]) },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 font-sans">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h1>
                <p className="text-gray-500 text-sm mt-1">Feedback and verified ratings from completed client assignments.</p>
            </div>

            {/* Rating Summary Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-8">
                <div className="text-center sm:text-left">
                    <div className="text-5xl font-black text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                        <span>{computedAverage.toFixed(1)}</span>
                        <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        {totalReviews > 0 ? `From ${totalReviews} verified clients` : "Overall Client Satisfaction"}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-3">
                        <Award className="w-3.5 h-3.5" />
                        <span>Verified Specialist</span>
                    </div>
                </div>

                <div className="h-20 w-px bg-gray-100 hidden sm:block" />

                <div className="flex-1 space-y-2 w-full max-w-md">
                    {breakdown.map((row) => (
                        <div key={row.stars} className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="w-8 font-bold flex items-center gap-1">
                                {row.stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${row.pct}%` }}
                                />
                            </div>
                            <span className="w-10 text-right font-medium">{row.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Testimonials / Recent Feedback */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h3 className="text-lg font-bold text-gray-900">Verified Client Feedback</h3>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
                    </span>
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-gray-400 text-sm">Loading verified reviews...</div>
                ) : reviews.length === 0 ? (
                    <div className="py-12 text-center">
                        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-gray-700">No client reviews yet</p>
                        <p className="text-xs text-gray-400 mt-1">Complete your accepted jobs to earn verified ratings and testimonials.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reviews.map((rev) => {
                            const clientName = rev.clientName || "Verified Client";
                            const ratingVal = Math.round(rev.clientRating ?? rev.rating ?? 5);
                            const initial = clientName.charAt(0).toUpperCase();
                            const dateStr = rev.actualEndTime ? new Date(rev.actualEndTime).toLocaleDateString() : 'Recent';

                            return (
                                <div key={rev.id} className="py-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shadow-sm">
                                                {initial}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-900">{clientName}</span>
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                                                    <span>{rev.serviceType || "Service"}</span>
                                                    <span>•</span>
                                                    <span>{dateStr}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex text-amber-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-4 h-4 ${i < ratingVal ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed italic pl-12">
                                        &quot;{rev.clientReview}&quot;
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
