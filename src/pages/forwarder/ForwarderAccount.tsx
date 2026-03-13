import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

const ForwarderAccount = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <ForwarderLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your forwarder profile and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile?.full_name || ""} readOnly className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={profile?.company_name || ""} readOnly className="bg-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </ForwarderLayout>
  );
};

export default ForwarderAccount;
