import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { Search, Users, Ship } from "lucide-react";

const items = [
  { icon: Search, title: "Request Rates", desc: "Get competitive carrier rates from your network partners directly inside the platform." },
  { icon: Users, title: "Find Partners", desc: "Discover truckers, warehouses, and brokers matched to your trade lanes and requirements." },
  { icon: Ship, title: "Collaborate on Shipments", desc: "Assign partners, share documents, and coordinate execution without leaving the workspace." },
];

export function NetworkSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Network</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Activate your network when you need it.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Connect with the right partners at the right time — no social noise.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.1}>
          {items.map((item, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="p-6 rounded-xl border bg-card hover:border-accent/30 hover:shadow-md transition-all duration-300 group text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <item.icon className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
