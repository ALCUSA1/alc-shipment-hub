import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { LayoutDashboard, Calculator, FileText, MapPin, Users, MessageSquare, DollarSign, Activity } from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Overview", desc: "Shipment summary and smart alerts" },
  { icon: Calculator, label: "Pricing", desc: "Full cost build-up and margin logic" },
  { icon: FileText, label: "Documents", desc: "Auto-generated checklists and uploads" },
  { icon: MapPin, label: "Tracking", desc: "Real-time milestones and delivery status" },
  { icon: Users, label: "Partners", desc: "Assign truckers, warehouses, brokers" },
  { icon: MessageSquare, label: "Messages", desc: "Threaded shipment-scoped chat" },
  { icon: DollarSign, label: "Financials", desc: "P&L, invoices, and payment status" },
  { icon: Activity, label: "Activity Log", desc: "Full audit trail of every action" },
];

export function ShipmentWorkspaceSection() {
  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Shipment Workspace</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            One workspace for every shipment.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            No switching between systems. Everything happens inside one shipment workspace.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
          {tabs.map((t, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="bg-card rounded-xl p-5 border hover:border-accent/30 hover:shadow-md transition-all duration-300 group text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 mx-auto group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <t.icon className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">{t.label}</h4>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
