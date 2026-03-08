import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Settings } from "lucide-react";

const AdminAccount = () => {
  const { user } = useAuth();

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Admin Account</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Your admin profile and session info</p>
      </div>

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Email</p>
            <p className="text-sm text-white mt-1">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">User ID</p>
            <p className="text-sm text-[hsl(220,10%,50%)] mt-1 font-mono text-xs">{user?.id || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Session</p>
            <p className="text-sm text-emerald-400 mt-1">Active</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAccount;
