import { Search, Ship, MapPin, CreditCard } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const steps = [
  { icon: Search, step: "01", title: "Discover Rates", desc: "Search and compare instant pricing from multiple carriers across ocean and air freight." },
  { icon: Ship, step: "02", title: "Book & Ship", desc: "Confirm your booking with guaranteed reliability. Coordinate trucking pickup and warehouse handling in one flow." },
  { icon: MapPin, step: "03", title: "Track & Manage", desc: "Real-time shipment tracking with automated document generation — BL, commercial invoice, packing list, and customs filings." },
  { icon: CreditCard, step: "04", title: "Pay & Complete", desc: "Flexible payment options with full cost transparency. View P&L breakdowns and settle invoices digitally." },
];

export function WorkflowSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
            Four steps from quote to delivery.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 gap-6" staggerDelay={0.1}>
          {steps.map((s, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="flex items-start gap-5 p-6 rounded-xl border bg-card hover:border-accent/30 transition-colors group">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-accent mb-1 block">Step {s.step}</span>
                <h3 className="text-lg font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
