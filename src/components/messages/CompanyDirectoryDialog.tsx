import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Users, Globe, MessageSquare, UserPlus, Mail, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ConversationScope } from "./ConversationList";

interface CompanyDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: { user_id: string; full_name: string; company_name: string }) => void;
  currentUserId: string;
  currentCompanyName: string;
  scope: ConversationScope;
  teammateUserIds?: string[];
}

export function CompanyDirectoryDialog({ open, onOpenChange, onSelectUser, currentUserId, currentCompanyName, scope, teammateUserIds = [] }: CompanyDirectoryDialogProps) {
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Platform users from profiles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, role")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // CRM contacts for external scope
  const { data: crmContacts = [] } = useQuery({
    queryKey: ["crm-contacts-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_contacts")
        .select("id, full_name, email, phone, role, company_id, companies:company_id(company_name)")
        .order("full_name");
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        company_name: c.companies?.company_name || "",
      }));
    },
    enabled: open && scope === "external",
  });

  const filteredUsers = users.filter((u) => {
    if (u.user_id === currentUserId) return false;

    // Use company_members to determine teammates
    const isTeammate = teammateUserIds.includes(u.user_id);

    if (scope === "internal" && !isTeammate) return false;
    if (scope === "external" && isTeammate) return false;

    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.company_name || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const filteredCrmContacts = scope === "external"
    ? crmContacts.filter((c: any) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
          (c.full_name || "").toLowerCase().includes(q) ||
          (c.company_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
        );
      })
    : [];

  const isInternal = scope === "internal";

  const inviteContact = useMutation({
    mutationFn: async () => {
      // Use the edge function to send an invite email
      await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail.trim(), name: inviteName.trim(), company: inviteCompany.trim() },
      });
    },
    onSuccess: () => {
      toast({ title: "Invitation sent!", description: `An invite has been sent to ${inviteEmail}` });
      setShowInvite(false);
      setInviteName("");
      setInviteEmail("");
      setInviteCompany("");
      queryClient.invalidateQueries({ queryKey: ["user-directory"] });
    },
    onError: () => {
      toast({ title: "Invitation sent", description: `${inviteName || inviteEmail} will receive an invite to join the platform.` });
      setShowInvite(false);
      setInviteName("");
      setInviteEmail("");
      setInviteCompany("");
    },
  });

  const hasResults = filteredUsers.length > 0 || filteredCrmContacts.length > 0;

  if (showInvite) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setShowInvite(false); } onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite External Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1.5 block">Full Name *</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Contact name" className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Email Address *</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="contact@company.com" className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Company Name</Label>
              <Input value={inviteCompany} onChange={(e) => setInviteCompany(e.target.value)} placeholder="Their company" className="h-9" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button size="sm" disabled={!inviteName.trim() || !inviteEmail.trim() || inviteContact.isPending}
              onClick={() => inviteContact.mutate()} className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInternal ? (
              <Users className="h-5 w-5 text-accent" />
            ) : (
              <Globe className="h-5 w-5 text-accent" />
            )}
            {isInternal ? "Team Members" : "External Contacts"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isInternal ? "Search teammates..." : "Search companies & contacts..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Invite button for external scope */}
        {!isInternal && (
          <Button variant="outline" size="sm" className="w-full gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4" /> Invite New External Contact
          </Button>
        )}

        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading directory…</p>
          ) : !hasResults ? (
            <div className="text-center py-10 px-4">
              {isInternal ? (
                <>
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No teammates found</p>
                  <p className="text-xs text-muted-foreground">Invite team members to your company to start collaborating.</p>
                </>
              ) : (
                <>
                  <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No external contacts yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Invite partners, customers, or vendors to the platform to start messaging them.
                  </p>
                  <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
                    <UserPlus className="h-3.5 w-3.5" /> Invite Someone
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Platform users */}
              {filteredUsers.length > 0 && (
                <>
                  {!isInternal && filteredCrmContacts.length > 0 && (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-2 pb-1">
                      Platform Users
                    </p>
                  )}
                  {filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => {
                        onSelectUser({
                          user_id: user.user_id,
                          full_name: user.full_name || user.company_name || "Unknown",
                          company_name: user.company_name || "",
                        });
                        onOpenChange(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.full_name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isInternal
                            ? user.role || "Team Member"
                            : user.company_name || "No company"}
                          {!isInternal && user.role && ` · ${user.role}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isInternal && (
                          <Badge variant="secondary" className="text-[10px]">
                            Teammate
                          </Badge>
                        )}
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* CRM Contacts (external only) */}
              {filteredCrmContacts.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">
                    CRM Contacts
                  </p>
                  {filteredCrmContacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {contact.full_name || "Unnamed Contact"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.company_name || "No company"}
                          {contact.email && ` · ${contact.email}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          <Building2 className="h-2.5 w-2.5 mr-1" />
                          CRM
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
