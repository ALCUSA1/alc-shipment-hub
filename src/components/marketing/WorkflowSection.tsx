import { ClipboardList, MessageSquare, CheckCircle, Truck, Warehouse, Ship, MapPin } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const steps = [
  { icon: ClipboardList, step: "01", title: "Create shipment request", desc: "The shipper enters shipment data including origin, destination, cargo details, pickup location, and delivery location." },
  { icon: MessageSquare, step: "02", title: "Request freight quote", desc: "Freight forwarders provide pricing for the shipment." },
  { icon: CheckCircle, step: "03", title: "Confirm shipment", desc: "Once approved, the shipment becomes active in the workspace." },
  { icon: Truck, step: "04", title: "Coordinate trucking pickup", desc: "The trucking company receives pickup instructions including location, container type, cargo details, and pickup time." },
  { icon: Warehouse, step: "05", title: "Warehouse handling", desc: "Warehouse operators receive cargo arrival instructions and storage details." },
  { icon: Ship, step: "06", title: "Shipment departure and tracking", desc: "The shipment is loaded and tracking milestones begin." },
  { icon: MapPin, step: "07", title: "Delivery coordination", desc: "Final delivery is scheduled through trucking partners." },
];

export function WorkflowSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
            The Shipment Coordination Workspace in action.
          </h2>
        </ScrollReveal>

        <StaggerContainer className="space-y-6" staggerDelay={0.1}>
          {steps.map((s, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="flex items-start gap-6 p-6 rounded-xl border bg-card hover:border-accent/30 transition-colors group">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-accent mb-1 block">Step {s.step}</span>
                <h3 className="text-lg font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
