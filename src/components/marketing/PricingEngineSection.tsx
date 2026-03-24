import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { Ship, Layers, Calculator, DollarSign, TrendingUp, ShieldCheck, Eye, Zap } from "lucide-react";

const steps = [
  { icon: Ship, label: "Carrier Rate Feed", desc: "Ingest buy rates from carriers" },
  { icon: Layers, label: "Cost Build Up", desc: "Trucking, docs, customs, fees" },
  { icon: Calculator, label: "Margin Logic", desc: "Apply shipment-type rules" },
  { icon: DollarSign, label: "Sell Price", desc: "Auto-generated quote price" },
  { icon: TrendingUp, label: "Profit Displayed", desc: "Net margin & platform share" },
];

const points = [
  { icon: Eye, text: "No hidden costs" },
  { icon: ShieldCheck, text: "Real margin visibility" },
  { icon: Zap, text: "Automated pricing decisions" },
  { icon: TrendingUp, text: "Protect your profit on every shipment" },
];

export function PricingEngineSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Pricing & Profit Engine</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Know your profit before you quote.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Every carrier rate is transformed into a full cost breakdown and optimized sell price.
          </p>
        </ScrollReveal>

        {/* Step flow */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-stretch gap-3 mb-16">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <span className="text-xs font-semibold text-accent mb-1">Step {i + 1}</span>
                <h4 className="text-sm font-semibold text-foreground mb-1">{s.label}</h4>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 -right-2 w-4 text-border">→</div>
                )}
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Mock profit display */}
        <ScrollReveal>
          <div className="bg-card rounded-2xl border p-6 md:p-8 max-w-3xl mx-auto mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Carrier Buy Rate</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">$2,450</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">True Total Cost</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">$2,890</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Sell Price</p>
                <p className="text-2xl font-bold text-accent tabular-nums">$3,140</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Net Profit</p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">$250</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Bullet points */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto" staggerDelay={0.08}>
          {points.map((p, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="flex items-center gap-3 p-4 rounded-xl border bg-card">
              <p.icon className="h-5 w-5 text-accent shrink-0" />
              <span className="text-sm font-medium text-foreground">{p.text}</span>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
