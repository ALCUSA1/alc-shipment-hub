import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, Loader2, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ops_manager: "Operations Manager",
  sales: "Sales / CRM",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  ops_manager: "bg-accent/10 text-accent",
  sales: "bg-yellow-100 text-yellow-700",
  viewer: "bg-secondary text-muted-foreground",
};

const Team = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  // Fetch all team members (user_roles joined with profiles)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at");
      if (error) throw error;

      // Fetch profiles for these users
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Group roles by user
      const userMap = new Map<string, { user_id: string; full_name: string | null; roles: { id: string; role: string }[] }>();
      for (const r of data) {
        if (!userMap.has(r.user_id)) {
          const profile = profileMap.get(r.user_id);
          userMap.set(r.user_id, {
            user_id: r.user_id,
            full_name: profile?.full_name || null,
            roles: [],
          });
        }
        userMap.get(r.user_id)!.roles.push({ id: r.id, role: r.role });
      }
      return Array.from(userMap.values());
    },
    enabled: isAdmin,
  });

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole, full_name: inviteName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invitation Sent", description: `${inviteEmail} invited as ${ROLE_LABELS[inviteRole]}` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err: any) {
      toast({ title: "Invite Failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      toast({ title: "Role Removed" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
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

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground">Manage users and their roles</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="electric">
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>Send an email invitation with a pre-assigned role.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input id="invite-email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="invite-name">Full Name (optional)</Label>
                <Input id="invite-name" placeholder="Jane Doe" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="ops_manager">Operations Manager — Shipments, trucking, warehouses</SelectItem>
                    <SelectItem value="sales">Sales / CRM — CRM, quotes, customers</SelectItem>
                    <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button variant="electric" onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteRole}>
                {inviting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>Users with assigned roles in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members yet. Invite your first team member to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.full_name || "Unnamed User"}
                      {member.user_id === user?.id && (
                        <span className="text-xs text-muted-foreground ml-2">(you)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.roles.map((r) => (
                      <div key={r.id} className="flex items-center gap-1">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[r.role] || "bg-secondary text-muted-foreground"}`}>
                          {ROLE_LABELS[r.role] || r.role}
                        </span>
                        {member.user_id !== user?.id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveRole(r.id)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Team;
