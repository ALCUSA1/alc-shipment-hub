import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { User, Building, MapPin } from "lucide-react";

const TruckingAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [serviceRegion, setServiceRegion] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["trucker-profile", user?.id],
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

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCompanyName(profile.company_name || "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          company_name: companyName,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["trucker-profile"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your carrier profile</p>
      </div>

      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="ABC Trucking LLC"
                  className="mt-1"
                />
              </div>
              <Button type="submit" variant="electric" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TruckingLayout>
  );
};

export default TruckingAccount;
