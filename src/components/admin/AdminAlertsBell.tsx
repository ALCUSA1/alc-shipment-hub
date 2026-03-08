import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Check,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/15" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/15" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/15" },
};

export function AdminAlertsBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_alerts" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
          const alert = payload.new as any;
          toast.error(alert.title, { description: alert.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;

  const handleResolve = async (alertId: string) => {
    const { error } = await supabase
      .from("admin_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (error) {
      toast.error("Failed to resolve alert");
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    }
  };

  const handleResolveAll = async () => {
    const unresolvedIds = alerts.filter((a) => !a.is_resolved).map((a) => a.id);
    if (!unresolvedIds.length) return;
    const { error } = await supabase
      .from("admin_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .in("id", unresolvedIds);
    if (error) {
      toast.error("Failed to resolve alerts");
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-[hsl(220,15%,15%)] text-[hsl(220,10%,50%)] hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
          {unresolvedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unresolvedCount > 99 ? "99+" : unresolvedCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[420px] p-0 bg-[hsl(220,18%,9%)] border-[hsl(220,15%,15%)] text-white"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(220,15%,13%)]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-400" />
            <span className="font-semibold text-sm">Platform Alerts</span>
            {unresolvedCount > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">
                {unresolvedCount} active
              </Badge>
            )}
          </div>
          {unresolvedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResolveAll}
              className="text-xs text-[hsl(220,10%,45%)] hover:text-white h-7"
            >
              Resolve all
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(220,10%,35%)]">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No alerts yet</p>
              <p className="text-xs mt-1">Critical events will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(220,15%,12%)]">
              {alerts.map((alert) => {
                const config = severityConfig[alert.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={`px-4 py-3 transition-colors ${
                      alert.is_resolved
                        ? "opacity-50"
                        : "hover:bg-[hsl(220,15%,11%)]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 h-7 w-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white leading-tight">
                            {alert.title}
                          </p>
                          {!alert.is_resolved && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="shrink-0 p-1 rounded hover:bg-emerald-500/15 text-[hsl(220,10%,35%)] hover:text-emerald-400 transition-colors"
                              title="Mark resolved"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(220,10%,45%)] mt-0.5 line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={`text-[9px] border-0 ${config.bg} ${config.color}`}
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-[10px] text-[hsl(220,10%,35%)]">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                          {alert.is_resolved && (
                            <span className="text-[10px] text-emerald-500">✓ resolved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
