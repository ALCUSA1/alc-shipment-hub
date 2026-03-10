import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedLabel, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <>
      {/* Spacer to push content down */}
      <div className="h-10" />
      {/* Fixed banner */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Impersonating <strong>{impersonatedLabel}</strong> role
        </span>
        <button
          onClick={handleExit}
          className="ml-4 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        >
          <X className="h-3 w-3" />
          Exit & Return to Admin
        </button>
      </div>
    </>
  );
}
