import { ArrowLeft, LogOut, Shield } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ImpersonationSwitcher } from "./ImpersonationSwitcher";
import { ADMIN_SECTIONS, getActiveSection } from "./adminNav";

export function AdminSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = getActiveSection(location.pathname).key;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="h-screen w-60 flex flex-col bg-card border-r border-border">
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm text-foreground tracking-tight">Admin Console</span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {ADMIN_SECTIONS.map((s) => {
          const active = s.key === activeKey;
          const Icon = s.icon;
          return (
            <NavLink
              key={s.key}
              to={s.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{s.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border shrink-0">
        <ImpersonationSwitcher />
      </div>

      <div className="p-3 border-t border-border space-y-0.5 shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
