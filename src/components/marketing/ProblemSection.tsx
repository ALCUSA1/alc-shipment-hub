import { Mail, FileSpreadsheet, Clock, Search, AlertTriangle, Layers } from "lucide-react";

const problems = [
  { icon: Mail, text: "Exporters and importers manage shipments through long email threads, spreadsheets, and scattered documents." },
  { icon: FileSpreadsheet, text: "Shipment instructions are repeated multiple times across different channels." },
  { icon: Search, text: "Important documents get buried in inboxes and shared drives." },
  { icon: Clock, text: "Freight quote requests require extensive back and forth communication." },
  { icon: AlertTriangle, text: "Shipment updates arrive inconsistently from different systems." },
  { icon: Layers, text: "Teams lack a centralized workspace to coordinate logistics operations." },
];

export function ProblemSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">The Problem</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          Shipping coordination is still stuck in email.
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mb-16">
          This creates unnecessary complexity for businesses that depend on global shipping.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div key={i} className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300">
              <p.icon className="h-8 w-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
