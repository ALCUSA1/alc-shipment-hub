import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Shield, Mail, Building2 } from "lucide-react";

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
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const getRoles = (userId: string) =>
    (allRoles || []).filter((r) => r.user_id === userId).map((r) => r.role);

  const roleColor: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400 border-red-500/20",
    ops_manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    viewer: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]",
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Users & Roles</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">View all platform users, their roles, and account details</p>
      </div>

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-[hsl(220,15%,15%)]" />)}
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <p className="text-sm text-[hsl(220,10%,40%)] text-center py-12">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,15%)]">
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">User</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Company</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Roles</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const roles = getRoles(p.user_id);
                  return (
                    <tr key={p.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {(p.full_name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{p.full_name || "Unnamed"}</p>
                            <p className="text-xs text-[hsl(220,10%,40%)] font-mono">{p.user_id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[hsl(220,10%,55%)]">
                          <Building2 className="h-3.5 w-3.5" />
                          {p.company_name || "—"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {roles.length > 0 ? roles.map((role) => (
                            <Badge key={role} variant="outline" className={`text-[10px] ${roleColor[role] || ""}`}>
                              <Shield className="h-2.5 w-2.5 mr-1" />
                              {role}
                            </Badge>
                          )) : (
                            <span className="text-xs text-[hsl(220,10%,35%)]">No roles</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
