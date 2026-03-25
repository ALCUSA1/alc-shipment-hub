import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, Plus, Users, Globe, Clock, MessageSquare, ChevronRight, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/hooks/useChatDrawer";

export type ConversationScope = "internal" | "external";

export interface ConversationItem {
  id: string;
  otherUserId: string;
  otherName: string;
  otherCompany?: string;
  otherEmail?: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
  scope: ConversationScope;
}

type SidebarView = "team" | "external" | "recent";

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId: string | null;
  activeScope: ConversationScope;
  onScopeChange: (scope: ConversationScope) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onSelectTeamMember: (member: TeamMember) => void;
  loading: boolean;
  teamMembers: TeamMember[];
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function roleBadge(role: string) {
  const labels: Record<string, string> = {
    admin: "Admin",
    operations_manager: "Operations",
    finance_user: "Finance",
    sales_manager: "Sales",
    pricing_manager: "Pricing",
    viewer: "Viewer",
  };
  return labels[role] || role;
}

export function ConversationList({ conversations, activeId, activeScope, onScopeChange, onSelect, onNewChat, onSelectTeamMember, loading, teamMembers }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<SidebarView>("team");

  const internalConvs = conversations.filter(c => c.scope === "internal");
  const externalConvs = conversations.filter(c => c.scope === "external");
  const internalUnread = internalConvs.filter(c => c.unread).length;
  const externalUnread = externalConvs.filter(c => c.unread).length;
  const totalUnread = conversations.filter(c => c.unread).length;

  // Filter team members by search
  const filteredTeamMembers = useMemo(() => {
    if (!search) return teamMembers;
    const q = search.toLowerCase();
    return teamMembers.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      (m.title || "").toLowerCase().includes(q)
    );
  }, [teamMembers, search]);

  // Filter conversations by search
  const filteredConvs = useMemo(() => {
    const source = view === "team" ? internalConvs : view === "external" ? externalConvs : conversations;
    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter(c =>
      c.otherName.toLowerCase().includes(q) ||
      (c.otherCompany || "").toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  }, [conversations, internalConvs, externalConvs, view, search]);

  const handleViewChange = (v: SidebarView) => {
    setView(v);
    if (v === "team") onScopeChange("internal");
    else if (v === "external") onScopeChange("external");
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-secondary/20">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-base">Messages</h2>
          <Button size="icon" variant="ghost" onClick={onNewChat} className="h-8 w-8" title="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs: Team / External / Recent */}
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {([
            { key: "team" as SidebarView, icon: Users, label: "Team", count: internalUnread },
            { key: "external" as SidebarView, icon: Globe, label: "External", count: externalUnread },
            { key: "recent" as SidebarView, icon: Clock, label: "Recent", count: totalUnread },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => handleViewChange(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-all",
                view === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="default" className="h-4 min-w-4 px-1 text-[9px] leading-none ml-0.5">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={view === "team" ? "Search team members…" : view === "external" ? "Search external contacts…" : "Search all chats…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
        ) : (
          <>
            {/* TEAM VIEW: Show team members directory + team conversations */}
            {view === "team" && (
              <div>
                {/* Team Members Directory */}
                {filteredTeamMembers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1.5">
                      Team Members ({filteredTeamMembers.length})
                    </p>
                    {filteredTeamMembers.map(member => (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          if (member.conversationId) {
                            onSelect(member.conversationId);
                          } else {
                            onSelectTeamMember(member);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2.5 hover:bg-secondary/80",
                          member.conversationId && activeId === member.conversationId ? "bg-accent/10" : ""
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-[10px] font-semibold bg-accent/10 text-accent">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{member.full_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground truncate">
                              {member.title || roleBadge(member.role)}
                            </span>
                          </div>
                        </div>
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Team Conversations with messages */}
                {filteredConvs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1.5">
                      Recent Team Chats
                    </p>
                    {filteredConvs.map(conv => (
                      <ConversationRow key={conv.id} conv={conv} activeId={activeId} onSelect={onSelect} showBadge={false} />
                    ))}
                  </div>
                )}

                {filteredTeamMembers.length === 0 && filteredConvs.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">No teammates found</p>
                    <p className="text-xs text-muted-foreground">Team members from your organization will appear here automatically.</p>
                  </div>
                )}
              </div>
            )}

            {/* EXTERNAL VIEW */}
            {view === "external" && (
              <div>
                {filteredConvs.length > 0 ? (
                  <>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1.5">
                      External Contacts
                    </p>
                    {filteredConvs.map(conv => (
                      <ConversationRow key={conv.id} conv={conv} activeId={activeId} onSelect={onSelect} showBadge showCompany />
                    ))}
                  </>
                ) : (
                  <div className="text-center py-10 px-4">
                    <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">No external contacts</p>
                    <p className="text-xs text-muted-foreground mb-4">Start a conversation with customers, vendors, or partners.</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={onNewChat}>
                      <Plus className="h-3.5 w-3.5" /> Add Contact
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* RECENT VIEW */}
            {view === "recent" && (
              <div>
                {filteredConvs.length > 0 ? (
                  filteredConvs.map(conv => (
                    <ConversationRow key={conv.id} conv={conv} activeId={activeId} onSelect={onSelect} showBadge showCompany={conv.scope === "external"} />
                  ))
                ) : (
                  <div className="text-center py-10 px-4">
                    <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">No recent chats</p>
                    <p className="text-xs text-muted-foreground">Start a new conversation to get going.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

/* Conversation Row */
function ConversationRow({ conv, activeId, onSelect, showBadge, showCompany }: {
  conv: ConversationItem;
  activeId: string | null;
  onSelect: (id: string) => void;
  showBadge?: boolean;
  showCompany?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={cn(
        "w-full text-left px-3 py-3 transition-colors flex items-start gap-2.5",
        activeId === conv.id ? "bg-accent/10 border-l-2 border-accent" : "hover:bg-secondary/80 border-l-2 border-transparent"
      )}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback className={cn(
          "text-[11px] font-semibold",
          conv.scope === "internal" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
        )}>
          {getInitials(conv.otherName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("text-sm truncate", conv.unread ? "font-bold text-foreground" : "font-medium text-foreground")}>
              {conv.otherName}
            </span>
            {showBadge && (
              <Badge variant="secondary" className={cn("text-[9px] px-1 py-0 shrink-0", conv.scope === "external" ? "bg-muted" : "")}>
                {conv.scope === "internal" ? "Team" : "External"}
              </Badge>
            )}
          </div>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {format(new Date(conv.lastMessageAt), "MMM d")}
            </span>
          )}
        </div>
        {showCompany && conv.otherCompany && (
          <p className="text-[10px] text-muted-foreground truncate">{conv.otherCompany}</p>
        )}
        {conv.lastMessage && (
          <p className={cn("text-xs truncate mt-0.5", conv.unread ? "text-foreground font-medium" : "text-muted-foreground")}>
            {conv.lastMessage}
          </p>
        )}
      </div>
      {conv.unread && (
        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5" />
      )}
    </button>
  );
}
