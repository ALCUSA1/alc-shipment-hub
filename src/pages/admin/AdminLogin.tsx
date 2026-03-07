import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabase.rpc("get_user_roles", {
      _user_id: data.user.id,
    });

    if (roleError || !roles?.includes("admin")) {
      await supabase.auth.signOut();
      setError("Access denied. Admin privileges required.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back, admin.");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,7%)] flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative w-full max-w-md">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/20 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
          <p className="text-sm text-[hsl(220,10%,50%)] mt-1">Platform monitoring & management</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[hsl(220,15%,15%)] bg-[hsl(220,18%,10%)] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[hsl(220,10%,60%)] text-xs uppercase tracking-wider font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@company.com"
                className="bg-[hsl(220,18%,13%)] border-[hsl(220,15%,20%)] text-white placeholder:text-[hsl(220,10%,35%)] focus-visible:ring-red-500/50 focus-visible:border-red-500/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[hsl(220,10%,60%)] text-xs uppercase tracking-wider font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-[hsl(220,18%,13%)] border-[hsl(220,15%,20%)] text-white placeholder:text-[hsl(220,10%,35%)] focus-visible:ring-red-500/50 focus-visible:border-red-500/50 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-red-500/20 border-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Authenticating…" : "Sign In to Admin"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[hsl(220,10%,30%)] text-xs mt-6">
          This is a restricted area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
