import { Check, Search, Ship, FileText, Rocket } from "lucide-react";

const STEP_META = {
  search: { label: "Search", icon: Search },
  sailings: { label: "Select Sailing", icon: Ship },
  quote: { label: "Review Quote", icon: FileText },
  confirm: { label: "Booked", icon: Rocket },
};

interface BookingProgressBarProps {
  currentStep: string;
  steps: string[];
}

export function BookingProgressBar({ currentStep, steps }: BookingProgressBarProps) {
  const currentIdx = steps.indexOf(currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, idx) => {
          const meta = STEP_META[step as keyof typeof STEP_META];
          const Icon = meta.icon;
          const isActive = idx === currentIdx;
          const isCompleted = idx < currentIdx;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-accent text-accent-foreground"
                      : isActive
                      ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    isActive ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {meta.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-colors duration-300 ${
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
