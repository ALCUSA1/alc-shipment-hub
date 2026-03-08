import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const AdminTeam = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, avatar_url");

      const userMap = new Map<string, { roles: string[]; profile: any }>();
      for (const r of roles || []) {
        if (!userMap.has(r.user_id)) {
          const p = profiles?.find(pr => pr.user_id === r.user_id);
          userMap.set(r.user_id, { roles: [], profile: p });
        }
        userMap.get(r.user_id)!.roles.push(r.role);
      }

      return Array.from(userMap.entries()).map(([uid, d]) => ({ user_id: uid, ...d }));
    },
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <UserCog className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Team & Roles</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">All users with assigned platform roles</p>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Roles</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(u => (
                <tr key={u.user_id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{u.profile?.full_name || u.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{u.profile?.company_name || "—"}</td>
                  <td className="px-4 py-3 flex gap-1.5 flex-wrap">
                    {u.roles.map(r => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-[hsl(220,10%,40%)]">No roles assigned</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminTeam;
