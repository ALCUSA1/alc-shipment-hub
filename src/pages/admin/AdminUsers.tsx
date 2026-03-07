import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Shield } from "lucide-react";

const AdminUsers = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const getRoles = (userId: string) =>
    (allRoles || []).filter((r) => r.user_id === userId).map((r) => r.role);

  const roleColor: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/20",
    ops_manager: "bg-accent/10 text-accent border-accent/20",
    sales: "bg-green-100 text-green-700 border-green-200",
    viewer: "bg-secondary text-muted-foreground border-border",
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
        </div>
        <p className="text-sm text-muted-foreground">View all platform users, their roles, and account details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Name</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Company</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Roles</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const roles = getRoles(p.user_id);
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                              {(p.full_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{p.user_id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{p.company_name || "—"}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {roles.length > 0 ? roles.map((role) => (
                              <Badge key={role} variant="outline" className={`text-[10px] ${roleColor[role] || ""}`}>
                                <Shield className="h-2.5 w-2.5 mr-1" />
                                {role}
                              </Badge>
                            )) : (
                              <span className="text-xs text-muted-foreground">No roles</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {format(new Date(p.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminUsers;
