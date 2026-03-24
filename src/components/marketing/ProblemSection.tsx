import { Calculator, FileSpreadsheet, EyeOff, TrendingDown, Mail, Layers } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const problems = [
  { icon: Calculator, text: "Pricing is manual and inconsistent — every quote starts from scratch." },
  { icon: FileSpreadsheet, text: "Costs are spread across spreadsheets, emails, and disconnected systems." },
  { icon: EyeOff, text: "Margins are unclear — teams don't know true profitability until it's too late." },
  { icon: TrendingDown, text: "Profit leakage happens silently through hidden fees and missed surcharges." },
  { icon: Mail, text: "Too much back-and-forth between shippers, carriers, and partners." },
  { icon: Layers, text: "No single system connects pricing, operations, and financial visibility." },
];

export function ProblemSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Most logistics teams don't know their true cost before quoting.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-16">
            Without real-time cost visibility, every shipment is a margin gamble.
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
