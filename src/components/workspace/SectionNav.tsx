import { cn } from "@/lib/utils";
import { Ship, Users, Route, Package, DollarSign, Truck, Shield } from "lucide-react";

const SECTIONS = [
  { id: "basics", label: "Basics", icon: Ship },
  { id: "parties", label: "Parties", icon: Users },
  { id: "routing", label: "Routing", icon: Route },
  { id: "cargo", label: "Cargo", icon: Package },
  { id: "commercial", label: "Commercial", icon: DollarSign },
  { id: "execution", label: "Execution", icon: Truck },
  { id: "compliance", label: "Compliance", icon: Shield },
];

interface SectionNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
  completionMap?: Record<string, number>;
}

export function SectionNav({ activeSection, onNavigate, completionMap = {} }: SectionNavProps) {
  return (
    <nav className="sticky top-4 space-y-1 w-48 shrink-0 hidden lg:block">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 px-3">
        Sections
      </p>
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
              isActive
                ? "bg-accent text-accent-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
