import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const Partners = () => {
  const { user } = useAuth();

  const { data: companies, isLoading } = useQuery({
    queryKey: ["partners", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, industry, status, city, state, country")
        .eq("status", "active")
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Partners</h1>
      <p className="text-sm text-muted-foreground mb-8">Your active logistics network</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !companies || companies.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">No active partners</h2>
          <p className="text-sm text-muted-foreground">Active companies from your CRM will appear here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{c.company_name}</h3>
                    <p className="text-xs text-muted-foreground">{c.industry || "—"}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[c.city, c.state, c.country].filter(Boolean).join(", ") || "No location"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Partners;
