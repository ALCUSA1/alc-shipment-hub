import { Wheat, Pill, Cpu, Shirt, Car, ShoppingCart, FlaskConical, Mountain } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { useState } from "react";

const industries = [
  { icon: Wheat, title: "Agriculture", stat: "1.2M+ tons", desc: "Bulk grain, fresh produce, and perishable goods. We handle cold-chain compliance, phytosanitary certificates, and fumigation coordination across every major trade lane.", color: "142 71% 45%" },
  { icon: Pill, title: "Pharmaceuticals", stat: "GDP compliant", desc: "Temperature-controlled shipments with validated cold-chain, GDP documentation, and real-time monitoring. From API ingredients to finished doses.", color: "262 83% 58%" },
  { icon: Cpu, title: "Electronics", stat: "$500M+ moved", desc: "High-value cargo with secure handling, anti-static packaging coordination, and precision customs classification for chips, displays, and assemblies.", color: "217 95% 58%" },
  { icon: Shirt, title: "Textiles & Apparel", stat: "Fast-fashion ready", desc: "Speed-to-shelf supply chains with LCL consolidation, garment-on-hanger options, and quota management across seasonal buying cycles.", color: "340 75% 55%" },
  { icon: Car, title: "Automotive", stat: "JIT capable", desc: "OEM parts with just-in-time delivery windows, RoRo and container mix, and VIN-level tracking for aftermarket and production lines.", color: "25 95% 53%" },
  { icon: ShoppingCart, title: "FMCG", stat: "Retail-compliant", desc: "Consumer goods logistics with retailer compliance labeling, EDI integration, and appointment scheduling for major distribution centers.", color: "160 60% 45%" },
  { icon: FlaskConical, title: "Chemicals", stat: "DG certified", desc: "Hazmat-certified logistics with IMDG/IATA DG documentation, UN packaging verification, and segregation planning for mixed loads.", color: "45 93% 47%" },
  { icon: Mountain, title: "Mining & Minerals", stat: "OOG specialists", desc: "Heavy-lift and breakbulk with flat-rack booking, route surveys for oversized cargo, and specialized lashing and securing plans.", color: "200 18% 46%" },
];

function IndustryCard({ industry, isActive, onClick }: { industry: typeof industries[0]; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={`text-left w-full px-5 py-4 rounded-xl border transition-all duration-300 ${
        isActive
          ? "bg-card border-accent/40 shadow-lg shadow-accent/5"
          : "bg-transparent border-transparent hover:bg-card/50 hover:border-border"
      }`}
      layout
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{
            backgroundColor: isActive ? `hsl(${industry.color} / 0.15)` : `hsl(var(--muted))`,
          }}
        >
          <industry.icon
            className="h-5 w-5 transition-colors duration-300"
            style={{ color: isActive ? `hsl(${industry.color})` : `hsl(var(--muted-foreground))` }}
          />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
            {industry.title}
          </p>
          {isActive && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium"
              style={{ color: `hsl(${industry.color})` }}
            >
              {industry.stat}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function IndustriesSection() {
  const [active, setActive] = useState(0);
  const current = industries[active];

  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Industries Served</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Your cargo. Our expertise.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every industry has unique logistics challenges. ALC is built to handle all of them.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">
            {/* Left: industry selector */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {industries.map((ind, i) => (
                <IndustryCard
                  key={ind.title}
                  industry={ind}
                  isActive={i === active}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>

            {/* Right: detail panel */}
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-2xl border bg-card p-10 lg:p-12 flex flex-col justify-center min-h-[340px]"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `hsl(${current.color} / 0.12)` }}
              >
                <current.icon className="h-7 w-7" style={{ color: `hsl(${current.color})` }} />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">{current.title}</h3>

              <span
                className="text-sm font-semibold mb-4 inline-block"
                style={{ color: `hsl(${current.color})` }}
              >
                {current.stat}
              </span>

              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                {current.desc}
              </p>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
