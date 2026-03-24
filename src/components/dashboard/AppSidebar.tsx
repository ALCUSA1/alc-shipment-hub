import {
  LayoutDashboard, Package, Inbox, ContactRound, Users, Settings, LogOut,
  Calculator, TrendingUp, Bell, BarChart3, DollarSign, Plus, Search,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canAccessRoute } from "@/lib/permissions";
import alcLogo from "@/assets/alc-logo.png";
import { Button } from "@/components/ui/button";
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

const navGroups = [
  {
    label: "Workflow",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Shipments", url: "/dashboard/shipments", icon: Package },
      { title: "Requests", url: "/dashboard/quotes", icon: Inbox },
      { title: "Customers", url: "/dashboard/crm", icon: ContactRound },
      { title: "Partners", url: "/dashboard/partners", icon: Users },
      { title: "Financials", url: "/dashboard/accounting", icon: DollarSign },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
      { title: "Rate Trends", url: "/dashboard/rate-trends", icon: TrendingUp },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
      { title: "Account", url: "/dashboard/account", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { roles } = useUserRole();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["sidebar-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("logo_url, company_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const logoSrc = (profile as any)?.logo_url || alcLogo;
  const companyLabel = profile?.company_name || "ALC Shipper Portal";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <img src={logoSrc} alt="Logo" className="h-7 w-auto shrink-0 max-w-[28px] object-contain" />
        {!collapsed && <span className="font-bold text-sm text-sidebar-foreground truncate">{companyLabel}</span>}
      </div>

      {/* New Shipment CTA */}
      <div className="px-3 pt-4 pb-2">
        <Button variant="electric" size={collapsed ? "icon" : "sm"} className="w-full" asChild>
          <Link to="/dashboard/shipments/new">
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New Shipment</span>}
          </Link>
        </Button>
      </div>

      <SidebarContent className="pt-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessRoute(item.url, roles));
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-4 mb-1">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
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
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <div className="mt-auto border-t border-sidebar-border p-3 space-y-1">
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
