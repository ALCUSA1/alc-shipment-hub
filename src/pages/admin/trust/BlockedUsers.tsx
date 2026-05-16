import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

type Row = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  blocked_at: string | null;
};

export default function BlockedUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newUserId, setNewUserId] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("user_roles")
      .select("user_id, created_at, profiles:profiles!inner(email, full_name)")
      .eq("role", "blocked");
    if (error) {
      // fallback: query without join
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "blocked");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("id, email, full_name")
          .in("id", ids);
        const m = new Map((profs || []).map((p: any) => [p.id, p]));
        setRows(
          (roles || []).map((r: any) => ({
            user_id: r.user_id,
            email: m.get(r.user_id)?.email ?? null,
            full_name: m.get(r.user_id)?.full_name ?? null,
            blocked_at: r.created_at,
          }))
        );
      } else {
        setRows([]);
      }
    } else {
      setRows(
        (data || []).map((r: any) => ({
          user_id: r.user_id,
          email: r.profiles?.email ?? null,
          full_name: r.profiles?.full_name ?? null,
          blocked_at: r.created_at,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleBlock = async () => {
    if (!newUserId.trim()) return;
    const { error } = await (supabase as any)
      .from("user_roles")
      .insert({ user_id: newUserId.trim(), role: "blocked" } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("User blocked");
      setNewUserId("");
      load();
    }
  };

  const handleUnblock = async (userId: string) => {
    const { error } = await (supabase as any)
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "blocked");
    if (error) toast.error(error.message);
    else {
      toast.success("User unblocked");
      load();
    }
  };

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user_id.includes(search)
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold">Blocked Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Users with platform access suspended. They will be redirected to a suspension page on login.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-medium">Block a user</h2>
          <div className="flex gap-2">
            <Input
              placeholder="User ID (UUID)"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
            <Button onClick={handleBlock} variant="destructive">
              Block
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Find user IDs in <span className="font-mono">Accounts → Users</span>.
          </p>
        </Card>

        <div>
          <Input
            placeholder="Search by email, name, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mb-3"
          />
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Blocked at</th>
                  <th className="text-right px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No blocked users.</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.user_id} className="border-t border-border">
                      <td className="px-4 py-2">{r.email ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2">{r.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {r.blocked_at ? new Date(r.blocked_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleUnblock(r.user_id)}>
                          Unblock
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
