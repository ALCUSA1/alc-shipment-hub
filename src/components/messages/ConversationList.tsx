import { format } from "date-fns";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

export interface ConversationItem {
  id: string;
  otherName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  loading: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, onNewChat, loading }: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Messages</h2>
          <Button size="icon" variant="ghost" onClick={onNewChat} className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-3 py-3 border-b border-border transition-colors ${
                activeId === conv.id ? "bg-accent/10" : "hover:bg-secondary"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${conv.unread ? "font-semibold text-foreground" : "text-foreground"}`}>
                  {conv.otherName}
                </span>
                {conv.lastMessageAt && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {format(new Date(conv.lastMessageAt), "MMM d")}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className={`text-xs truncate mt-0.5 ${conv.unread ? "text-foreground" : "text-muted-foreground"}`}>
                  {conv.lastMessage}
                </p>
              )}
              {conv.unread && (
                <span className="inline-block w-2 h-2 rounded-full bg-accent mt-1" />
              )}
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
