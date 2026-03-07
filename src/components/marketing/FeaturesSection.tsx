import { Database, LayoutDashboard, FileText, DollarSign, MapPin, Users } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const features = [
  { icon: Database, title: "Data First Shipping Workflow", desc: "Enter shipment data once and the platform generates all required logistics documents automatically." },
  { icon: LayoutDashboard, title: "Shipment Workspace", desc: "Each shipment becomes a centralized workspace where parties coordinate logistics operations." },
  { icon: FileText, title: "Automatic Document Generation", desc: "Bill of Lading, Commercial Invoice, Packing List, and Shipping Instructions — generated automatically." },
  { icon: DollarSign, title: "Integrated Freight Quotes", desc: "Request and review freight quotes inside the platform." },
  { icon: MapPin, title: "Shipment Milestone Tracking", desc: "Track shipments through milestones from booking confirmed to delivery completed." },
  { icon: Users, title: "Multi Party Collaboration", desc: "Shippers, freight forwarders, trucking companies, warehouses, and customs brokers access relevant shipment data." },
];

export function FeaturesSection() {
  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Core Features</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
            Built for modern shipping operations.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {features.map((f, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="bg-card rounded-2xl p-8 border hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <f.icon className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
