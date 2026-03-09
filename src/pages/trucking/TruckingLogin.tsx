import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import alcLogo from "@/assets/alc-logo.png";
import { Truck } from "lucide-react";

const TruckingLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Only redirect if user has trucker role
  const { roles, isLoading: rolesLoading } = useUserRole();
  
  useEffect(() => {
    if (user && !rolesLoading && roles.includes("trucker" as any)) {
      navigate("/trucking");
    }
  }, [user, roles, rolesLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/trucking");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={alcLogo} alt="ALC Logo" className="h-16 w-auto brightness-0 invert" />
            <Truck className="h-12 w-12 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Carrier Portal</h2>
          <p className="text-primary-foreground/60">
            Access available shipments, submit competitive quotes, and grow your business with ALC.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-8 lg:hidden">
            <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
            <Truck className="h-6 w-6" />
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-2">Carrier Login</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to view available orders</p>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatch@trucking.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError("Enter your email first, then click Forgot password");
                      return;
                    }
                    setError("");
                    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (resetErr) {
                      setError(resetErr.message);
                    } else {
                      setError("");
                      setForgotSent(true);
                    }
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                required
              />
            </div>
            <Button variant="electric" className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Don't have an account? Carrier accounts are created by ALC administrators. 
              Contact your ALC representative to get invited.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Not a carrier partner?{" "}
              <Link to="/login" className="text-accent font-medium hover:underline">
                Shipper login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckingLogin;
