import {
  LayoutDashboard, Users, Activity, DollarSign, Server,
  ArrowLeft, LogOut, Shield, Search, ChevronRight, Package
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Shipments", url: "/admin/shipments", icon: Package },
  { title: "Customer Lookup", url: "/admin/customers", icon: Search },
  { title: "Users & Roles", url: "/admin/users", icon: Users },
  { title: "Activity Feed", url: "/admin/activity", icon: Activity },
  { title: "Financials", url: "/admin/financials", icon: DollarSign },
  { title: "System Health", url: "/admin/system", icon: Server },
];

export function AdminSidebar({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <div className="h-screen w-64 flex flex-col bg-[hsl(220,18%,9%)] border-r border-[hsl(220,15%,13%)]">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-[hsl(220,15%,13%)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/15">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm text-white tracking-tight">Admin Console</span>
        </div>
      </div>

      {/* Search placeholder */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,16%)] text-[hsl(220,10%,35%)] text-xs">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-auto text-[10px] bg-[hsl(220,15%,16%)] px-1.5 py-0.5 rounded">⌘K</kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(220,10%,35%)] px-3 pt-2 pb-2">
          Platform
        </p>
        {navItems.map((item) => {
          const active = isActive(item.url, item.end);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                active
                  ? "bg-[hsl(220,15%,15%)] text-white font-medium"
                  : "text-[hsl(220,10%,50%)] hover:text-white hover:bg-[hsl(220,15%,12%)]"
              )}
            >
              <item.icon className={cn("h-4 w-4", active ? "text-red-400" : "text-[hsl(220,10%,40%)] group-hover:text-[hsl(220,10%,60%)]")} />
              <span>{item.title}</span>
              {active && <ChevronRight className="h-3 w-3 ml-auto text-[hsl(220,10%,40%)]" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(220,15%,13%)] space-y-1">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(220,10%,50%)] hover:text-white hover:bg-[hsl(220,15%,12%)] transition-colors w-full"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(220,10%,50%)] hover:text-red-400 hover:bg-red-400/5 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
