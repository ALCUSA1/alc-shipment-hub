import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { PartnerAccessSection } from "@/components/marketing/PartnerAccessSection";
import { CTASection } from "@/components/marketing/CTASection";
import { SEO } from "@/components/SEO";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const Features = () => (
  <MarketingLayout>
    <SEO
      title="Features — Freight, Trucking & Warehouse Tools"
      description="Freight coordination, trucking dispatch, warehouse handling, and live shipment tracking — all in one platform."
      canonical="https://alcshipper.com/features"
    />
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Features</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Everything you need to coordinate shipments.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Freight coordination, trucking, warehouse handling, and shipment tracking in one platform.
        </p>
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
    <PartnerAccessSection />
    <CTASection />
  </MarketingLayout>
);

export default Features;
