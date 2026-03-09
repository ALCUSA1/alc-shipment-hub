import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Clock, XCircle, LogOut } from "lucide-react";
import alcLogo from "@/assets/alc-logo.png";

const PendingApproval = () => {
  const navigate = useNavigate();

  const { data: request } = useQuery({
    queryKey: ["my-signup-request"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isRejected = request?.status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={alcLogo} alt="ALC Logo" className="h-12 w-auto mx-auto" />

        {isRejected ? (
          <>
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Application Not Approved</h1>
            <p className="text-muted-foreground">
              Unfortunately, your account request was not approved.
              {request?.rejection_reason && (
                <span className="block mt-2 text-sm italic">Reason: {request.rejection_reason}</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact our team.
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Account Under Review</h1>
            <p className="text-muted-foreground">
              Your account is being reviewed by our team. You'll receive an email once your account has been approved.
            </p>
            <p className="text-sm text-muted-foreground">
              This usually takes 1–2 business days.
            </p>
          </>
        )}

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
