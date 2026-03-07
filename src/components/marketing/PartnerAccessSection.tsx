import { Ship, Truck, Warehouse, Package, Users, Shield } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const participants = [
  { icon: Package, title: "Shipper", desc: "Creates shipments and manages the full logistics lifecycle." },
  { icon: Users, title: "Freight Forwarder", desc: "Provides freight quotes and coordinates ocean/air bookings." },
  { icon: Truck, title: "Trucking Company", desc: "Receives pickup and delivery instructions with cargo details." },
  { icon: Warehouse, title: "Warehouse", desc: "Receives cargo handling instructions, storage, and release orders." },
  { icon: Ship, title: "Shipping Line", desc: "Receives booking details and vessel assignment information." },
  { icon: Shield, title: "Customs Broker", desc: "Accesses shipment documentation for customs clearance." },
];

export function PartnerAccessSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Partner Access</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Every logistics party, one workspace.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Each participant receives only the relevant shipment information they need to perform their role.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {participants.map((p, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="relative bg-card rounded-2xl p-8 border hover:border-accent/30 transition-all duration-300 group text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 mx-auto group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <p.icon className="h-6 w-6 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
