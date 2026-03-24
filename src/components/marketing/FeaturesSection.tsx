import { LayoutDashboard, Calculator, Users } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const pillars = [
  {
    icon: LayoutDashboard,
    title: "Shipment Workspace",
    desc: "Manage every shipment from request to close in one unified workspace — overview, documents, tracking, messages, and activity log.",
  },
  {
    icon: Calculator,
    title: "Pricing & Profit Engine",
    desc: "Automated cost build-up from carrier rates, margin rule application, sell price generation, and real-time profit calculations.",
  },
  {
    icon: Users,
    title: "Network & Collaboration",
    desc: "Assign and coordinate with truckers, warehouses, customs brokers, and freight forwarders inside the shipment lifecycle.",
  },
];

export function FeaturesSection() {
  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Core Pillars</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
            Three pillars powering every shipment.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.1}>
          {pillars.map((f, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="bg-card rounded-2xl p-8 border hover:shadow-lg transition-all duration-300 group text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <f.icon className="h-6 w-6 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
