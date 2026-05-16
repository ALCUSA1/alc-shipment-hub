import { ReactNode, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminAlertsBell } from "./AdminAlertsBell";
import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveSection } from "./adminNav";

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const section = getActiveSection(location.pathname);
  const showTabs = section.tabs.length > 0;

  const isTabActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div
        className={cn(
          "relative z-20 transition-all duration-300 shrink-0",
          sidebarOpen ? "w-60" : "w-0 overflow-hidden"
        )}
      >
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-foreground">{section.label}</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-secondary px-2 py-0.5 rounded">
              Admin
            </span>
          </div>
          <AdminAlertsBell />
        </header>

        {showTabs && (
          <div className="border-b border-border bg-card px-6">
            <nav className="flex gap-1 overflow-x-auto -mb-px">
              {section.tabs.map((t) => {
                const active = isTabActive(t.url);
                return (
                  <NavLink
                    key={t.url}
                    to={t.url}
                    className={cn(
                      "px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
                      active
                        ? "border-primary text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    {t.title}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
