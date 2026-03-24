import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatDrawer, ChatFloatingButton } from "@/components/messages/ChatDrawer";
import { useChatDrawer } from "@/hooks/useChatDrawer";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/shipments": "Shipments",
  "/dashboard/quotes": "Requests",
  "/dashboard/crm": "Customers",
  "/dashboard/partners": "Partners",
  "/dashboard/accounting": "Financials",
  "/dashboard/analytics": "Analytics",
  "/dashboard/rate-trends": "Rate Trends",
  "/dashboard/pipeline": "Pipeline",
  "/dashboard/opportunities": "Opportunities",
  "/dashboard/earnings": "Earnings",
  "/dashboard/notifications": "Notifications",
  "/dashboard/account": "Account",
  "/dashboard/team": "Team",
  "/dashboard/messages": "Messages",
  "/dashboard/spark": "Spark",
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const { unreadCount } = useChatDrawer();
  const { user } = useAuth();

  const pageTitle = routeTitles[location.pathname] || 
    (location.pathname.includes("/shipments/") ? "Shipment Workspace" : "");

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* ── Top Header Bar ── */}
          <header className="h-14 flex items-center justify-between border-b px-4 gap-4 bg-background sticky top-0 z-30">
            {/* Left: trigger + page title */}
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              {pageTitle && (
                <h2 className="text-sm font-semibold text-foreground truncate hidden sm:block">{pageTitle}</h2>
              )}
            </div>

            {/* Center: Global Search */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search shipments, customers, partners…"
                  className="pl-9 h-9 bg-secondary/60 border-transparent focus:border-border text-sm"
                />
              </div>
            </div>

            {/* Right: New Shipment CTA + Notifications + Chat + Avatar */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="electric" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/dashboard/shipments/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Shipment
                </Link>
              </Button>
              <Button variant="electric" size="icon" asChild className="sm:hidden h-8 w-8">
                <Link to="/dashboard/shipments/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              <ChatFloatingButton unreadCount={unreadCount} onClick={() => setChatOpen(true)} />
              <NotificationBell />
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="text-[10px] font-medium bg-secondary text-muted-foreground">{initials}</AvatarFallback>
              </Avatar>
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
