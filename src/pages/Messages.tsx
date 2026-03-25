import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatPanel, ChatProfilePanel } from "@/components/messages/ChatPanel";
import { CompanyDirectoryDialog } from "@/components/messages/CompanyDirectoryDialog";
import { useChatDrawer } from "@/hooks/useChatDrawer";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";

export default function Messages() {
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchParams] = useSearchParams();

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
    teammateUserIds,
    teamMembers,
  } = useChatDrawer();

  // Real-time toast notifications for messages from other conversations
  useMessageNotifications({
    userId: user?.id,
    activeConversationId,
    currentUserName,
  });

  // Open conversation from URL param (e.g. from toast notification click)
  useEffect(() => {
    const convParam = searchParams.get("conv");
    if (convParam && convParam !== activeConversationId) {
      setActiveConversationId(convParam);
    }
  }, [searchParams]);

  const handleSelectTeamMember = (member: { user_id: string; full_name: string; email: string }) => {
    handleSelectUser({
      user_id: member.user_id,
      full_name: member.full_name,
      company_name: currentCompanyName,
    });
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Left Sidebar */}
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            activeScope={activeScope}
            onScopeChange={setActiveScope}
            onSelect={setActiveConversationId}
            onNewChat={() => setDirectoryOpen(true)}
            onSelectTeamMember={handleSelectTeamMember}
            loading={convsLoading}
            teamMembers={teamMembers}
          />
        </div>

        {/* Center Chat */}
        <ChatPanel
          conversationId={activeConversationId}
          otherName={activeConv?.otherName || ""}
          otherCompany={activeConv?.otherCompany || ""}
          otherEmail={activeConv?.otherEmail || ""}
          scope={activeConv?.scope}
          currentUserId={user?.id || ""}
          currentUserName={currentUserName}
          messages={messages}
          onSend={handleSend}
          loading={msgsLoading}
          showProfile={showProfile}
          onToggleProfile={() => setShowProfile(!showProfile)}
        />

        {/* Right Profile Panel */}
        {showProfile && activeConv && (
          <ChatProfilePanel
            name={activeConv.otherName}
            company={activeConv.otherCompany}
            email={activeConv.otherEmail}
            scope={activeConv.scope}
            onClose={() => setShowProfile(false)}
          />
        )}
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
    </DashboardLayout>
  );
}
