import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Server, Database, Radio, AlertTriangle, CheckCircle2 } from "lucide-react";

const AdminSystem = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: async () => {
      const [ediRes, docsRes, shipmentsRes, trackingRes] = await Promise.all([
        supabase.from("edi_messages").select("id, status", { count: "exact" }),
        supabase.from("documents").select("id, status", { count: "exact" }),
        supabase.from("shipments").select("id", { count: "exact" }),
        supabase.from("tracking_events").select("id", { count: "exact" }),
      ]);

      const ediMessages = ediRes.data || [];
      const ediErrors = ediMessages.filter(m => m.status === "error").length;
      const ediPending = ediMessages.filter(m => m.status === "pending").length;
      const docs = docsRes.data || [];
      const docsPending = docs.filter(d => d.status === "pending").length;

      return {
        totalShipments: shipmentsRes.count || 0,
        totalTrackingEvents: trackingRes.count || 0,
        totalEdi: ediRes.count || 0,
        ediErrors,
        ediPending,
        totalDocuments: docsRes.count || 0,
        docsPending,
      };
    },
  });

  const healthChecks = [
    {
      name: "Database",
      icon: Database,
      status: "operational" as const,
      description: "All tables accessible and responding",
    },
    {
      name: "EDI Gateway",
      icon: Radio,
      status: (data?.ediErrors || 0) > 0 ? "degraded" as const : "operational" as const,
      description: data?.ediErrors ? `${data.ediErrors} message errors detected` : "All messages processing normally",
    },
    {
      name: "Document Processing",
      icon: Server,
      status: "operational" as const,
      description: `${data?.docsPending || 0} documents pending review`,
    },
  ];

  const statusStyles = {
    operational: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
    degraded: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: AlertTriangle },
    down: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: AlertTriangle },
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Server className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">System Health</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Monitor system status, EDI processing, and data volumes</p>
      </div>

      {/* Health Checks */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {healthChecks.map((check) => {
          const style = statusStyles[check.status];
          const StatusIcon = style.icon;
          return (
            <div key={check.name} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <check.icon className="h-5 w-5 text-indigo-400" />
                  <span className="font-semibold text-white text-sm">{check.name}</span>
                </div>
                <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} text-[10px]`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {check.status}
                </Badge>
              </div>
              <p className="text-xs text-[hsl(220,10%,45%)]">{check.description}</p>
            </div>
          );
        })}
      </div>

      {/* Data Volumes */}
      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-1">Data Volumes</h2>
        <p className="text-xs text-[hsl(220,10%,40%)] mb-4">Record counts across major platform tables</p>
        {isLoading ? <Skeleton className="h-32 w-full bg-[hsl(220,15%,15%)]" /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Shipments", value: data?.totalShipments },
              { label: "Tracking Events", value: data?.totalTrackingEvents },
              { label: "EDI Messages", value: data?.totalEdi },
              { label: "Documents", value: data?.totalDocuments },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[hsl(220,15%,15%)] p-4 bg-[hsl(220,15%,8%)]">
                <p className="text-[10px] font-semibold text-[hsl(220,10%,40%)] uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{(item.value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDI Summary */}
      {data && (data.ediErrors > 0 || data.ediPending > 0) && (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">EDI Status Summary</h2>
          </div>
          <div className="flex gap-4">
            {data.ediPending > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">{data.ediPending} pending</span>
              </div>
            )}
            {data.ediErrors > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{data.ediErrors} errors</span>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSystem;
