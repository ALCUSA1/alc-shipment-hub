import { Check, Search, Ship, FileText, Package, Shield, DollarSign, CheckCircle, Anchor } from "lucide-react";

const STEP_META: Record<string, { label: string; icon: any }> = {
  search: { label: "Search", icon: Search },
  rates: { label: "Rate Selection", icon: Anchor },
  details: { label: "Shipment Details", icon: Ship },
  cargo: { label: "Cargo & Parties", icon: Package },
  compliance: { label: "Compliance", icon: Shield },
  documents: { label: "Documents", icon: FileText },
  payment: { label: "Payment", icon: DollarSign },
  confirmed: { label: "Confirmed", icon: CheckCircle },
};

interface BookingProgressBarProps {
  currentStep: string;
  steps: string[];
}

export function BookingProgressBar({ currentStep, steps }: BookingProgressBarProps) {
  const currentIdx = steps.indexOf(currentStep);

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border py-3 px-4 -mx-4 mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, idx) => {
          const meta = STEP_META[step];
          if (!meta) return null;
          const Icon = meta.icon;
          const isActive = idx === currentIdx;
          const isCompleted = idx < currentIdx;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs ${
                    isCompleted
                      ? "bg-accent text-accent-foreground"
                      : isActive
                      ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium text-center leading-tight max-w-[70px] hidden sm:block ${
                    isActive ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {meta.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 mt-[-14px] transition-colors duration-300 ${
                    idx < currentIdx ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
