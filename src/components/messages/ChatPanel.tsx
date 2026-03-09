import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string | null;
  attachments: any[];
  created_at: string;
}

interface ChatPanelProps {
  conversationId: string | null;
  otherName: string;
  currentUserId: string;
  currentUserName: string;
  messages: Message[];
  onSend: (content: string, attachments: any[]) => Promise<void>;
  loading: boolean;
}

export function ChatPanel({ conversationId, otherName, currentUserId, currentUserName, messages, onSend, loading }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || !conversationId) return;
    setSending(true);
    try {
      await onSend(draft.trim(), []);
      setDraft("");
    } catch {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    setUploading(true);
    try {
      const path = `${conversationId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(path);

      // Since bucket is private, use signed URL
      const { data: signedData } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

      const url = signedData?.signedUrl || urlData.publicUrl;
      await onSend(file.name, [{ name: file.name, url, type: file.type }]);
    } catch {
      toast.error("Failed to upload file");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select a conversation or start a new one
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">{otherName}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              senderName={msg.sender_name}
              createdAt={msg.created_at}
              isOwn={msg.sender_id === currentUserId}
              attachments={Array.isArray(msg.attachments) ? msg.attachments : []}
            />
          ))
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 bg-accent hover:bg-accent/90"
          disabled={!draft.trim() || sending}
          onClick={handleSend}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
