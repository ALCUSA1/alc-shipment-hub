import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UseMessageNotificationsOptions {
  userId: string | undefined;
  activeConversationId: string | null;
  currentUserName: string;
}

export function useMessageNotifications({ userId, activeConversationId, currentUserName }: UseMessageNotificationsOptions) {
  const navigate = useNavigate();
  const activeConvRef = useRef(activeConversationId);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!userId) return;

    const channelName = `global-new-messages-${userId}`;
    // Remove any existing channel with this name to prevent duplicate subscription errors
    const existing = supabase.getChannels().find(ch => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;

          // Ignore own messages
          if (msg.sender_id === userId) return;

          // If user is viewing this conversation, skip toast
          if (activeConvRef.current === msg.conversation_id) return;

          // Check if user is a participant
          const { data: participation } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("conversation_id", msg.conversation_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (!participation) return;

          const senderName = msg.sender_name || "Someone";
          const preview = msg.content?.slice(0, 80) || "Sent an attachment";

          toast(senderName, {
            description: preview,
            action: {
              label: "Open",
              onClick: () => navigate(`/dashboard/messages?conv=${msg.conversation_id}`),
            },
            duration: 5000,
          });

          // Play notification sound
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRl9vT19teleXBldGVyZQBkYXRhAA==");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, navigate]);
}
