import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { CompanyDirectoryDialog } from "@/components/messages/CompanyDirectoryDialog";
import { useChatDrawer } from "@/hooks/useChatDrawer";

export default function Messages() {
  const [directoryOpen, setDirectoryOpen] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background rounded-lg border border-border overflow-hidden">
        <div className="w-72 shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            activeScope={activeScope}
            onScopeChange={setActiveScope}
            onSelect={setActiveConversationId}
            onNewChat={() => setDirectoryOpen(true)}
            loading={convsLoading}
          />
        </div>
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
      </div>
      <CompanyDirectoryDialog
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
        onSelectUser={handleSelectUser}
        currentUserId={user?.id || ""}
        currentCompanyName={currentCompanyName}
        scope={activeScope}
      />
    </DashboardLayout>
  );
}
