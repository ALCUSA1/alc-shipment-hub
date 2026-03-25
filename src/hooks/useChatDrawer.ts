import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationScope } from "@/components/messages/ConversationList";

export interface ConversationItem {
  id: string;
  otherUserId: string;
  otherName: string;
  otherCompany?: string;
  otherEmail?: string;
  otherRole?: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
  scope: ConversationScope;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  title: string;
  hasConversation: boolean;
  conversationId?: string;
}

export function useChatDrawer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<ConversationScope>("internal");

  const { data: profile } = useQuery({
    queryKey: ["msg-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name, email")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const currentUserName = profile?.full_name || profile?.company_name || "Me";
  const currentCompanyName = profile?.company_name || "";

  // Fetch teammate user IDs via company_members table
  const { data: teammateData } = useQuery({
    queryKey: ["teammate-data", user?.id],
    queryFn: async () => {
      // Get current user's company IDs
      const { data: myMemberships } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (!myMemberships?.length) return { userIds: [] as string[], companyIds: [] as string[] };

      const companyIds = myMemberships.map((m) => m.company_id);

      // Get all active members in those companies
      const { data: coMembers } = await supabase
        .from("company_members")
        .select("user_id, role, title")
        .in("company_id", companyIds)
        .eq("is_active", true);

      const ids = [...new Set((coMembers || []).map((m) => m.user_id).filter((id) => id !== user!.id))];
      return { userIds: ids, companyIds, memberDetails: coMembers || [] };
    },
    enabled: !!user,
  });

  const teammateUserIds = teammateData?.userIds || [];

  // Fetch full team member profiles
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-messaging", teammateUserIds],
    queryFn: async () => {
      if (!teammateUserIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, company_name")
        .in("user_id", teammateUserIds);
      
      const memberDetails = teammateData?.memberDetails || [];
      
      return (profiles || []).map(p => {
        const memberInfo = memberDetails.find((m: any) => m.user_id === p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name || "Unnamed User",
          email: p.email || "",
          role: memberInfo?.role || "viewer",
          title: memberInfo?.title || "",
          hasConversation: false,
          conversationId: undefined,
        } as TeamMember;
      });
    },
    enabled: teammateUserIds.length > 0,
  });

  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data: participations, error: pErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);
      if (pErr) throw pErr;
      if (!participations?.length) return [];

      const convIds = participations.map((p) => p.conversation_id);
      const lastReadMap: Record<string, string> = {};
      participations.forEach((p) => {
        lastReadMap[p.conversation_id] = p.last_read_at || "";
      });

      const { data: convRows } = await supabase
        .from("conversations")
        .select("id, scope")
        .in("id", convIds);

      const scopeMap: Record<string, ConversationScope> = {};
      (convRows || []).forEach((c) => {
        scopeMap[c.id] = (c.scope === "internal" ? "internal" : "external") as ConversationScope;
      });

      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, company_name")
        .in("conversation_id", convIds);

      const otherUserIds = [...new Set(
        (allParticipants || [])
          .filter((p) => p.user_id !== user!.id)
          .map((p) => p.user_id)
      )];

      let profileMap: Record<string, { name: string; company: string; email: string }> = {};
      if (otherUserIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name, email")
          .in("user_id", otherUserIds);
        (profiles || []).forEach((p) => {
          profileMap[p.user_id] = {
            name: p.full_name || p.company_name || "Unknown",
            company: p.company_name || "",
            email: p.email || "",
          };
        });
      }

      const { data: latestMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const convItems: ConversationItem[] = convIds.map((cid) => {
        const otherParticipant = (allParticipants || []).find(
          (p) => p.conversation_id === cid && p.user_id !== user!.id
        );
        const otherProfile = otherParticipant ? profileMap[otherParticipant.user_id] : null;
        const otherName = otherProfile?.name || otherParticipant?.company_name || "Unknown";
        const latestMsg = (latestMessages || []).find((m) => m.conversation_id === cid);
        const lastRead = lastReadMap[cid];
        const unread = latestMsg ? new Date(latestMsg.created_at) > new Date(lastRead) : false;

        // Re-classify scope based on actual membership
        const otherUserId = otherParticipant?.user_id || "";
        const isTeammate = teammateUserIds.includes(otherUserId);
        const correctScope: ConversationScope = isTeammate ? "internal" : "external";

        return {
          id: cid,
          otherUserId,
          otherName,
          otherCompany: otherProfile?.company || "",
          otherEmail: otherProfile?.email || "",
          lastMessage: latestMsg?.content || null,
          lastMessageAt: latestMsg?.created_at || null,
          unread,
          scope: correctScope,
        };
      });

      convItems.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      return convItems;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Enrich team members with conversation data
  const enrichedTeamMembers = useMemo(() => {
    return teamMembers.map(tm => {
      const conv = conversations.find(c => c.otherUserId === tm.user_id && c.scope === "internal");
      return {
        ...tm,
        hasConversation: !!conv,
        conversationId: conv?.id,
      };
    });
  }, [teamMembers, conversations]);

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeConversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, queryClient, user?.id]);

  useEffect(() => {
    if (!activeConversationId || !user) return;
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeConversationId)
      .eq("user_id", user.id)
      .then(() => { queryClient.invalidateQueries({ queryKey: ["conversations", user.id] }); });
  }, [activeConversationId, user, queryClient]);

  const handleSend = useCallback(
    async (content: string, attachments: any[]) => {
      if (!activeConversationId || !user) return;
      await supabase.from("messages").insert({ conversation_id: activeConversationId, sender_id: user.id, sender_name: currentUserName, content, attachments });
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
    },
    [activeConversationId, user, currentUserName, queryClient]
  );

  const handleSelectUser = useCallback(
    async (selectedUser: { user_id: string; full_name: string; company_name: string }) => {
      if (!user) return;
      const isTeammate = teammateUserIds.includes(selectedUser.user_id);
      const scope: ConversationScope = isTeammate ? "internal" : "external";

      // Check for existing conversation
      const { data: myParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myParticipations?.length) {
        const convIds = myParticipations.map((p) => p.conversation_id);
        const { data: otherParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", selectedUser.user_id)
          .in("conversation_id", convIds);

        if (otherParticipations?.length) {
          setActiveScope(scope);
          setActiveConversationId(otherParticipations[0].conversation_id);
          return;
        }
      }

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct", scope })
        .select("id")
        .single();
      if (convErr || !conv) return;

      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id, company_name: currentCompanyName || currentUserName },
        { conversation_id: conv.id, user_id: selectedUser.user_id, company_name: selectedUser.company_name },
      ]);

      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      setActiveScope(scope);
      setActiveConversationId(conv.id);
    },
    [user, teammateUserIds, currentCompanyName, currentUserName, queryClient]
  );

  const unreadCount = conversations.filter((c) => c.unread).length;

  const activeConv = conversations.find((c) => c.id === activeConversationId) as ConversationItem | undefined;

  return {
    user,
    conversations,
    convsLoading,
    messages: messages.map((m) => ({ ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] })),
    msgsLoading,
    activeConversationId,
    setActiveConversationId,
    activeScope,
    setActiveScope,
    activeConv,
    currentUserName,
    currentCompanyName,
    unreadCount,
    handleSend,
    handleSelectUser,
    teammateUserIds,
    teamMembers: enrichedTeamMembers,
  };
}
