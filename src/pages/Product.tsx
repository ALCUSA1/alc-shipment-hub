import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { CTASection } from "@/components/marketing/CTASection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

const Product = () => (
  <MarketingLayout>
    <SEO
      title="Product — Shipment Coordination Workspace"
      description="One platform to coordinate freight, trucking, warehouses, documents, and shipment tracking across all logistics parties."
      canonical="https://alcshipper.com/product"
    />
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Product</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          The shipment coordination workspace.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          One platform to coordinate freight, trucking, warehouses, documents, and shipment tracking across all logistics parties.
        </p>
        <Button variant="electric" size="lg" className="text-base px-8 h-12" asChild>
          <Link to="/signup">Start Shipping <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
    <FeaturesSection />
    <WorkflowSection />
    <PartnerAccessSection />
    <CTASection />
  </MarketingLayout>
);

export default Product;
