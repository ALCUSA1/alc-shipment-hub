import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConversationList, ConversationItem } from "@/components/messages/ConversationList";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { CompanyDirectoryDialog } from "@/components/messages/CompanyDirectoryDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Get current user profile
  const { data: profile } = useQuery({
    queryKey: ["msg-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const currentUserName = profile?.full_name || profile?.company_name || "Me";

  // Fetch conversations with last message
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      // Get participations for current user
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

      // Get other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, company_name")
        .in("conversation_id", convIds);

      // Get latest message per conversation
      const { data: latestMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      // Build conversation items
      const convItems: ConversationItem[] = convIds.map((cid) => {
        const otherParticipant = (allParticipants || []).find(
          (p) => p.conversation_id === cid && p.user_id !== user!.id
        );
        const latestMsg = (latestMessages || []).find((m) => m.conversation_id === cid);
        const lastRead = lastReadMap[cid];
        const unread = latestMsg ? new Date(latestMsg.created_at) > new Date(lastRead) : false;

        return {
          id: cid,
          otherName: otherParticipant?.company_name || "Unknown",
          lastMessage: latestMsg?.content || null,
          lastMessageAt: latestMsg?.created_at || null,
          unread,
        };
      });

      // Sort by last message time
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

  // Fetch messages for active conversation
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

  // Realtime subscription for messages
  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, queryClient, user?.id]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeConversationId)
      .eq("user_id", user.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      });
  }, [activeConversationId, user, queryClient]);

  const handleSend = useCallback(
    async (content: string, attachments: any[]) => {
      if (!activeConversationId || !user) return;
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        sender_name: currentUserName,
        content,
        attachments,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
    },
    [activeConversationId, user, currentUserName, queryClient]
  );

  const handleSelectCompany = useCallback(
    async (company: { id: string; company_name: string; company_type: string; user_id: string }) => {
      if (!user) return;

      // Check if a conversation already exists between these two users
      const { data: myParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myParticipations?.length) {
        const convIds = myParticipations.map((p) => p.conversation_id);
        const { data: otherParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", company.user_id)
          .in("conversation_id", convIds);

        if (otherParticipations?.length) {
          setActiveConversationId(otherParticipations[0].conversation_id);
          return;
        }
      }

      // Create new conversation
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "direct" })
        .select("id")
        .single();
      if (convErr || !conv) return;

      // Add both participants
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id, company_name: profile?.company_name || currentUserName },
        { conversation_id: conv.id, user_id: company.user_id, company_name: company.company_name },
      ]);

      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      setActiveConversationId(conv.id);
    },
    [user, profile, currentUserName, queryClient]
  );

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background rounded-lg border border-border overflow-hidden">
        <div className="w-72 shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onNewChat={() => setDirectoryOpen(true)}
            loading={convsLoading}
          />
        </div>
        <ChatPanel
          conversationId={activeConversationId}
          otherName={activeConv?.otherName || ""}
          currentUserId={user?.id || ""}
          currentUserName={currentUserName}
          messages={messages.map((m) => ({ ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] }))}
          onSend={handleSend}
          loading={msgsLoading}
        />
      </div>
      <CompanyDirectoryDialog
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
        onSelectCompany={handleSelectCompany}
        currentUserId={user?.id || ""}
      />
    </DashboardLayout>
  );
}
