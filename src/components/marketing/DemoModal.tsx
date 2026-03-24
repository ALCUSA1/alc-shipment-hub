import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!company.trim()) e.company = "Company is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => { setSubmitted(false); setName(""); setCompany(""); setEmail(""); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-accent" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mb-2">Demo request received!</DialogTitle>
            <p className="text-sm text-muted-foreground mb-6">
              Our team will reach out to {email} within 24 hours to schedule your demo.
            </p>
            <Button variant="electric" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-5 w-5 text-accent" />
              <DialogTitle className="text-lg font-bold text-foreground">Book a Demo</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              See how the platform converts carrier rates into profitable shipments.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="demo-name">Name</Label>
                <Input id="demo-name" value={name} onChange={(e) => { setName(e.target.value); setErrors(p => ({...p, name: ""})); }} placeholder="John Smith" className="mt-1.5" autoFocus />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="demo-company">Company</Label>
                <Input id="demo-company" value={company} onChange={(e) => { setCompany(e.target.value); setErrors(p => ({...p, company: ""})); }} placeholder="Acme Logistics" className="mt-1.5" />
                {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
              </div>
              <div>
                <Label htmlFor="demo-email">Work email</Label>
                <Input id="demo-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: ""})); }} placeholder="you@company.com" className="mt-1.5" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <Button variant="electric" className="w-full h-11" type="submit" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Request Demo"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
