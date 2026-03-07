import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { CategorySection } from "@/components/marketing/CategorySection";
import { BeforeAfterSection } from "@/components/marketing/BeforeAfterSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { CTASection } from "@/components/marketing/CTASection";

const Index = () => {
  return (
    <MarketingLayout>
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
