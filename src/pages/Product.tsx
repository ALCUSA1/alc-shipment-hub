import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { CTASection } from "@/components/marketing/CTASection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";

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
        <motion.div
          className="mt-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground mx-auto" />
        </motion.div>
      </div>
    </section>
    <FeaturesSection />
    <WorkflowSection />
    <PartnerAccessSection />
    <CTASection />
  </MarketingLayout>
);

export default Product;
