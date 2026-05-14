import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { CheckCircle2 } from "lucide-react";
import alcLogo from "@/assets/alc-logo.png";

export default function SubscribeSuccess() {
  const navigate = useNavigate();
  const { refresh } = useSubscription();
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Poll a few times — Stripe webhook → check-subscription propagates almost immediately
      for (let i = 0; i < 6 && !cancelled; i++) {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (!error && (data?.status === "active" || data?.status === "trialing")) {
          await refresh();
          if (!cancelled) {
            setStatus("ok");
            setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        await refresh();
        setStatus("ok"); // soft success — gate will route them if needed
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <img src={alcLogo} alt="ALC" className="h-10 w-auto mx-auto mb-6" />
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {status === "verifying" ? "Confirming your subscription…" : "You're all set"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {status === "verifying"
              ? "Hang tight — this only takes a moment."
              : "Redirecting you to your dashboard…"}
          </p>
        </div>
      </div>
    </div>
  );
}
