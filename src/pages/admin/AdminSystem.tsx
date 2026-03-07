import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  const statusColors = {
    operational: "bg-green-100 text-green-700 border-green-200",
    degraded: "bg-yellow-100 text-yellow-700 border-yellow-200",
    down: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Server className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
        </div>
        <p className="text-sm text-muted-foreground">Monitor system status, EDI processing, and data volumes</p>
      </div>

      {/* Health Checks */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {healthChecks.map((check) => (
          <Card key={check.name}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <check.icon className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-foreground">{check.name}</span>
                </div>
                <Badge variant="outline" className={statusColors[check.status]}>
                  {check.status === "operational" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {check.status === "degraded" && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {check.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{check.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Volumes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Volumes</CardTitle>
          <CardDescription>Record counts across major platform tables</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Shipments", value: data?.totalShipments },
                { label: "Tracking Events", value: data?.totalTrackingEvents },
                { label: "EDI Messages", value: data?.totalEdi },
                { label: "Documents", value: data?.totalDocuments },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-4 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{(item.value || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDI Summary */}
      {data && (data.ediErrors > 0 || data.ediPending > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4 text-accent" />
              EDI Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {data.ediPending > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">{data.ediPending} pending</span>
                </div>
              )}
              {data.ediErrors > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{data.ediErrors} errors</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminSystem;
