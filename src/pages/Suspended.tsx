import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Suspended() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been suspended by the ALC management team. If you believe this is a
            mistake, please contact{" "}
            <a href="mailto:support@alllogisticscargo.com" className="text-primary underline">
              support@alllogisticscargo.com
            </a>
            .
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline">
          Sign out
        </Button>
      </div>
    </div>
  );
}
