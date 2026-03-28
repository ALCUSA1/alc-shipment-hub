import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostLoginRoute } from "@/lib/role-routing";
import alcLogo from "@/assets/alc-logo.png";
import { Ship, ArrowRight } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    // Check for returnTo param (e.g. from Book Now redirect)
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      setLoading(false);
      navigate(returnTo);
      return;
    }
    // Role-based routing
    const route = await getPostLoginRoute(data.user.id);
    setLoading(false);
    navigate(route);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for the password reset link." });
      setResetMode(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(217,95%,58%)]/10 to-transparent" />
        <div className="absolute top-1/4 -right-16 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 -left-16 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />
        <div className="max-w-md text-center relative z-10">
          <img src={alcLogo} alt="ALC Logo" className="h-14 w-auto mx-auto mb-8 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-3 tracking-tight">ALC Shipper Portal</h2>
          <p className="text-primary-foreground/50 text-sm leading-relaxed">
            Your logistics operating system — coordinate freight, documents, and shipment tracking across all parties in one workspace.
          </p>
          <div className="flex items-center justify-center gap-6 mt-10 text-primary-foreground/30 text-xs">
            <span>Shippers</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/20" />
            <span>Forwarders</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/20" />
            <span>Carriers</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/20" />
            <span>Warehouses</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-8 lg:hidden">
            <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
          </Link>

          {resetMode ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Reset password</h1>
              <p className="text-sm text-muted-foreground mb-8">Enter your email to receive a reset link</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1.5" required />
                </div>
                <Button variant="electric" className="w-full" type="submit" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-6 text-center">
                <button onClick={() => setResetMode(false)} className="text-accent font-medium hover:underline">
                  Back to login
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground mb-8">Sign in to your account</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1.5" required />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => setResetMode(true)} className="text-xs text-accent hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" required />
                </div>
                <Button variant="electric" className="w-full h-11" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-6 text-center">
                Don't have an account? <Link to="/signup" className="text-accent font-medium hover:underline">Sign up</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
