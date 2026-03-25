import { useState } from "react";
import { MessageSquare, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";
import { CompanyDirectoryDialog } from "./CompanyDirectoryDialog";
import { useChatDrawer } from "@/hooks/useChatDrawer";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");

  const {
    user,
    conversations,
    convsLoading,
    messages,
    msgsLoading,
    activeConversationId,
    setActiveConversationId,
    activeScope,
    setActiveScope,
    activeConv,
    currentUserName,
    currentCompanyName,
    handleSend,
    handleSelectUser,
  } = useChatDrawer();

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setView("chat");
  };

  const handleBack = () => {
    setActiveConversationId(null);
    setView("list");
  };


  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[380px] max-w-[calc(100vw-3rem)] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {view === "chat" && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">Messages</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {view === "list" ? (
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              activeScope={activeScope}
              onScopeChange={setActiveScope}
              onSelect={handleSelectConversation}
              onNewChat={() => setDirectoryOpen(true)}
              loading={convsLoading}
            />
          ) : (
            <ChatPanel
              conversationId={activeConversationId}
              otherName={activeConv?.otherName || ""}
              otherCompany={activeConv?.otherCompany || ""}
              scope={activeConv?.scope}
              currentUserId={user?.id || ""}
              currentUserName={currentUserName}
              messages={messages}
              onSend={handleSend}
              loading={msgsLoading}
            />
          )}
        </div>
      </div>

      <CompanyDirectoryDialog
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
        onSelectUser={handleSelectUser}
        currentUserId={user?.id || ""}
        currentCompanyName={currentCompanyName}
        scope={activeScope}
        teammateUserIds={teammateUserIds}
      />
    </>
  );
}

export function ChatFloatingButton({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="relative h-9 w-9"
      onClick={onClick}
      title="Messages"
    >
      <MessageSquare className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none pointer-events-none"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
