import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users, Shield, Building2, MoreVertical, Ban, CheckCircle,
  KeyRound, Plus, X, Search, Loader2, ChevronRight, ArrowLeft, Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingApprovalsPanel from "@/components/admin/PendingApprovalsPanel";

type ManageAction = "disable" | "enable" | "reset_password" | "add_role" | "remove_role" | "get_user_status";
const ALL_ROLES = ["admin", "ops_manager", "sales", "viewer", "trucker", "driver", "warehouse", "forwarder"] as const;

const roleColor: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400 border-red-500/20",
  ops_manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  viewer: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]",
  trucker: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  driver: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  warehouse: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  forwarder: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

const companyTypeColor: Record<string, string> = {
  shipper: "bg-blue-500/15 text-blue-400",
  freight_forwarder: "bg-cyan-500/15 text-cyan-400",
  trucking: "bg-amber-500/15 text-amber-400",
  warehouse: "bg-purple-500/15 text-purple-400",
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleUserId, setAddRoleUserId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

  // Fetch companies
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["admin-companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, company_type, status, created_at")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch company members for counts
  const { data: companyMembers } = useQuery({
    queryKey: ["admin-company-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, company_id, user_id, role, is_active");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
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
      const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Action completed");
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (err: any) => toast.error(err.message || "Action failed"),
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

  const isBanned = (user: any) => user?.banned_until && new Date(user.banned_until) > new Date();

  // Company stats
  const getCompanyStats = (companyId: string) => {
    const members = (companyMembers || []).filter((m) => m.company_id === companyId);
    return {
      total: members.length,
      active: members.filter((m) => m.is_active).length,
      invited: members.filter((m) => !m.is_active).length,
    };
  };

  // Users for a selected company
  const getCompanyUsers = () => {
    if (!selectedCompanyId) return [];
    const memberUserIds = (companyMembers || [])
      .filter((m) => m.company_id === selectedCompanyId)
      .map((m) => m.user_id);
    return (profiles || []).filter((p) => memberUserIds.includes(p.user_id));
  };

  const filteredCompanies = (companies || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.company_name.toLowerCase().includes(q) || (c.company_type || "").toLowerCase().includes(q);
  });

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);

  // ---- Company-first view ----
  if (selectedCompanyId) {
    const companyUsers = getCompanyUsers();
    return (
      <AdminLayout>
        <div className="mb-6">
          <button
            onClick={() => setSelectedCompanyId(null)}
            className="flex items-center gap-1.5 text-sm text-[hsl(220,10%,50%)] hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Companies
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="h-5 w-5 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">{selectedCompany?.company_name}</h1>
                <Badge variant="outline" className={companyTypeColor[selectedCompany?.company_type || ""] || "text-[hsl(220,10%,55%)]"}>
                  {(selectedCompany?.company_type || "unknown").replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-[hsl(220,10%,50%)]">{companyUsers.length} users</p>
            </div>
            <Button onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          {companyUsers.length === 0 ? (
            <p className="text-sm text-[hsl(220,10%,40%)] text-center py-12">No users in this company.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,15%)]">
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">User</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Roles</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Joined</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyUsers.map((p) => {
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
                        <div className="flex flex-wrap gap-1">
                          {roles.length > 0 ? roles.map((role) => (
                            <Badge key={role} variant="outline" className={`text-[10px] cursor-pointer group ${roleColor[role] || ""}`}
                              onClick={() => { if (confirm(`Remove role "${role}"?`)) manageUser.mutate({ action: "remove_role", target_user_id: p.user_id, role }); }}>
                              <Shield className="h-2.5 w-2.5 mr-1" />{role}
                              <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Badge>
                          )) : <span className="text-xs text-[hsl(220,10%,35%)]">No roles</span>}
                          <button onClick={() => { setAddRoleUserId(p.user_id); setAddRoleOpen(true); }}
                            className="h-5 w-5 rounded border border-dashed border-[hsl(220,15%,25%)] flex items-center justify-center text-[hsl(220,10%,40%)] hover:border-blue-500 hover:text-blue-400 transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-[hsl(220,10%,45%)] text-xs">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(220,10%,45%)] hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
                            <DropdownMenuItem onClick={() => handleGetStatus(p.user_id)} className="focus:bg-[hsl(220,15%,18%)]">
                              <Eye className="h-4 w-4 mr-2" /> View Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => manageUser.mutate({ action: "reset_password", target_user_id: p.user_id })} className="focus:bg-[hsl(220,15%,18%)]">
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[hsl(220,15%,18%)]" />
                            <DropdownMenuItem onClick={() => manageUser.mutate({ action: "disable", target_user_id: p.user_id })} className="text-red-400 focus:bg-red-500/10 focus:text-red-400">
                              <Ban className="h-4 w-4 mr-2" /> Disable
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => manageUser.mutate({ action: "enable", target_user_id: p.user_id })} className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400">
                              <CheckCircle className="h-4 w-4 mr-2" /> Enable
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Shared dialogs */}
        <AssignRoleDialog open={addRoleOpen} onOpenChange={setAddRoleOpen} userId={addRoleUserId} onAssign={(role) => manageUser.mutate({ action: "add_role", target_user_id: addRoleUserId, role }, { onSuccess: () => setAddRoleOpen(false) })} />
        <UserStatusDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} email={inviteEmail} setEmail={setInviteEmail} name={inviteName} setName={setInviteName} role={inviteRole} setRole={setInviteRole} onInvite={handleInvite} inviting={inviting} />
      </AdminLayout>
    );
  }

  // ---- Companies list (default view) ----
  return (
    <AdminLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Users & Companies</h1>
          </div>
          <p className="text-sm text-[hsl(220,10%,50%)]">
            {companies?.length || 0} companies · {profiles?.length || 0} total users
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Invite User
        </Button>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,13%)]">
          <TabsTrigger value="companies" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
            Companies
          </TabsTrigger>
          <TabsTrigger value="all-users" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
            All Users
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
            Pending Approvals
          </TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,10%,40%)]" />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white placeholder:text-[hsl(220,10%,35%)]" />
          </div>
        </div>

        <TabsContent value="companies">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            {companiesLoading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-[hsl(220,15%,15%)]" />)}</div>
            ) : filteredCompanies.length === 0 ? (
              <p className="text-sm text-[hsl(220,10%,40%)] text-center py-12">No companies found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(220,15%,15%)]">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Company</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Type</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Users</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Status</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Created</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((c) => {
                    const stats = getCompanyStats(c.id);
                    return (
                      <tr key={c.id} onClick={() => setSelectedCompanyId(c.id)}
                        className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors cursor-pointer">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-[hsl(220,15%,18%)] flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="font-medium text-white">{c.company_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`text-[10px] ${companyTypeColor[c.company_type] || "text-[hsl(220,10%,55%)]"}`}>
                            {(c.company_type || "—").replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-[hsl(220,10%,55%)]">
                            <Users className="h-3.5 w-3.5" />
                            <span>{stats.total}</span>
                            {stats.active > 0 && <span className="text-emerald-400 text-xs">({stats.active} active)</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={c.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]" : "bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]"}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-[hsl(220,10%,45%)] text-xs">{format(new Date(c.created_at), "MMM d, yyyy")}</td>
                        <td className="p-4 text-right">
                          <ChevronRight className="h-4 w-4 text-[hsl(220,10%,30%)]" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all-users">
          <AllUsersTable profiles={profiles || []} search={search} getRoles={getRoles} roleColor={roleColor}
            onGetStatus={handleGetStatus} onManage={manageUser} onAddRole={(userId) => { setAddRoleUserId(userId); setAddRoleOpen(true); }} />
        </TabsContent>

        <TabsContent value="pending">
          <PendingApprovalsPanel />
        </TabsContent>
      </Tabs>

      <AssignRoleDialog open={addRoleOpen} onOpenChange={setAddRoleOpen} userId={addRoleUserId} onAssign={(role) => manageUser.mutate({ action: "add_role", target_user_id: addRoleUserId, role }, { onSuccess: () => setAddRoleOpen(false) })} />
      <UserStatusDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} email={inviteEmail} setEmail={setInviteEmail} name={inviteName} setName={setInviteName} role={inviteRole} setRole={setInviteRole} onInvite={handleInvite} inviting={inviting} />
    </AdminLayout>
  );
};

