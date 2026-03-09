import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

const DriverAccount = () => {
  const { user } = useAuth();

  return (
    <DriverLayout>
      <h1 className="text-xl font-bold text-foreground mb-6">Account</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-accent" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm text-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm text-foreground">
              {user?.user_metadata?.full_name || "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </DriverLayout>
  );
};

export default DriverAccount;
