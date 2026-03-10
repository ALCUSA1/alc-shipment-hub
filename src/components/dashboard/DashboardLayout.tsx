import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatDrawer, ChatFloatingButton } from "@/components/messages/ChatDrawer";
import { useChatDrawer } from "@/hooks/useChatDrawer";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const { unreadCount } = useChatDrawer();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-1">
              <ChatFloatingButton unreadCount={unreadCount} onClick={() => setChatOpen(true)} />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-6 bg-secondary/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </SidebarProvider>
  );
}
