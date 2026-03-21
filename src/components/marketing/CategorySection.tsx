import { Compass, Ship, Plane, Container, Truck, Warehouse, FileCheck } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const modes = [
  { key: "fcl", label: "FCL", icon: Ship, desc: "Full container load ocean freight with guaranteed space on major carriers." },
  { key: "lcl", label: "LCL", icon: Container, desc: "Less-than-container load consolidation for smaller shipments across global routes." },
  { key: "air", label: "Air Freight", icon: Plane, desc: "Express and standard air cargo with real-time airline rate comparison." },
  { key: "trucking", label: "Trucking", icon: Truck, desc: "Drayage, FTL, and LTL trucking coordinated with port pickups and final delivery." },
  { key: "warehouse", label: "Warehousing", icon: Warehouse, desc: "Inbound receiving, inventory management, and outbound releases at partner facilities." },
  { key: "customs", label: "Customs", icon: FileCheck, desc: "AES filings, HTS classification, and customs brokerage integrated into every shipment." },
];

export function CategorySection() {
  const [active, setActive] = useState("fcl");
  const activeMode = modes.find((m) => m.key === active)!;

  return (
    <section className="section-padding bg-navy text-primary-foreground">
      <div className="container-narrow text-center">
        <ScrollReveal>
          <Compass className="h-10 w-10 text-electric mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Every logistics service, one platform.
          </h2>
          <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether you ship by ocean, air, or land — manage it all from your workspace.
          </p>
        </ScrollReveal>

        {/* Service mode tabs */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active === m.key
                    ? "bg-electric text-accent-foreground shadow-md"
                    : "bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/15 hover:text-primary-foreground/80"
                }`}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto p-6 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5"
          >
            <activeMode.icon className="h-8 w-8 text-electric mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">{activeMode.label}</h3>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">{activeMode.desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
