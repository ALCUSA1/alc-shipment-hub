import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { BarChart3, Users, Building2 } from "lucide-react";

const levels = [
  {
    icon: BarChart3,
    title: "Per Shipment",
    metrics: [
      { label: "Sell Price", value: "$3,140", color: "text-foreground" },
      { label: "Total Cost", value: "$2,890", color: "text-foreground" },
      { label: "Net Profit", value: "$250", color: "text-emerald-600" },
      { label: "Margin", value: "7.9%", color: "text-emerald-600" },
    ],
  },
  {
    icon: Users,
    title: "Per Customer",
    metrics: [
      { label: "Revenue", value: "$284K", color: "text-foreground" },
      { label: "Total Profit", value: "$31K", color: "text-emerald-600" },
      { label: "Avg Margin", value: "10.9%", color: "text-emerald-600" },
      { label: "Shipments", value: "87", color: "text-foreground" },
    ],
  },
  {
    icon: Building2,
    title: "Platform Level",
    metrics: [
      { label: "Revenue", value: "$2.1M", color: "text-foreground" },
      { label: "Net Profit", value: "$198K", color: "text-emerald-600" },
      { label: "Retained", value: "$142K", color: "text-emerald-600" },
      { label: "Network Paid", value: "$56K", color: "text-foreground" },
    ],
  },
];

export function ProfitVisibilitySection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Profit Visibility</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            See your profit across every shipment.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Track revenue, cost, and margin in real time — no more guessing.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {levels.map((level, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="bg-card rounded-2xl border p-6 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <level.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{level.title}</h3>
                </div>
                <div className="space-y-4">
                  {level.metrics.map((m, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{m.label}</span>
                      <span className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="grid sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">✓ Full financial transparency</p>
            <p className="text-sm text-muted-foreground">✓ No more guessing margins</p>
            <p className="text-sm text-muted-foreground">✓ Know where you make money</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
