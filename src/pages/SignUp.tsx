import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateBusinessEmail } from "@/lib/email-validation";
import alcLogo from "@/assets/alc-logo.png";
import { Package, Ship, Truck, Warehouse, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  {
    value: "viewer",
    label: "Shipper / Importer / Exporter",
    companyType: "shipper",
    icon: Package,
    description: "I need logistics services to move my goods",
    responsibilities: [
      "Create and manage shipments end-to-end",
      "Track cargo in real-time",
      "Manage documents and financials",
    ],
  },
  {
    value: "forwarder",
    label: "Freight Forwarder",
    companyType: "forwarder",
    icon: Ship,
    description: "I manage freight forwarding operations",
    responsibilities: [
      "Coordinate shipments across carriers",
      "Manage pricing and customer quotes",
      "Oversee end-to-end logistics execution",
    ],
  },
  {
    value: "trucker",
    label: "Trucking Provider",
    companyType: "trucking_company",
    icon: Truck,
    description: "I provide pickup, delivery, and drayage services",
    responsibilities: [
      "Receive pickup and delivery orders",
      "Manage drivers and update shipment status",
      "Upload proof of delivery documents",
    ],
  },
  {
    value: "warehouse",
    label: "Warehouse Provider",
    companyType: "warehouse",
    icon: Warehouse,
    description: "I operate warehouses and handle cargo storage",
    responsibilities: [
      "Manage inbound and outbound cargo",
      "Coordinate with trucking companies for pickup",
      "Handle cargo release and storage operations",
    ],
  },
] as const;

const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  const pendingBooking = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("pendingBooking");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const getAuthRedirectUrl = () => `${window.location.origin}/login`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast({ title: "Select account type", description: "Please select what type of account you need.", variant: "destructive" });
      return;
    }

    const emailCheck = await validateBusinessEmail(email);
    if (!emailCheck.valid) {
      toast({ title: "Business email required", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          requested_role: selectedRole,
          company_name: companyName.trim() || null,
        },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      setLoading(false);
      let description = error.message;
      if (error.message.includes("business email") || error.message.includes("Free email providers")) {
        description = "Please use your business email address. Free email providers (e.g. gmail.com) are not accepted.";
      } else if (error.message.includes("weak") || error.message.includes("pwned")) {
        description = "Choose a stronger password that hasn't been exposed in a data breach.";
      }
      toast({ title: "Sign up failed", description, variant: "destructive" });
      return;
    }

    setLoading(false);
    toast({
      title: "Account created",
      description: "We sent a verification email to your inbox. After you verify, sign in to continue.",
    });

    const returnTo = searchParams.get("returnTo");
    navigate(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(217,95%,58%)]/10 to-transparent" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="max-w-md text-center relative z-10">
          <img src={alcLogo} alt="ALC Logo" className="h-14 w-auto mx-auto mb-8 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-3 tracking-tight">Join the Logistics Network</h2>
          <p className="text-primary-foreground/50 text-sm leading-relaxed">
            Whether you're shipping goods, managing freight, hauling cargo, or operating a warehouse — your operations start here.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-6 lg:hidden">
            <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Select your role and get started with ALC Logistics</p>

          {pendingBooking && (
            <div className="mb-6 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <Ship className="h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">Continuing your booking</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingBooking.originPort} <ArrowRight className="inline h-3 w-3 mx-0.5" /> {pendingBooking.destinationPort}
                {pendingBooking.carrier && <> · {pendingBooking.carrier}</>}
                {pendingBooking.totalRate > 0 && <> · <span className="text-accent font-medium">${pendingBooking.totalRate.toLocaleString()}</span></>}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Role Selection */}
            <div>
              <Label className="mb-3 block text-sm font-semibold">Step 1 — What describes you best?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = selectedRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedRole(opt.value)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all hover:border-accent/50",
                        isSelected ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <opt.icon className={cn("h-5 w-5", isSelected ? "text-accent" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{opt.description}</p>
                      <ul className="space-y-1 mt-1">
                        {opt.responsibilities.map((r) => (
                          <li key={r} className="text-[10px] text-muted-foreground flex items-start gap-1">
                            <CheckCircle2 className={cn("h-3 w-3 mt-0.5 shrink-0", isSelected ? "text-accent" : "text-muted-foreground/50")} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Account Details */}
            <div className="space-y-3">
              <Label className="block text-sm font-semibold">Step 2 — Account details</Label>
              <div>
                <Label htmlFor="company">Company name</Label>
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Logistics Inc." className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" required minLength={6} />
              </div>
            </div>

            <Button variant="electric" className="w-full h-11" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center leading-relaxed">
            Verify your email and you're ready to go.
          </p>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Already have an account? <Link to={searchParams.get("returnTo") ? `/login?returnTo=${encodeURIComponent(searchParams.get("returnTo")!)}` : "/login"} className="text-accent font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
