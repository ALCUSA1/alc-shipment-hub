import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus, Shield, Loader2, MoreHorizontal, Users, Crown, Eye,
  ShieldCheck, DollarSign, Settings2, Check, X, Mail, UserX, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

/* ── Role definitions ─────────────────────────────── */

interface RoleDef {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
}

const ROLES: Record<string, RoleDef> = {
  admin: {
    label: "Owner / Admin",
    description: "Full access — manage billing, team, and all platform features",
    icon: Crown,
    color: "text-amber-600",
    badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ops_manager: {
    label: "Operations",
    description: "Create & manage shipments, upload documents, track shipments",
    icon: Settings2,
    color: "text-blue-600",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sales: {
    label: "Finance",
    description: "View financials, invoices, manage payments",
    icon: DollarSign,
    color: "text-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access — cannot edit or create",
    icon: Eye,
    color: "text-muted-foreground",
    badgeBg: "bg-secondary text-muted-foreground",
  },
};

/* ── Permissions matrix ────────────────────────────── */

const PERMISSIONS = [
  { key: "create_shipment", label: "Create Shipment", admin: true, ops_manager: true, sales: false, viewer: false },
  { key: "edit_shipment", label: "Edit Shipment", admin: true, ops_manager: true, sales: false, viewer: false },
  { key: "view_shipment", label: "View Shipment", admin: true, ops_manager: true, sales: true, viewer: true },
  { key: "access_financials", label: "Access Financials", admin: true, ops_manager: false, sales: true, viewer: false },
  { key: "download_invoices", label: "Download Invoices", admin: true, ops_manager: false, sales: true, viewer: true },
  { key: "upload_documents", label: "Upload Documents", admin: true, ops_manager: true, sales: false, viewer: false },
  { key: "view_documents", label: "View Documents", admin: true, ops_manager: true, sales: true, viewer: true },
  { key: "send_messages", label: "Send Messages", admin: true, ops_manager: true, sales: true, viewer: false },
  { key: "manage_team", label: "Manage Team", admin: true, ops_manager: false, sales: false, viewer: false },
  { key: "access_admin", label: "Access Admin Features", admin: true, ops_manager: false, sales: false, viewer: false },
];

/* ── Status helpers ────────────────────────────────── */

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Active</Badge>;
    case "invited":
      return <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-0">Invited</Badge>;
    case "disabled":
      return <Badge variant="secondary" className="border-0 text-muted-foreground">Disabled</Badge>;
    default:
      return <Badge variant="secondary" className="border-0">{status}</Badge>;
  }
}

/* ── Main component ────────────────────────────────── */

const Team = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviting, setInviting] = useState(false);

  /* ── Edit member state ─────────────────────────── */
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Data fetching ─────────────────────────────── */

  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at");
      if (error) throw error;

      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const userMap = new Map<string, {
        user_id: string;
        full_name: string | null;
        email: string | null;
        status: string;
        roles: { id: string; role: string }[];
        created_at: string;
      }>();

      for (const r of data) {
        if (!userMap.has(r.user_id)) {
          const profile = profileMap.get(r.user_id);
          userMap.set(r.user_id, {
            user_id: r.user_id,
            full_name: profile?.full_name || null,
            email: null,
            status: "active",
            roles: [],
            created_at: r.created_at,
          });
        }
        userMap.get(r.user_id)!.roles.push({ id: r.id, role: r.role });
      }
      return Array.from(userMap.values());
    },
    enabled: isAdmin,
  });

  /* ── Actions ───────────────────────────────────── */

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole, full_name: inviteName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invitation Sent", description: `${inviteEmail} invited as ${ROLES[inviteRole]?.label || inviteRole}` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      setInviteTitle("");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err: any) {
      toast({ title: "Invite Failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (roleId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("id", roleId);
      if (error) throw error;
      toast({ title: "Role Updated", description: `Changed to ${ROLES[newRole]?.label || newRole}` });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveUser = async (member: typeof teamMembers extends (infer T)[] | undefined ? T : never) => {
    if (!member) return;
    try {
      for (const r of member.roles) {
        const { error } = await supabase.from("user_roles").delete().eq("id", r.id);
        if (error) throw error;
      }
      toast({ title: "User Removed", description: `${member.full_name || "User"} has been removed from the team.` });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  /* ── Loading / Access checks ────────────────────── */

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only administrators can manage team members.</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalMembers = teamMembers?.length || 0;
  const activeMembers = teamMembers?.filter(m => m.status === "active").length || 0;

  /* ── Render ─────────────────────────────────────── */

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your company's users, roles, and permissions</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" /> Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an email invitation to join your company account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <Input id="invite-name" placeholder="Jane Doe" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email Address *</Label>
                  <Input id="invite-email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES).map(([value, def]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{def.label}</span>
                            <span className="text-xs text-muted-foreground">{def.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-title">Department / Title (optional)</Label>
                  <Input id="invite-title" placeholder="e.g. Logistics Coordinator" value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteRole} className="bg-primary text-primary-foreground">
                  {inviting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="border border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                    <p className="text-xs text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{activeMembers}</p>
                    <p className="text-xs text-muted-foreground">Active Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {Object.keys(ROLES).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Available Roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>Users with access to your company account</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {teamLoading ? (
                  <div className="space-y-3 p-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : !teamMembers || teamMembers.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No team members yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Invite your first team member to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => {
                          const primaryRole = member.roles[0];
                          const roleDef = ROLES[primaryRole?.role] || ROLES.viewer;
                          const RoleIcon = roleDef.icon;
                          const isCurrentUser = member.user_id === user?.id;

                          return (
                            <TableRow key={member.user_id} className="group">
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <span className="text-sm font-semibold text-muted-foreground">
                                      {(member.full_name || "U").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground leading-none">
                                      {member.full_name || "Unnamed User"}
                                      {isCurrentUser && (
                                        <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{member.user_id.slice(0, 8)}…</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <RoleIcon className={`h-3.5 w-3.5 ${roleDef.color}`} />
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleDef.badgeBg}`}>
                                    {roleDef.label}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{statusBadge(member.status)}</TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(member.created_at).toLocaleDateString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                {!isCurrentUser && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {Object.entries(ROLES).map(([key, def]) => (
                                        primaryRole?.role !== key && (
                                          <DropdownMenuItem
                                            key={key}
                                            onClick={() => handleChangeRole(primaryRole.id, key)}
                                          >
                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                            Change to {def.label}
                                          </DropdownMenuItem>
                                        )
                                      ))}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <Mail className="h-3.5 w-3.5 mr-2" />
                                        Resend Invite
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => handleRemoveUser(member)}
                                      >
                                        <UserX className="h-3.5 w-3.5 mr-2" />
                                        Remove User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Permissions Matrix</CardTitle>
                <CardDescription>What each role can access across the platform</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 w-[200px]">Permission</TableHead>
                        {Object.entries(ROLES).map(([key, def]) => (
                          <TableHead key={key} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <def.icon className={`h-4 w-4 ${def.color}`} />
                              <span className="text-xs">{def.label}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PERMISSIONS.map((perm) => (
                        <TableRow key={perm.key}>
                          <TableCell className="pl-6 font-medium text-sm">{perm.label}</TableCell>
                          {(["admin", "ops_manager", "sales", "viewer"] as const).map((role) => (
                            <TableCell key={role} className="text-center">
                              {perm[role] ? (
                                <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Team;