// ---- Sub-components ----

function AllUsersTable({ profiles, search, getRoles, roleColor, onGetStatus, onManage, onAddRole }: any) {
  const filtered = profiles.filter((p: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.full_name || "").toLowerCase().includes(q) || (p.company_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
      {filtered.length === 0 ? (
        <p className="text-sm text-[hsl(220,10%,40%)] text-center py-12">No users found.</p>
      ) : (
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
            {filtered.map((p: any) => {
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
                  <td className="p-4"><div className="flex items-center gap-1.5 text-[hsl(220,10%,55%)]"><Building2 className="h-3.5 w-3.5" />{p.company_name || "—"}</div></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {roles.length > 0 ? roles.map((role: string) => (
                        <Badge key={role} variant="outline" className={`text-[10px] cursor-pointer group ${roleColor[role] || ""}`}
                          onClick={() => { if (confirm(`Remove "${role}"?`)) onManage.mutate({ action: "remove_role", target_user_id: p.user_id, role }); }}>
                          <Shield className="h-2.5 w-2.5 mr-1" />{role}
                          <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      )) : <span className="text-xs text-[hsl(220,10%,35%)]">No roles</span>}
                      <button onClick={() => onAddRole(p.user_id)}
                        className="h-5 w-5 rounded border border-dashed border-[hsl(220,15%,25%)] flex items-center justify-center text-[hsl(220,10%,40%)] hover:border-blue-500 hover:text-blue-400 transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-[hsl(220,10%,45%)] text-xs">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(220,10%,45%)] hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
                        <DropdownMenuItem onClick={() => onGetStatus(p.user_id)} className="focus:bg-[hsl(220,15%,18%)]"><Eye className="h-4 w-4 mr-2" /> View Status</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManage.mutate({ action: "reset_password", target_user_id: p.user_id })} className="focus:bg-[hsl(220,15%,18%)]"><KeyRound className="h-4 w-4 mr-2" /> Reset Password</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[hsl(220,15%,18%)]" />
                        <DropdownMenuItem onClick={() => onManage.mutate({ action: "disable", target_user_id: p.user_id })} className="text-red-400 focus:bg-red-500/10"><Ban className="h-4 w-4 mr-2" /> Disable</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManage.mutate({ action: "enable", target_user_id: p.user_id })} className="text-emerald-400 focus:bg-emerald-500/10"><CheckCircle className="h-4 w-4 mr-2" /> Enable</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AssignRoleDialog({ open, onOpenChange, userId, onAssign }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAssign: (role: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-sm">
        <DialogHeader><DialogTitle>Assign Role</DialogTitle></DialogHeader>
        <Select onValueChange={onAssign}>
          <SelectTrigger className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue placeholder="Select a role…" /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
            {ALL_ROLES.map((r) => <SelectItem key={r} value={r} className="focus:bg-[hsl(220,15%,18%)]">{r.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
}

function UserStatusDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const isBanned = user?.banned_until && new Date(user.banned_until) > new Date();
  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-md">
        <DialogHeader><DialogTitle>{user?.full_name || "User"} — Account Status</DialogTitle></DialogHeader>
        {user && (
          <div className="space-y-3 text-sm">
            <Row label="Email" value={user.email || "—"} />
            <Row label="Email Confirmed" value={user.email_confirmed ? "Yes" : "No"} />
            <Row label="Account Status" value={isBanned
              ? <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/20">Disabled</Badge>
              : <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Active</Badge>} />
            <Row label="Last Sign In" value={user.last_sign_in ? format(new Date(user.last_sign_in), "MMM d, yyyy HH:mm") : "Never"} />
            <Row label="Created" value={user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ open, onOpenChange, email, setEmail, name, setName, role, setRole, onInvite, inviting }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-sm">
        <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Full name" value={name} onChange={(e: any) => setName(e.target.value)}
            className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)]" />
          <Input placeholder="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)}
            className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,10%,35%)]" />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue placeholder="Select role…" /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white">
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r} className="focus:bg-[hsl(220,15%,18%)]">{r.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={onInvite} disabled={inviting || !email || !role} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[hsl(220,15%,13%)] last:border-0">
      <span className="text-[hsl(220,10%,45%)]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

export default AdminUsers;
