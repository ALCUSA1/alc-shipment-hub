import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import alcLogo from "@/assets/alc-logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setReady(true);
      if (hash.includes("type=invite")) setIsInvite(true);
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Check user's role to redirect appropriately
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.rpc("get_user_roles", { _user_id: user.id });
      if (roles && (roles as string[]).includes("trucker")) {
        navigate("/trucking");
        return;
      }
    }
    navigate("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/50">
        <div className="text-center">
          <p className="text-muted-foreground">Verifying link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-secondary/50">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 font-bold text-lg text-foreground mb-8">
          <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isInvite ? "Set your password" : "Set new password"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {isInvite
            ? "Welcome! Create a password to activate your account."
            : "Enter your new password below"}
        </p>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={6} />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={6} />
          </div>
          <Button variant="electric" className="w-full" type="submit" disabled={loading}>
            {loading ? "Updating..." : isInvite ? "Activate Account" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;