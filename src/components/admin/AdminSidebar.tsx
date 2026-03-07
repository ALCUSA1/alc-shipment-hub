import { LayoutDashboard, Users, Activity, DollarSign, Server, ArrowLeft, LogOut, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Users & Roles", url: "/admin/users", icon: Users },
  { title: "Activity Feed", url: "/admin/activity", icon: Activity },
  { title: "Financials", url: "/admin/financials", icon: DollarSign },
  { title: "System Health", url: "/admin/system", icon: Server },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <Shield className="h-5 w-5 text-sidebar-primary shrink-0" />
        {!collapsed && <span className="font-bold text-sm text-sidebar-foreground">Admin Portal</span>}
      </div>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            {!collapsed && "Platform"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
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
      </SidebarContent>
      <div className="mt-auto p-3 border-t border-sidebar-border space-y-1">
        <SidebarMenuButton onClick={() => navigate("/dashboard")}>
          <div className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Back to App</span>}
          </div>
        </SidebarMenuButton>
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
