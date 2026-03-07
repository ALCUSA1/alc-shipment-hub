import { LayoutDashboard, Package, DollarSign, FileText, Users, Settings, LogOut, Truck, Warehouse, ContactRound, UsersRound } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import alcLogo from "@/assets/alc-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Shipments", url: "/dashboard/shipments", icon: Package },
  { title: "Quotes", url: "/dashboard/quotes", icon: DollarSign },
  { title: "Trucking", url: "/dashboard/trucking", icon: Truck },
  { title: "Warehouses", url: "/dashboard/warehouses", icon: Warehouse },
  { title: "Documents", url: "/dashboard/documents", icon: FileText },
  { title: "CRM", url: "/dashboard/crm", icon: ContactRound },
  { title: "Partners", url: "/dashboard/partners", icon: Users },
  { title: "Team", url: "/dashboard/team", icon: UsersRound },
  { title: "Account", url: "/dashboard/account", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <img src={alcLogo} alt="ALC Logo" className="h-7 w-auto shrink-0" />
        {!collapsed && <span className="font-bold text-sm text-sidebar-foreground">ALC Shipper Portal</span>}
      </div>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
      </SidebarContent>
      <div className="mt-auto p-3 border-t border-sidebar-border">
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
