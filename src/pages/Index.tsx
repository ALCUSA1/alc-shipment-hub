import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { CategorySection } from "@/components/marketing/CategorySection";
import { BeforeAfterSection } from "@/components/marketing/BeforeAfterSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { CTASection } from "@/components/marketing/CTASection";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <MarketingLayout>
      <SEO
        title="ALC Shipper Portal — Freight, Trucking & Warehouse Coordination"
        description="Coordinate freight, trucking, warehouses, documents, and shipment tracking across all logistics parties in one modern workspace."
        canonical="https://alcshipper.com/"
      />
      <HeroSection />
      <ProblemSection />
      <CategorySection />
      <BeforeAfterSection />
      <WorkflowSection />
      <FeaturesSection />
      <PartnerAccessSection />
      <CTASection />
    </MarketingLayout>
  );
};

export default Index;
