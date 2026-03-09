import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, FileText, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import alcLogo from "@/assets/alc-logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/trucking" },
  { label: "Available Orders", icon: Package, href: "/trucking/orders" },
  { label: "My Quotes", icon: FileText, href: "/trucking/quotes" },
  { label: "Account", icon: User, href: "/trucking/account" },
];

export function TruckingSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card flex flex-col">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
        <span className="font-semibold text-foreground">Carrier Portal</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/trucking" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
