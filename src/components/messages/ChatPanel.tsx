import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, Users, Globe, Phone, Video, MoreVertical, Info, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import type { ConversationScope } from "./ConversationList";

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
  otherCompany?: string;
  otherEmail?: string;
  scope?: ConversationScope;
  currentUserId: string;
  currentUserName: string;
  messages: Message[];
  onSend: (content: string, attachments: any[]) => Promise<void>;
  loading: boolean;
  showProfile: boolean;
  onToggleProfile: () => void;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function ChatPanel({ conversationId, otherName, otherCompany, otherEmail, scope, currentUserId, currentUserName, messages, onSend, loading, showProfile, onToggleProfile }: ChatPanelProps) {
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
      const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: signedData } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = signedData?.signedUrl || "";
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
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Welcome to Messages</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select a team member or contact from the sidebar to start a conversation, or create a new chat.
        </p>
      </div>
    );
  }

  const isInternal = scope === "internal";

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background shrink-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={`text-[11px] font-semibold ${isInternal ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
            {getInitials(otherName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{otherName}</h3>
            <Badge variant="secondary" className="text-[9px] shrink-0 flex items-center gap-0.5">
              {isInternal ? (
                <><Users className="h-2.5 w-2.5" /> Team</>
              ) : (
                <><Globe className="h-2.5 w-2.5" /> External</>
              )}
            </Badge>
          </div>
          {!isInternal && otherCompany && (
            <p className="text-xs text-muted-foreground truncate">{otherCompany}</p>
          )}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onToggleProfile} title="Contact details">
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground mb-1">No messages yet</p>
            <p className="text-xs text-muted-foreground">Send a message to start the conversation.</p>
          </div>
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
      <div className="border-t border-border p-3 flex items-end gap-2 bg-background shrink-0">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
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
        <Button size="icon" className="h-9 w-9 shrink-0 bg-accent hover:bg-accent/90" disabled={!draft.trim() || sending} onClick={handleSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/* Profile / Details Side Panel */
export function ChatProfilePanel({ name, company, email, scope, onClose }: {
  name: string;
  company?: string;
  email?: string;
  scope?: ConversationScope;
  onClose: () => void;
}) {
  const isInternal = scope === "internal";

  return (
    <div className="w-64 shrink-0 border-l border-border bg-background flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Profile</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="p-4 flex flex-col items-center text-center">
        <Avatar className="h-16 w-16 mb-3">
          <AvatarFallback className={`text-lg font-bold ${isInternal ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <h4 className="text-sm font-semibold text-foreground">{name}</h4>
        <Badge variant="secondary" className="text-[9px] mt-1.5 flex items-center gap-0.5">
          {isInternal ? <><Users className="h-2.5 w-2.5" /> Team Member</> : <><Globe className="h-2.5 w-2.5" /> External</>}
        </Badge>
      </div>
      <Separator />
      <div className="p-4 space-y-3">
        {email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        )}
        {company && (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{company}</span>
          </div>
        )}
      </div>
    </div>
  );
}
