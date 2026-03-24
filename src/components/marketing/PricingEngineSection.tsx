import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Ship, Layers, Settings, Tag, TrendingUp, ShieldCheck, Zap, Calculator, Ban } from "lucide-react";

const steps = [
  { icon: Ship, label: "Carrier Rate Feed", desc: "Live carrier rates pulled into the system" },
  { icon: Layers, label: "Cost Build-Up", desc: "Trucking, customs, docs, and operational costs added automatically" },
  { icon: Settings, label: "Margin Logic Applied", desc: "Your margin rules applied based on shipment type, urgency, and market conditions" },
  { icon: Tag, label: "Sell Price Generated", desc: "Recommended sell price calculated instantly" },
  { icon: TrendingUp, label: "Profit Visible", desc: "See net profit and margin before sending quote" },
];

const points = [
  { icon: Ban, text: "Eliminate hidden cost errors" },
  { icon: ShieldCheck, text: "Protect your margin on every shipment" },
  { icon: Zap, text: "Price faster with confidence" },
  { icon: Calculator, text: "No spreadsheets or manual calculations" },
];

type ShipmentMode = "FCL" | "LCL" | "Air";

const pricingData: Record<ShipmentMode, { carrier: string; buyRate: number; thc: number; trucking: number; docs: number; fixed: number; margin: number }> = {
  FCL: { carrier: "Maersk", buyRate: 1200, thc: 150, trucking: 180, docs: 40, fixed: 35, margin: 12 },
  LCL: { carrier: "CMA CGM", buyRate: 680, thc: 95, trucking: 120, docs: 35, fixed: 28, margin: 17 },
  Air: { carrier: "Emirates SkyCargo", buyRate: 2400, thc: 0, trucking: 210, docs: 45, fixed: 40, margin: 14 },
};

function PricingMock({ mode }: { mode: ShipmentMode }) {
  const d = pricingData[mode];
  const totalCost = d.buyRate + d.thc + d.trucking + d.docs + d.fixed;
  const sellPrice = Math.round(totalCost / (1 - d.margin / 100));
  const netProfit = sellPrice - totalCost;

  const costLines = [
    { label: mode === "Air" ? "Air Freight" : "Ocean Freight", value: d.buyRate },
    ...(d.thc > 0 ? [{ label: "THC", value: d.thc }] : []),
    { label: "Trucking", value: d.trucking },
    { label: "Documentation", value: d.docs },
    { label: "Fixed Cost Allocation", value: d.fixed },
  ];

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl border shadow-lg overflow-hidden"
    >
      {/* Header bar */}
      <div className="px-5 py-3 bg-secondary/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold text-foreground tracking-wide">SHIPMENT PRICING</span>
        </div>
        <span className="text-xs text-muted-foreground">{mode} · Shanghai → Los Angeles</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Carrier Rate */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Carrier Rate</p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-semibold text-foreground">{d.carrier}</p>
              <p className="text-[10px] text-muted-foreground">Contract rate · Valid until Mar 31</p>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">${d.buyRate.toLocaleString()}</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Cost Breakdown</p>
          <div className="space-y-1.5">
            {costLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs text-muted-foreground">{line.label}</span>
                <span className="text-xs font-medium text-foreground tabular-nums">${line.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border-t mt-1">
              <span className="text-xs font-semibold text-foreground">Total Cost</span>
              <span className="text-sm font-bold text-foreground tabular-nums">${totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Pricing Output — highlighted */}
        <div className="rounded-xl border-2 border-accent/20 bg-accent/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-accent mb-3 font-semibold">Pricing Output</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5 uppercase">Sell Price</p>
              <p className="text-xl font-bold text-accent tabular-nums">${sellPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5 uppercase">Net Profit</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">${netProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5 uppercase">Net Margin</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">{d.margin}%</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PricingEngineSection() {
  const [mode, setMode] = useState<ShipmentMode>("FCL");

  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Pricing & Profit Intelligence</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Know your profit before you quote.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Every carrier rate is transformed into a full cost breakdown, sell price, and profit — automatically.
          </p>
        </ScrollReveal>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start mb-16">
          {/* LEFT: Step flow */}
          <ScrollReveal>
            <div className="space-y-6">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[22px] top-[52px] w-px h-[calc(100%-8px)] bg-border" />
                  )}
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 relative z-10">
                    <s.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Step {i + 1}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{s.label}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* RIGHT: Interactive UI mock */}
          <ScrollReveal delay={0.15}>
            <div>
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit mb-4">
                {(["FCL", "LCL", "Air"] as ShipmentMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      mode === m
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <PricingMock mode={mode} />
              </AnimatePresence>
            </div>
          </ScrollReveal>
        </div>

        {/* Value points */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto" staggerDelay={0.08}>
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
