import {
  LayoutDashboard, Users, Activity, DollarSign, Server,
  ArrowLeft, LogOut, Shield, Search, ChevronRight, Package,
  GitBranch, FileText, Truck, Warehouse, FileCheck,
  TrendingUp, Building2, Handshake, UserCog, Bell, Settings,
  Radio, ShieldCheck, Database, Target, FolderOpen, Mail, BarChart3, CreditCard
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
      { title: "Pipeline", url: "/admin/pipeline", icon: GitBranch },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Quotes", url: "/admin/quotes", icon: FileText },
      { title: "Shipments", url: "/admin/shipments", icon: Package },
      { title: "Trucking", url: "/admin/trucking", icon: Truck },
      { title: "Warehouses", url: "/admin/warehouses", icon: Warehouse },
      { title: "Documents", url: "/admin/documents", icon: FileCheck },
    ],
  },
  {
    label: "Finance & Sales",
    items: [
      { title: "Accounting", url: "/admin/accounting", icon: DollarSign },
      { title: "Rate Trends", url: "/admin/rate-trends", icon: TrendingUp },
      { title: "CRM", url: "/admin/crm", icon: Building2 },
      { title: "Partners", url: "/admin/partners", icon: Handshake },
    ],
  },
  {
    label: "Sales & Marketing",
    items: [
      { title: "Sales Pipeline", url: "/admin/sales-pipeline", icon: Target },
      { title: "Sales Analytics", url: "/admin/sales-analytics", icon: BarChart3 },
      { title: "Email Campaigns", url: "/admin/campaigns", icon: Mail },
      { title: "Materials Library", url: "/admin/materials", icon: FolderOpen },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Users & Roles", url: "/admin/users", icon: Users },
      { title: "Customer Lookup", url: "/admin/customers", icon: Search },
      { title: "Activity Feed", url: "/admin/activity", icon: Activity },
      { title: "Financials", url: "/admin/financials", icon: DollarSign },
      { title: "Compliance", url: "/admin/compliance", icon: ShieldCheck },
      { title: "API & Integrations", url: "/admin/api-health", icon: Radio },
      { title: "System Health", url: "/admin/system", icon: Server },
      { title: "Data Explorer", url: "/admin/data", icon: Database },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Team", url: "/admin/team", icon: UserCog },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
      { title: "Account", url: "/admin/account", icon: Settings },
    ],
  },
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
      <div className="h-14 flex items-center gap-3 px-5 border-b border-[hsl(220,15%,13%)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/15">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm text-white tracking-tight">Admin Console</span>
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,16%)] text-[hsl(220,10%,35%)] text-xs">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-auto text-[10px] bg-[hsl(220,15%,16%)] px-1.5 py-0.5 rounded">⌘K</kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(220,10%,35%)] px-3 pt-3 pb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.url, item.end);
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.end}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] transition-all group",
                      active
                        ? "bg-[hsl(220,15%,15%)] text-white font-medium"
                        : "text-[hsl(220,10%,50%)] hover:text-white hover:bg-[hsl(220,15%,12%)]"
                    )}
                  >
                    <item.icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-red-400" : "text-[hsl(220,10%,40%)] group-hover:text-[hsl(220,10%,60%)]")} />
                    <span className="truncate">{item.title}</span>
                    {active && <ChevronRight className="h-3 w-3 ml-auto text-[hsl(220,10%,40%)] shrink-0" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(220,15%,13%)] space-y-0.5 shrink-0">
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
