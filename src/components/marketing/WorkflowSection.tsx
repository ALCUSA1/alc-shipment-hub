import { FileText, Calculator, CheckCircle, MapPin, BarChart3 } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const steps = [
  { icon: FileText, step: "01", title: "Create Shipment Request", desc: "Enter cargo, route, and service requirements in a guided wizard." },
  { icon: Calculator, step: "02", title: "Generate Intelligent Pricing", desc: "Auto-calculate cost build-up, apply margin rules, and produce a profitable sell price." },
  { icon: CheckCircle, step: "03", title: "Approve & Book Shipment", desc: "Review pricing, approve quotes with margin safeguards, and confirm booking." },
  { icon: MapPin, step: "04", title: "Track Execution in Real Time", desc: "Monitor milestones, documents, partner activity, and delivery status." },
  { icon: BarChart3, step: "05", title: "Monitor Profit & Close", desc: "Review final P&L, confirm invoices, and close the shipment with full audit trail." },
];

export function WorkflowSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
            From request to delivery — fully controlled.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="space-y-4 max-w-3xl mx-auto" staggerDelay={0.1}>
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
