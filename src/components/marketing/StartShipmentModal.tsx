import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateBusinessEmail } from "@/lib/email-validation";
import { ArrowRight, Loader2, Ship, Shield, Clock, Zap } from "lucide-react";

interface StartShipmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartShipmentModal({ open, onOpenChange }: StartShipmentModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!company.trim()) e.company = "Company name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const emailCheck = await validateBusinessEmail(email);
    if (!emailCheck.valid) {
      setErrors((prev) => ({ ...prev, email: emailCheck.reason || "Invalid email" }));
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, company_name: company },
        emailRedirectTo: "https://red-chough-476001.hostingersite.com",
      },
    });

    if (error) {
      setLoading(false);
      const description = error.message.includes("business email") || error.message.includes("Free email providers")
        ? "Please use your business email address. Free email providers (e.g. gmail.com) are not accepted."
        : error.message;
      toast({ title: "Sign up failed", description, variant: "destructive" });
      return;
    }

    // Assign role immediately
    if (data.user) {
      await supabase.functions.invoke("assign-signup-role", {
        body: { user_id: data.user.id, role: "viewer" },
      });
    }

    setLoading(false);
    onOpenChange(false);

    // If user is auto-confirmed (dev mode), go to wizard. Otherwise show confirmation.
    if (data.session) {
      navigate("/book");
    } else {
      toast({
        title: "Check your email",
        description: "Verify your email to start creating shipments.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-navy p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="h-5 w-5 text-accent" />
            <DialogTitle className="text-lg font-bold">Start a Shipment</DialogTitle>
          </div>
          <p className="text-sm text-primary-foreground/60">
            Create your account and start pricing shipments immediately.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="modal-name">Full name</Label>
            <Input
              id="modal-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }}
              placeholder="John Smith"
              className="mt-1.5"
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="modal-company">Company name</Label>
            <Input
              id="modal-company"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setErrors(prev => ({ ...prev, company: "" })); }}
              placeholder="Acme Logistics Inc."
              className="mt-1.5"
            />
            {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
          </div>
          <div>
            <Label htmlFor="modal-email">Email</Label>
            <Input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }}
              placeholder="you@company.com"
              className="mt-1.5"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="modal-password">Password</Label>
            <PasswordInput
              id="modal-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }}
              placeholder="••••••••"
              className="mt-1.5"
              minLength={6}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>

          <Button variant="electric" className="w-full h-11" type="submit" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" /> Less than 60 seconds
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3" /> No credit card required
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Zap className="h-3 w-3" /> Instant pricing
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
