import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, ArrowRight, Landmark } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<{ status: string; amount: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVerifying(false);
      setError("No session ID provided.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (fnError) throw fnError;
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Failed to verify payment.");
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [sessionId]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            {verifying ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
                <p className="text-muted-foreground">Verifying your payment...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="electric" asChild>
                  <Link to="/dashboard/quotes">Back to Quotes</Link>
                </Button>
              </div>
            ) : result?.status === "completed" ? (
              <div className="space-y-4">
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Payment Successful</h2>
                <p className="text-muted-foreground">
                  Your payment of{" "}
                  <span className="font-semibold text-foreground">
                    {result.currency} {result.amount.toLocaleString()}
                  </span>{" "}
                  has been processed.
                </p>
                <Button variant="electric" asChild>
                  <Link to="/dashboard/quotes">
                    View Quotes <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-yellow-600 font-medium">Payment is being processed</p>
                <p className="text-sm text-muted-foreground">
                  Your payment status is: <span className="font-medium">{result?.status || "unknown"}</span>. 
                  ACH bank transfers may take a few days to complete.
                </p>
                <Button variant="electric" asChild>
                  <Link to="/dashboard/quotes">Back to Quotes</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSuccess;
