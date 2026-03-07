import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import alcLogo from "@/assets/alc-logo.png";

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created", description: "Check your email to confirm your account, or log in if auto-confirmed." });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <img src={alcLogo} alt="ALC Logo" className="h-16 w-auto mx-auto mb-6 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">ALC Shipper Portal</h2>
          <p className="text-primary-foreground/60">Start managing your shipments from a modern logistics workspace.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-8 lg:hidden">
            <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-8">Get started with ALC Shipper Portal</p>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? "Creating account..." : "Start Shipping"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
