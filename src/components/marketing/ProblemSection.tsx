import { Mail, FileSpreadsheet, Clock, Search, AlertTriangle, Layers } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const problems = [
  { icon: Mail, text: "Shippers coordinate freight, trucking, and warehouses through scattered email threads." },
  { icon: FileSpreadsheet, text: "Trucking companies receive pickup instructions by phone with incomplete details." },
  { icon: Search, text: "Warehouse teams lack structured cargo arrival and release instructions." },
  { icon: Clock, text: "Freight quote requests require extensive back and forth communication." },
  { icon: AlertTriangle, text: "Shipment updates arrive inconsistently from different logistics parties." },
  { icon: Layers, text: "No centralized workspace exists to coordinate all logistics operations." },
];

export function ProblemSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Shipment coordination is fragmented.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-16">
            Logistics parties operate in silos, creating delays and miscommunication across the supply chain.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {problems.map((p, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300">
              <p.icon className="h-8 w-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
