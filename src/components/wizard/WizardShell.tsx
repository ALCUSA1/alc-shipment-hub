import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

interface WizardShellProps {
  title: string;
  subtitle: string;
  steps: string[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
  submitting?: boolean;
  isLastStep?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  extraButtons?: ReactNode;
  children: ReactNode;
}

export function WizardShell({
  title, subtitle, steps, currentStep, onNext, onPrev,
  canProceed, submitting = false, isLastStep = false,
  submitLabel = "Create", cancelLabel = "Cancel",
  onCancel, extraButtons, children,
}: WizardShellProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-2 transition-colors ${
              i <= currentStep ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs text-center hidden sm:block ${
              i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
            }`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={currentStep > 0 ? onPrev : onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 0 ? cancelLabel : "Previous"}
        </Button>
        <div className="flex gap-2">
          {extraButtons}
          <Button variant="electric" onClick={onNext} disabled={!canProceed || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLastStep ? submitLabel : "Next"}
            {!isLastStep && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
