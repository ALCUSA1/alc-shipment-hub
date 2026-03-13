import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AppRole } from "@/hooks/useUserRole";

type ImpersonationTarget = {
  role: AppRole;
  label: string;
  route: string;
};

const IMPERSONATION_TARGETS: ImpersonationTarget[] = [
  { role: "viewer", label: "Shipper", route: "/dashboard" },
  { role: "forwarder", label: "Freight Forwarder", route: "/forwarder" },
  { role: "trucker", label: "Carrier (Back Office)", route: "/trucking" },
  { role: "driver", label: "Driver", route: "/driver" },
  { role: "warehouse", label: "Warehouse Operator", route: "/warehouse" },
];

interface ImpersonationContextType {
  impersonatedRole: AppRole | null;
  impersonatedLabel: string | null;
  isImpersonating: boolean;
  startImpersonation: (role: AppRole) => string; // returns route to navigate to
  stopImpersonation: () => void;
  targets: ImpersonationTarget[];
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedRole: null,
  impersonatedLabel: null,
  isImpersonating: false,
  startImpersonation: () => "/admin",
  stopImpersonation: () => {},
  targets: IMPERSONATION_TARGETS,
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedRole, setImpersonatedRole] = useState<AppRole | null>(() => {
    return (sessionStorage.getItem("impersonated_role") as AppRole) || null;
  });

  const target = IMPERSONATION_TARGETS.find((t) => t.role === impersonatedRole);

  const startImpersonation = useCallback((role: AppRole) => {
    sessionStorage.setItem("impersonated_role", role);
    setImpersonatedRole(role);
    const t = IMPERSONATION_TARGETS.find((t) => t.role === role);
    return t?.route || "/dashboard";
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem("impersonated_role");
    setImpersonatedRole(null);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedRole,
        impersonatedLabel: target?.label || null,
        isImpersonating: !!impersonatedRole,
        startImpersonation,
        stopImpersonation,
        targets: IMPERSONATION_TARGETS,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export const useImpersonation = () => useContext(ImpersonationContext);
