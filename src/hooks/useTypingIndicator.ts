import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TYPING_TIMEOUT = 3000;
const TYPING_DEBOUNCE = 1000;

interface TypingUser {
  userId: string;
  userName: string;
}

export function useTypingIndicator(conversationId: string | null, currentUserId: string, currentUserName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastSentRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        for (const [key, presences] of Object.entries(state)) {
          if (key === currentUserId) continue;
          const p = (presences as any[])[0];
          if (p?.typing) {
            users.push({ userId: key, userName: p.userName || "Someone" });
          }
        }
        setTypingUsers(users);
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== key));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false, userName: currentUserName });
        }
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId, currentUserName]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_DEBOUNCE) return;
    lastSentRef.current = now;

    channelRef.current.track({ typing: true, userName: currentUserName });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      channelRef.current?.track({ typing: false, userName: currentUserName });
    }, TYPING_TIMEOUT);
  }, [currentUserName]);

  const clearTyping = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    channelRef.current?.track({ typing: false, userName: currentUserName });
  }, [currentUserName]);

  const typingText = typingUsers.length === 0
    ? null
    : typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing…`
        : `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing…`;

  return { typingUsers, typingText, sendTyping, clearTyping };
}
