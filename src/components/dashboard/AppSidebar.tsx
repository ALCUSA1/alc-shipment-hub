import {
  LayoutDashboard, Package, Inbox, ContactRound, Users, Settings, LogOut,
  TrendingUp, BarChart3, DollarSign, Search, Shield, User, Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyRole } from "@/hooks/useCompanyRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canAccessRoute } from "@/lib/permissions";
import { canSeeNavItem, type NavItemKey } from "@/lib/company-permissions";
import alcLogo from "@/assets/alc-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const primaryNav: { title: string; url: string; icon: any; navKey: NavItemKey }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, navKey: "dashboard" },
  { title: "Shipments", url: "/dashboard/shipments", icon: Package, navKey: "shipments" },
  { title: "Requests", url: "/dashboard/quotes", icon: Inbox, navKey: "quotes" },
  { title: "Customers", url: "/dashboard/crm", icon: ContactRound, navKey: "crm" },
  { title: "Partners", url: "/dashboard/partners", icon: Users, navKey: "partners" },
  { title: "Financials", url: "/dashboard/accounting", icon: DollarSign, navKey: "accounting" },
  { title: "Team", url: "/dashboard/team", icon: Shield, navKey: "team" },
];

const secondaryNav: { title: string; url: string; icon: any; navKey: NavItemKey }[] = [
  { title: "Spark", url: "/dashboard/spark", icon: Sparkles, navKey: "spark" },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3, navKey: "analytics" },
  { title: "Rate Trends", url: "/dashboard/rate-trends", icon: TrendingUp, navKey: "rate-trends" },
  { title: "Settings", url: "/dashboard/account", icon: Settings, navKey: "account" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { roles } = useUserRole();
  const { role: companyRole } = useCompanyRole();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["sidebar-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("logo_url, company_name, full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const logoSrc = (profile as any)?.logo_url || alcLogo;
  const companyLabel = profile?.company_name || "ALC Shipper Portal";
  const userName = (profile as any)?.full_name || user?.email?.split("@")[0] || "User";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const renderNavItems = (items: typeof primaryNav) => {
    const visible = items.filter((item) => canAccessRoute(item.url, roles) && canSeeNavItem(companyRole, item.navKey));
    if (visible.length === 0) return null;
    return (
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end={item.url === "/dashboard"}
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <img src={logoSrc} alt="Logo" className="h-7 w-auto shrink-0 max-w-[28px] object-contain" />
        {!collapsed && <span className="font-bold text-sm text-sidebar-foreground truncate">{companyLabel}</span>}
      </div>

      <SidebarContent className="pt-3">
        {/* Primary Navigation */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-4 mb-1">
              Workflow
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderNavItems(primaryNav)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="px-4 py-1">
          <Separator className="bg-sidebar-border" />
        </div>

        {/* Secondary Navigation */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-4 mb-1">
              Intelligence
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderNavItems(secondaryNav)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom: User Profile + Logout */}
      <div className="mt-auto border-t border-sidebar-border p-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-sidebar-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <SidebarMenuButton onClick={handleLogout}>
          <div className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm cursor-pointer">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Log Out</span>}
          </div>
        </SidebarMenuButton>
      </div>
    </Sidebar>
  );
}
