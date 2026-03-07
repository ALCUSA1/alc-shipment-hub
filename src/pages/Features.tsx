import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { CTASection } from "@/components/marketing/CTASection";

const Features = () => (
  <MarketingLayout>
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Features</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Everything you need to ship globally.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Powerful features designed for modern exporters and importers.
        </p>
      </div>
    </section>
    <FeaturesSection />
    <CTASection />
  </MarketingLayout>
);

export default Features;
