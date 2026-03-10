import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

export function ImpersonationSwitcher() {
  const { targets, startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  const handleSelect = (role: (typeof targets)[number]["role"]) => {
    const route = startImpersonation(role);
    navigate(route);
  };

  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(220,10%,35%)] px-3 pt-1 pb-2">
        Impersonate
      </p>
      <div className="space-y-0.5">
        {targets.map((target) => (
          <button
            key={target.role}
            onClick={() => handleSelect(target.role)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] text-[hsl(220,10%,50%)] hover:text-amber-400 hover:bg-amber-400/5 transition-colors w-full group"
          >
            <Eye className="h-3.5 w-3.5 shrink-0 text-[hsl(220,10%,40%)] group-hover:text-amber-400" />
            <span className="truncate">{target.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
