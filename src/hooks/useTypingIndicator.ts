import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TYPING_TIMEOUT = 3000; // ms before typing indicator disappears
const TYPING_DEBOUNCE = 1000; // ms debounce for sending typing events

interface TypingUser {
  userId: string;
  userName: string;
}

export function useTypingIndicator(conversationId: string | null, currentUserId: string, currentUserName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastSentRef = useRef(0);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Subscribe to typing presence
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId]);

  // Send typing event (debounced)
  const sendTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_DEBOUNCE) return;
    lastSentRef.current = now;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ typing: true, userName: currentUserName });

        // Auto-stop typing after timeout
        if (timeoutsRef.current[conversationId]) {
          clearTimeout(timeoutsRef.current[conversationId]);
        }
        timeoutsRef.current[conversationId] = setTimeout(async () => {
          await channel.track({ typing: false, userName: currentUserName });
        }, TYPING_TIMEOUT);
      }
    });
  }, [conversationId, currentUserId, currentUserName]);

  // Clear typing on send
  const clearTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ typing: false, userName: currentUserName });
      }
    });
    if (timeoutsRef.current[conversationId]) {
      clearTimeout(timeoutsRef.current[conversationId]);
    }
  }, [conversationId, currentUserId, currentUserName]);

  const typingText = typingUsers.length === 0
    ? null
    : typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing…`
        : `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing…`;

  return { typingUsers, typingText, sendTyping, clearTyping };
}
