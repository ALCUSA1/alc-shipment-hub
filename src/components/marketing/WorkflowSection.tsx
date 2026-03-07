import { ClipboardList, MessageSquare, CheckCircle, FileText, Truck } from "lucide-react";

const steps = [
  { icon: ClipboardList, step: "01", title: "Create shipment request", desc: "The shipper enters shipment data directly into the platform." },
  { icon: MessageSquare, step: "02", title: "Request freight quote", desc: "The system generates a quote request." },
  { icon: CheckCircle, step: "03", title: "Approve shipment", desc: "Once approved, the shipment becomes confirmed." },
  { icon: FileText, step: "04", title: "Automatic document generation", desc: "The system automatically generates Bill of Lading, invoice, packing list, and shipping instructions." },
  { icon: Truck, step: "05", title: "Shipment coordination", desc: "Trucking companies, warehouses, and shipping lines receive the information they need." },
];

export function WorkflowSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">How It Works</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 leading-tight">
          The Shipper Logistics Workspace in action.
        </h2>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-6 p-6 rounded-xl border bg-card hover:border-accent/30 transition-colors group">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-accent mb-1 block">Step {s.step}</span>
                <h3 className="text-lg font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
