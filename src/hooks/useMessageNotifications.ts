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

    const channel = supabase
      .channel("global-new-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;

          // Ignore own messages
          if (msg.sender_id === userId) return;

          // If user is viewing this conversation, skip toast (message appends live)
          if (activeConvRef.current === msg.conversation_id) return;

          // Check if user is a participant
          const { data: participation } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("conversation_id", msg.conversation_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (!participation) return;

          // Determine scope
          const { data: conv } = await supabase
            .from("conversations")
            .select("scope")
            .eq("id", msg.conversation_id)
            .maybeSingle();

          const scopeLabel = conv?.scope === "internal" ? "Team" : "External";
          const senderName = msg.sender_name || "Someone";
          const preview = msg.content?.slice(0, 80) || "Sent an attachment";

          toast(senderName, {
            description: preview,
            action: {
              label: "Open",
              onClick: () => navigate(`/dashboard/messages?conv=${msg.conversation_id}`),
            },
            duration: 5000,
            className: "cursor-pointer",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, navigate]);
}
