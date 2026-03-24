import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { HeroSection } from "@/components/marketing/HeroSection";
import { PricingEngineSection } from "@/components/marketing/PricingEngineSection";
import { TrustedBySection } from "@/components/marketing/TrustedBySection";
import { PlatformStatsSection } from "@/components/marketing/PlatformStatsSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { SolutionSection } from "@/components/marketing/SolutionSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { ShipmentWorkspaceSection } from "@/components/marketing/ShipmentWorkspaceSection";
import { ProfitVisibilitySection } from "@/components/marketing/ProfitVisibilitySection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { NetworkSection } from "@/components/marketing/NetworkSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { CTASection } from "@/components/marketing/CTASection";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <MarketingLayout>
      <SEO
        title="ALC Shipper Portal — Price, Manage & Profit from Every Shipment"
        description="Turn carrier rates into profitable quotes, coordinate execution, and track margins — all in one logistics operating system."
        canonical="https://alcshipper.com/"
      />
      <HeroSection />
      <PricingEngineSection />
      <TrustedBySection />
      <ProblemSection />
      <SolutionSection />
      <WorkflowSection />
      <ShipmentWorkspaceSection />
      <ProfitVisibilitySection />
      <PlatformStatsSection />
      <FeaturesSection />
      <NetworkSection />
      <SecuritySection />
      <CTASection />
    </MarketingLayout>
  );
};

export default Index;
