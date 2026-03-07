import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { CTASection } from "@/components/marketing/CTASection";

const Features = () => (
  <MarketingLayout>
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Features</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Everything you need to coordinate shipments.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Freight coordination, trucking, warehouse handling, and shipment tracking in one platform.
        </p>
      </div>
    </section>
    <FeaturesSection />
    <PartnerAccessSection />
    <CTASection />
  </MarketingLayout>
);

export default Features;
