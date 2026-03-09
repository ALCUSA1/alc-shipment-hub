import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  Shield,
  Building2,
  MoreVertical,
  Ban,
  CheckCircle,
  KeyRound,
  Plus,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingApprovalsPanel from "@/components/admin/PendingApprovalsPanel";

type ManageAction = "disable" | "enable" | "reset_password" | "add_role" | "remove_role" | "get_user_status";

const ALL_ROLES = ["admin", "ops_manager", "sales", "viewer", "trucker"] as const;

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleUserId, setAddRoleUserId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

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

  const manageUser = useMutation({
    mutationFn: async (params: { action: ManageAction; target_user_id: string; role?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Action completed");
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Action failed");
    },
  });

  const handleGetStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "get_user_status", target_user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const profile = profiles?.find((p) => p.user_id === userId);
      setSelectedUser({ ...data, user_id: userId, full_name: profile?.full_name });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const roleColor: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400 border-red-500/20",
    ops_manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    viewer: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]",
    trucker: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole, full_name: inviteName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || `Invited ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const filtered = (profiles || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.company_name || "").toLowerCase().includes(q) ||
      p.user_id.toLowerCase().includes(q)
    );
  });

  const isBanned = (user: any) =>
    user?.banned_until && new Date(user.banned_until) > new Date();

  return (
    <AdminLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Users & Roles</h1>
          </div>
          <p className="text-sm text-[hsl(220,10%,50%)]">
            Manage platform users, roles, and account status
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,13%)]">
          <TabsTrigger value="users" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
            All Users
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
            Pending Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingApprovalsPanel />
        </TabsContent>

        <TabsContent value="users">
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,10%,40%)]" />
          <Input
            placeholder="Search by name, company, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white placeholder:text-[hsl(220,10%,35%)]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-[hsl(220,15%,15%)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
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
                          {roles.length > 0
                            ? roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`text-[10px] cursor-pointer group ${roleColor[role] || ""}`}
                                  onClick={() => {
                                    if (confirm(`Remove role "${role}" from this user?`)) {
                                      manageUser.mutate({
                                        action: "remove_role",
                                        target_user_id: p.user_id,
                                        role,
                                      });
                                    }
                                  }}
                                >
                                  <Shield className="h-2.5 w-2.5 mr-1" />
                                  {role}
                                  <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Badge>
                              ))
                            : (
                              <span className="text-xs text-[hsl(220,10%,35%)]">No roles</span>
                            )}
                          <button
                            onClick={() => {
                              setAddRoleUserId(p.user_id);
                              setAddRoleOpen(true);
                            }}
                            className="h-5 w-5 rounded border border-dashed border-[hsl(220,15%,25%)] flex items-center justify-center text-[hsl(220,10%,40%)] hover:border-blue-500 hover:text-blue-400 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(220,10%,45%)] hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
                            <DropdownMenuItem
                              onClick={() => handleGetStatus(p.user_id)}
                              className="focus:bg-[hsl(220,15%,18%)]"
                            >
                              <Users className="h-4 w-4 mr-2" /> View Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                manageUser.mutate({
                                  action: "reset_password",
                                  target_user_id: p.user_id,
                                })
                              }
                              className="focus:bg-[hsl(220,15%,18%)]"
                            >
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[hsl(220,15%,18%)]" />
                            <DropdownMenuItem
                              onClick={() =>
                                manageUser.mutate({
                                  action: "disable",
                                  target_user_id: p.user_id,
                                })
                              }
                              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                            >
                              <Ban className="h-4 w-4 mr-2" /> Disable Account
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                manageUser.mutate({
                                  action: "enable",
                                  target_user_id: p.user_id,
                                })
                              }
                              className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Enable Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <Select
            onValueChange={(role) => {
              manageUser.mutate(
                { action: "add_role", target_user_id: addRoleUserId, role },
                { onSuccess: () => setAddRoleOpen(false) }
              );
            }}
          >
            <SelectTrigger className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
              <SelectValue placeholder="Select a role…" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="focus:bg-[hsl(220,15%,18%)]">
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* User Status Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser?.full_name || "User"} — Account Status</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <Row label="Email" value={selectedUser.email || "—"} />
              <Row label="Email Confirmed" value={selectedUser.email_confirmed ? "Yes" : "No"} />
              <Row
                label="Account Status"
                value={
                  isBanned(selectedUser) ? (
                    <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/20">Disabled</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Active</Badge>
                  )
                }
              />
              <Row
                label="Last Sign In"
                value={selectedUser.last_sign_in ? format(new Date(selectedUser.last_sign_in), "MMM d, yyyy HH:mm") : "Never"}
              />
              <Row
                label="Created"
                value={selectedUser.created_at ? format(new Date(selectedUser.created_at), "MMM d, yyyy") : "—"}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(220,10%,45%)] mb-1 block">Full Name</label>
              <Input
                placeholder="John Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(220,10%,45%)] mb-1 block">Email *</label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(220,10%,45%)] mb-1 block">Role *</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="focus:bg-[hsl(220,15%,18%)]">
                      {r === "trucker" ? "Trucker (Carrier Portal)" : r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteRole || inviting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {inviting ? "Sending Invite…" : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 border-b border-[hsl(220,15%,13%)] last:border-0">
    <span className="text-[hsl(220,10%,45%)]">{label}</span>
    <span className="text-white">{value}</span>
  </div>
);

export default AdminUsers;
