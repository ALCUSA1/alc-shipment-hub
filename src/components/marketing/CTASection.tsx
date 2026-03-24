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
            A single workspace for global shipment control.
          </h2>
          <p className="text-lg text-primary-foreground/60 max-w-xl mx-auto mb-10">
            From pricing to execution to profit — everything in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="electric" size="lg" className="text-base px-8 h-12" asChild>
              <Link to="/signup">
                Start a Shipment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/about">Book a Demo</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
