import React, { useState } from 'react';
import { Star } from 'lucide-react';

export const ReviewForm: React.FC = () => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Service Provider</h3>

            <div className="flex flex-col items-center mb-6">
                <div className="flex space-x-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="focus:outline-none transition-transform hover:scale-110 duration-200"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(rating)}
                        >
                            <Star
                                className={`w-8 h-8 ${star <= (hover || rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500">
                    {rating === 0 ? 'Select a rating' : `You rated ${rating} out of 5 stars`}
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                        Write a review (optional)
                    </label>
                    <textarea
                        id="comment"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        placeholder="Tell us about your experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                <button
                    disabled={rating === 0}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors ${rating === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                        }`}
                >
                    Submit Review
                </button>
            </div>
        </div>
    );
};
