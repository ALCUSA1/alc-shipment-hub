import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export function CTASection() {
  return (
    <section className="section-padding bg-navy text-primary-foreground text-center">
      <div className="container-narrow">
        <ScrollReveal>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            A single workspace for global shipment coordination.
          </h2>
          <p className="text-lg text-primary-foreground/60 max-w-xl mx-auto mb-10">
            Coordinate freight, trucking, warehouses, and shipment tracking from one modern logistics workspace.
          </p>
          <Button variant="electric" size="lg" className="text-base px-8 h-12" asChild>
            <Link to="/signup">
              Start Shipping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
