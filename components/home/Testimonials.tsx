export default function Testimonials() {
    const testimonials = [
        {
            id: 1,
            text: "Wheel of Comfort is the best real estate theme I've ever used. It's clean, modern and very easy to customize. Support is also great!",
            author: "Roy Bennett",
            role: "Marketing Manager",
        },
        {
            id: 2,
            text: "I was able to create a professional real estate website in just a few days. The features are amazing and the design is top notch.",
            author: "Kenneth Sandoval",
            role: "Realtor",
        },
        {
            id: 3,
            text: "Highly recommended for anyone looking to build a real estate marketplace. It has everything you need out of the box.",
            author: "Kathleen Farber",
            role: "Property Tech",
        },
    ];

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Testimonials</h2>
                <p className="text-gray-500 mb-12">What our clients say about us</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((item) => (
                        <div key={item.id} className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-gray-600 italic mb-6">"{item.text}"</p>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-200 rounded-full mb-2 flex items-center justify-center text-gray-500 font-bold">
                                    {item.author[0]}
                                </div>
                                <h4 className="font-bold text-gray-800">{item.author}</h4>
                                <span className="text-sm text-primary">{item.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
