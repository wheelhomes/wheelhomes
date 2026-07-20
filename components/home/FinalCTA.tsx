import React from "react";
import Container from "@/components/ui/Container";
import Link from "next/link";
import Button from "@/components/ui/Button";

const FinalCTA = () => {
    return (
        <section className="py-24 bg-white relative">
            <Container>
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 md:p-16 text-center border border-primary/10">
                    <h2 className="text-4xl md:text-5xl font-bold text-accent mb-6 font-heading">
                        Ready to experience comfort <br /> the right way?
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Join thousands of property owners and professionals on the most trusted platform in the market.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/signup">
                            <Button size="xl" variant="primary">
                                Get Started Now
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="xl" variant="outline" className="bg-white hover:bg-gray-50">
                                Become a Service Provider
                            </Button>
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default FinalCTA;
