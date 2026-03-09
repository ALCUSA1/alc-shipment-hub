import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import alcLogo from "@/assets/alc-logo.png";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Shipper", companyType: "shipper", description: "I need to ship goods" },
  { value: "trucker", label: "Carrier (Back Office)", companyType: "trucking_company", description: "I manage trucking operations" },
  { value: "driver", label: "Driver", companyType: "trucking_company", description: "I drive and deliver cargo" },
  { value: "ops_manager", label: "Warehouse Operator", companyType: "warehouse", description: "I operate a warehouse" },
] as const;

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast({ title: "Select account type", description: "Please select what type of account you need.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const roleOption = ROLE_OPTIONS.find((r) => r.value === selectedRole);

    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, requested_role: selectedRole },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }

    // 2. Insert signup request (user must confirm email first, so this may fail if RLS requires auth)
    // We store it after signup — the user_id is available from the response
    if (data.user) {
      await supabase.from("signup_requests").insert({
        user_id: data.user.id,
        requested_role: selectedRole,
        company_name: companyName || null,
        company_type: roleOption?.companyType || null,
      } as any);
    }

    setLoading(false);
    toast({
      title: "Account created",
      description: "Please check your email to verify your account. Once verified and approved by our team, you'll be able to log in.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img src={alcLogo} alt="ALC Logo" className="h-16 w-auto mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">ALC Logistics</h2>
          <p className="text-primary-foreground/60">Join our platform — whether you're a shipper, carrier, or warehouse operator.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-8 lg:hidden">
            <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-8">Get started with ALC Logistics</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="account-type">I am a…</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company">Company name</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Logistics Inc." className="mt-1" />
            </div>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={6} />
            </div>
            <Button variant="electric" className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center leading-relaxed">
            Your account will be reviewed by our team before access is granted. You'll receive an email once approved.
          </p>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
