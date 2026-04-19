import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Thermometer, MapPin, Wifi, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface HlagLiveSummaryProps {
  shipmentId: string;
  carrierCode?: string | null;
  onOpenTab?: () => void;
}

/** Compact widget for the Live Tracking panel — shows latest HLAG telemetry/position */
export function HlagLiveSummary({ shipmentId, carrierCode, onOpenTab }: HlagLiveSummaryProps) {
  const qc = useQueryClient();
  const isHlag = (carrierCode || "").toUpperCase() === "HLCU";

  const { data: latest } = useQuery({
    queryKey: ["hlag-live-summary", shipmentId],
    enabled: isHlag,
    queryFn: async () => {
      const [{ data: subs }, { data: events }] = await Promise.all([
        supabase.from("hlag_live_subscriptions").select("*").eq("shipment_id", shipmentId).eq("status", "active"),
        supabase.from("hlag_live_events").select("*").eq("shipment_id", shipmentId)
          .order("event_datetime", { ascending: false }).limit(2),
      ]);
      return { subs: subs || [], events: events || [] };
    },
  });

  useEffect(() => {
    if (!isHlag) return;
    const ch = supabase.channel(`hlag-summary-${shipmentId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "hlag_live_events", filter: `shipment_id=eq.${shipmentId}` },
        () => qc.invalidateQueries({ queryKey: ["hlag-live-summary", shipmentId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shipmentId, qc, isHlag]);

  if (!isHlag || !latest || latest.subs.length === 0) return null;

  const reefer = latest.events.find(e => e.feed_type === "reefer");
  const iot = latest.events.find(e => e.feed_type === "iot");
  const latestEvent = latest.events[0];

  return (
    <Card className="border-orange-200/50 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-sm">Hapag-Lloyd Live</span>
            <Badge variant="outline" className="text-xs">
              {latest.subs.length} active feed{latest.subs.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {onOpenTab && (
            <Button variant="ghost" size="sm" onClick={onOpenTab} className="h-7 text-xs">
              View telemetry <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {reefer?.temperature_celsius != null && (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{reefer.temperature_celsius}°C</span>
              {reefer.humidity_percent != null && (
                <span className="text-muted-foreground text-xs">/ {reefer.humidity_percent}% RH</span>
              )}
            </div>
          )}
          {iot?.latitude != null && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">
                {Number(iot.latitude).toFixed(2)}, {Number(iot.longitude).toFixed(2)}
              </span>
            </div>
          )}
          {latestEvent && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(latestEvent.event_datetime), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
