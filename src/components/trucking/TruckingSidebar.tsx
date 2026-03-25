import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, FileText, User, LogOut, Users, Calendar, MessageSquare, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import alcLogo from "@/assets/alc-logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/trucking" },
  { label: "Orders", icon: Package, href: "/trucking/orders" },
  { label: "Schedule", icon: Calendar, href: "/trucking/schedule" },
  { label: "Driver Assignments", icon: Users, href: "/trucking/assignments" },
  { label: "Documents", icon: FileText, href: "/trucking/documents" },
  { label: "Messages", icon: MessageSquare, href: "/trucking/messages" },
  { label: "Team", icon: Users, href: "/trucking/team" },
  { label: "Settings", icon: Settings, href: "/trucking/settings" },
  { label: "Account", icon: User, href: "/trucking/account" },
];

interface TruckingSidebarProps {
  onClose?: () => void;
}

export function TruckingSidebar({ onClose }: TruckingSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card flex flex-col">
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <img src={alcLogo} alt="ALC Logo" className="h-8 w-auto" />
          <span className="font-semibold text-foreground">Carrier Portal</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-secondary">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/trucking" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
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
