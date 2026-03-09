import { cn } from "@/lib/utils";
import { Ship, Users, Route, Package, DollarSign, Truck, Shield, FileText } from "lucide-react";
import { motion } from "framer-motion";

const SECTIONS = [
  { id: "basics", label: "Shipment", icon: Ship },
  { id: "parties", label: "Parties", icon: Users },
  { id: "routing", label: "Routing", icon: Route },
  { id: "cargo", label: "Cargo", icon: Package },
  { id: "commercial", label: "Financials", icon: DollarSign },
  { id: "execution", label: "Operations", icon: Truck },
  { id: "compliance", label: "Compliance", icon: Shield },
];

interface SectionNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
  sectionFilled?: Record<string, boolean>;
}

export function SectionNav({ activeSection, onNavigate, sectionFilled = {} }: SectionNavProps) {
  return (
    <nav className="sticky top-6 w-44 shrink-0 hidden lg:block">
      <div className="space-y-0.5">
        {SECTIONS.map(({ id, label, icon: Icon }, idx) => {
          const isActive = activeSection === id;
          const filled = sectionFilled[id];
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-300 relative group",
                isActive
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="section-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActive ? "text-accent" : "text-muted-foreground/60")} />
              <span className="truncate">{label}</span>
              {filled && !isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
