import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

type Status = "loading" | "valid" | "invalid" | "already" | "submitting" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMsg("Missing unsubscribe token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (res.ok && data.valid) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else {
          setStatus("invalid");
          setErrorMsg(data.error || "Invalid or expired link.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Could not reach the server. Please try again.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else {
        setStatus("error");
        setErrorMsg(data?.error || "Unable to process request.");
      }
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "Unable to process request.");
    }
  };

  return (
    <>
      <SEO title="Unsubscribe — ALC Shipper Portal" description="Manage your email preferences." />
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "loading" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying your link…
              </div>
            )}
            {status === "valid" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Click below to unsubscribe from non-essential emails. You'll still receive critical
                  account and shipment notifications.
                </p>
                <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
              </>
            )}
            {status === "submitting" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </div>
            )}
            {status === "success" && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <p>You've been unsubscribed. We're sorry to see you go.</p>
              </div>
            )}
            {status === "already" && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <p>You're already unsubscribed. No further action needed.</p>
              </div>
            )}
            {(status === "invalid" || status === "error") && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <p>{errorMsg || "Something went wrong."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
