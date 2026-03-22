import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, MapPin, Navigation, Plane, Ship, Wifi, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

interface LiveTrackingPanelProps {
  shipmentId: string;
  mode: "ocean" | "air";
  bookingRef?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  mawbNumber?: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  maersk: "Maersk API",
  cmacgm: "CMA CGM API",
  msc: "MSC API",
  hapag_lloyd: "Hapag-Lloyd API",
  e2open: "e2open",
  manual: "Manual",
};

const SOURCE_COLORS: Record<string, string> = {
  maersk: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  cmacgm: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  msc: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  hapag_lloyd: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  e2open: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  manual: "bg-secondary text-secondary-foreground",
};

export function LiveTrackingPanel({
  shipmentId,
  mode,
  bookingRef,
  vessel,
  voyage,
  airline,
  flightNumber,
  mawbNumber,
}: LiveTrackingPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data: trackingEvents = [] } = useQuery({
    queryKey: ["tracking_events", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestEvent = trackingEvents[0];
  const latestSource = latestEvent?.source || "manual";

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("track-shipment", {
        body: { shipment_id: shipmentId },
      });

      if (error) throw error;

      setLastSynced(new Date());

      if (data.new_events > 0) {
        toast({ title: "Tracking Updated", description: `${data.new_events} new event(s) found.` });
        queryClient.invalidateQueries({ queryKey: ["tracking_events", shipmentId] });
        queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      } else {
        toast({ title: "Up to Date", description: "No new tracking events found." });
      }
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const isOcean = mode === "ocean";
  const ModeIcon = isOcean ? Ship : Plane;
  const trackingRef = isOcean
    ? bookingRef || vessel
    : mawbNumber || flightNumber;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="h-4 w-4 text-accent" />
            Live Tracking
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-7 text-xs"
          >
            {syncing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tracking Reference */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <ModeIcon className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {isOcean ? "Vessel / Booking" : "Flight / MAWB"}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {trackingRef || "Not assigned"}
            </p>
            {isOcean && vessel && voyage && (
              <p className="text-xs text-muted-foreground">
                {vessel} / {voyage}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {isOcean ? "Ocean" : "Air"}
          </Badge>
        </div>

        {/* Source & Last Synced */}
        <div className="flex items-center justify-between gap-2">
          <Badge className={`text-[10px] ${SOURCE_COLORS[latestSource] || SOURCE_COLORS.manual}`} variant="secondary">
            {SOURCE_LABELS[latestSource] || latestSource}
          </Badge>
          {lastSynced && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Latest Position */}
        {latestEvent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{latestEvent.milestone}</p>
                {latestEvent.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {latestEvent.location}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {format(new Date(latestEvent.event_date), "MMM d, yyyy HH:mm")} ·{" "}
                  {formatDistanceToNow(new Date(latestEvent.event_date), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Recent events feed */}
            {trackingEvents.length > 1 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Events
                </p>
                {trackingEvents.slice(1, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="text-foreground truncate">{event.milestone}</span>
                      {event.source && event.source !== "manual" && (
                        <Badge className={`text-[8px] px-1 py-0 ${SOURCE_COLORS[event.source] || ""}`} variant="secondary">
                          {SOURCE_LABELS[event.source] || event.source}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {format(new Date(event.event_date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <ModeIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No tracking events yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Click "Sync" to fetch the latest updates
            </p>
          </div>
        )}

        {/* Info footer */}
        <p className="text-[10px] text-muted-foreground/50 text-center pt-2 border-t border-border/30">
          {isOcean
            ? "Data sourced from carrier APIs (Maersk, CMA CGM, MSC, Hapag-Lloyd)"
            : "Data sourced from aviation tracking APIs"}
        </p>
      </CardContent>
    </Card>
  );
}
