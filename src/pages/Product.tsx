import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { CTASection } from "@/components/marketing/CTASection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Product = () => (
  <MarketingLayout>
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Product</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          The logistics workspace built for shippers.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          One platform to create shipments, generate documents, manage freight quotes, and track cargo across the globe.
        </p>
        <Button variant="electric" size="lg" className="text-base px-8 h-12" asChild>
          <Link to="/signup">Start Shipping <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
    <FeaturesSection />
    <WorkflowSection />
    <CTASection />
  </MarketingLayout>
);

export default Product;
