import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { CTASection } from "@/components/marketing/CTASection";

const HowItWorks = () => (
  <MarketingLayout>
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">How It Works</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Five steps to streamlined shipping.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          From shipment creation to delivery, every step is managed in one workspace.
        </p>
      </div>
    </section>
    <WorkflowSection />
    <CTASection />
  </MarketingLayout>
);

export default HowItWorks;
