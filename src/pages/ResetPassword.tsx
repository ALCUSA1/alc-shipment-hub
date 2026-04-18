import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import alcLogo from "@/assets/alc-logo.png";

const INVALID_LINK_MESSAGE = "This password reset link is invalid or has expired. Please request a new one.";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState("");
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const finalizeState = (next: { ready?: boolean; canReset?: boolean; error?: string; isInvite?: boolean }) => {
      if (!isMounted) return;
      if (typeof next.ready === "boolean") setReady(next.ready);
      if (typeof next.canReset === "boolean") setCanReset(next.canReset);
      if (typeof next.error === "string") setError(next.error);
      if (typeof next.isInvite === "boolean") setIsInvite(next.isInvite);
    };

    const clearRecoveryParams = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const initializeRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const recoveryType = hashParams.get("type") ?? queryParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = queryParams.get("code");
      const inviteFlow = recoveryType === "invite";

      finalizeState({ isInvite: inviteFlow, error: "" });

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          finalizeState({ ready: true, canReset: false, error: INVALID_LINK_MESSAGE });
          return;
        }

        clearRecoveryParams();
        finalizeState({ ready: true, canReset: true, error: "" });
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          finalizeState({ ready: true, canReset: false, error: INVALID_LINK_MESSAGE });
          return;
        }

        clearRecoveryParams();
        finalizeState({ ready: true, canReset: true, error: "" });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        finalizeState({ ready: true, canReset: true, error: "" });
        return;
      }

      finalizeState({
        ready: true,
        canReset: false,
        error: recoveryType ? INVALID_LINK_MESSAGE : "Please open the password reset link from your email.",
      });
    };

    initializeRecovery();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        finalizeState({ ready: true, canReset: Boolean(session), error: "" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { getPostLoginRoute } = await import("@/lib/role-routing");
      const route = await getPostLoginRoute(user.id);
      navigate(route);
      return;
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

        {!canReset ? (
          <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
            Back to login
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={8} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput id="confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-1" required minLength={8} />
            </div>
            <Button variant="electric" className="w-full" type="submit" disabled={loading}>
              {loading ? "Updating..." : isInvite ? "Activate Account" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;