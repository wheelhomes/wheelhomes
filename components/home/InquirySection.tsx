export default function InquirySection() {
    return (
        <section className="py-20 bg-primary relative overflow-hidden">
            {/* Abstract shapes or pattern could go here */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="md:w-1/2 text-white">
                        <h2 className="text-3xl font-bold mb-4">Looking to Buy a new property or Sell an existing one?</h2>
                        <p className="text-white/80 text-lg leading-relaxed mb-6">
                            Wheel of Comfort offers a complete suite of real estate tools to help you find your dream home or get the best price for your property.
                        </p>
                        <div className="flex gap-4">
                            <button className="bg-white text-primary font-bold py-3 px-8 rounded shadow-lg hover:bg-gray-100 transition-colors">
                                Browse Properties
                            </button>
                        </div>
                    </div>

                    <div className="md:w-1/2 w-full max-w-md bg-white p-8 rounded-lg shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Request a Consultation</h3>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-primary" placeholder="Your Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-primary" placeholder="Your Email" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-primary h-24" placeholder="I'm interested in..."></textarea>
                            </div>
                            <button className="w-full bg-secondary text-white font-bold py-3 rounded hover:bg-opacity-90 transition-colors">
                                Send Request
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
