import Hero from "@/components/home/Hero";
import TrustIndicators from "@/components/home/TrustIndicators";
import ServicesOverview from "@/components/home/ServicesOverview";
import HowItWorksPreview from "@/components/home/HowItWorksPreview";
import SafetySection from "@/components/home/SafetySection";
import FinalCTA from "@/components/home/FinalCTA";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <TrustIndicators />
      <ServicesOverview />
      <HowItWorksPreview />
      <SafetySection />
      <FinalCTA />
    </main>
  );
}
