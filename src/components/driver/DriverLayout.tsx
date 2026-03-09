import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { label: "My Jobs", icon: ClipboardList, href: "/driver" },
  { label: "Account", icon: User, href: "/driver/account" },
];

interface DriverLayoutProps {
  children: ReactNode;
}

export function DriverLayout({ children }: DriverLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-foreground text-lg">Driver Portal</span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </header>

      {/* Main content */}
      <main className="px-4 py-4 max-w-lg mx-auto">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around py-2 safe-area-bottom">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/driver"
              ? location.pathname === "/driver"
              : location.pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[64px]",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
