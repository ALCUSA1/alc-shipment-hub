import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { Workflow, Calculator, BarChart3, Users } from "lucide-react";

const pillars = [
  { icon: Workflow, title: "Unified Shipment Workflow", desc: "From request to delivery — one controlled lifecycle with no data duplication." },
  { icon: Calculator, title: "Built-in Pricing Engine", desc: "Automatically build cost, apply margin rules, and generate profitable sell prices." },
  { icon: BarChart3, title: "Real-time Profit Visibility", desc: "Track net profit, platform share, and margin health across every shipment." },
  { icon: Users, title: "Integrated Partner Coordination", desc: "Assign truckers, warehouses, and brokers inside the shipment workspace." },
];

export function SolutionSection() {
  return (
    <section className="section-padding bg-navy text-primary-foreground">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">The Solution</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            A smarter way to run shipments.
          </h2>
          <p className="text-lg text-primary-foreground/60 max-w-2xl mx-auto mb-16">
            One platform that connects pricing intelligence with operational execution.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 gap-6" staggerDelay={0.1}>
          {pillars.map((p, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="p-6 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                <p.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
