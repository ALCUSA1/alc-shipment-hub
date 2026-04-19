import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Thermometer, Droplets, Gauge, MapPin, Power,
  Play, Pause, RefreshCw, Wifi, WifiOff, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface HlagLiveTelemetryTabProps {
  shipmentId: string;
  bookingRef?: string | null;
  containerNumber?: string | null;
  carrierCode?: string | null;
}

export function HlagLiveTelemetryTab({
  shipmentId,
  bookingRef,
  containerNumber,
  carrierCode,
}: HlagLiveTelemetryTabProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const isHlag = (carrierCode || "").toUpperCase() === "HLCU";

  const { data: subs = [], isLoading: subsLoading } = useQuery({
    queryKey: ["hlag-live-subs", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hlag_live_subscriptions")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: events = [], isLoading: evLoading } = useQuery({
    queryKey: ["hlag-live-events", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hlag_live_events")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("event_datetime", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`hlag-live-${shipmentId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "hlag_live_events", filter: `shipment_id=eq.${shipmentId}` },
        () => qc.invalidateQueries({ queryKey: ["hlag-live-events", shipmentId] }))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "hlag_live_subscriptions", filter: `shipment_id=eq.${shipmentId}` },
        () => qc.invalidateQueries({ queryKey: ["hlag-live-subs", shipmentId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shipmentId, qc]);

  const activeSub = subs.find((s: any) => s.status === "active") || subs[0];
  const reeferEvents = useMemo(() => events.filter((e: any) => e.feed_type === "reefer"), [events]);
  const iotEvents = useMemo(() => events.filter((e: any) => e.feed_type === "iot"), [events]);
  const latestReefer = reeferEvents[0];
  const latestIot = iotEvents[0];

  const chartData = useMemo(() => {
    return [...reeferEvents]
      .reverse()
      .slice(-50)
      .map((e: any) => ({
        time: format(new Date(e.event_datetime), "HH:mm"),
        temp: e.temperature_celsius,
        humidity: e.humidity_percent,
        setpoint: e.setpoint_celsius,
      }));
  }, [reeferEvents]);

  async function subscribe(feed: "reefer" | "iot") {
    if (!bookingRef) {
      toast({ title: "Carrier booking reference required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("hapag-live-subscribe", {
        method: "POST",
        body: {
          shipment_id: shipmentId,
          feed_type: feed,
          carrier_booking_reference: bookingRef,
          equipment_reference: containerNumber || null,
          trigger_source: "manual",
        },
      });
      if (error) throw error;
      toast({
        title: data?.simulated ? "Subscription created (simulation)" : "Subscription created",
        description: data?.simulated
          ? "HLAG credentials missing or upstream unavailable — using mock telemetry."
          : `Live ${feed === "reefer" ? "telemetry" : "position"} feed is active.`,
      });
      qc.invalidateQueries({ queryKey: ["hlag-live-subs", shipmentId] });
    } catch (err: any) {
      toast({ title: "Failed to subscribe", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(subId: string) {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("hapag-live-subscribe", {
        method: "DELETE",
        body: { subscription_id: subId },
      });
      if (error) throw error;
      toast({ title: "Subscription cancelled" });
      qc.invalidateQueries({ queryKey: ["hlag-live-subs", shipmentId] });
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!isHlag) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Wifi className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Hapag-Lloyd Live not available</p>
          <p className="text-sm mt-1">This shipment is not on a Hapag-Lloyd vessel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Hapag-Lloyd Live Feeds
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Booking ref: <span className="font-mono">{bookingRef || "—"}</span>
                {containerNumber && <> • Container: <span className="font-mono">{containerNumber}</span></>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["hlag-live-events", shipmentId] })}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subsLoading ? (
            <Skeleton className="h-20" />
          ) : subs.length === 0 ? (
            <div className="border border-dashed rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">No active live feeds. Subscribe to start receiving real-time telemetry from Hapag-Lloyd.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button size="sm" onClick={() => subscribe("reefer")} disabled={busy || !bookingRef}>
                  <Thermometer className="h-3.5 w-3.5 mr-1.5" /> Enable Reefer Telemetry
                </Button>
                <Button size="sm" variant="outline" onClick={() => subscribe("iot")} disabled={busy || !bookingRef}>
                  <MapPin className="h-3.5 w-3.5 mr-1.5" /> Enable Live Position
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {subs.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.status === "active" ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium capitalize">{s.feed_type}</span>
                    <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    {s.simulated && <Badge variant="secondary" className="text-xs">simulation</Badge>}
                    {s.last_event_at && (
                      <span className="text-xs text-muted-foreground truncate">
                        last event {formatDistanceToNow(new Date(s.last_event_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {s.status !== "cancelled" && (
                    <Button variant="ghost" size="sm" onClick={() => cancel(s.id)} disabled={busy}>
                      <Pause className="h-3.5 w-3.5 mr-1.5" /> Cancel
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                {!subs.some((s: any) => s.feed_type === "reefer" && s.status === "active") && (
                  <Button size="sm" variant="outline" onClick={() => subscribe("reefer")} disabled={busy || !bookingRef}>
                    <Thermometer className="h-3.5 w-3.5 mr-1.5" /> Add Reefer
                  </Button>
                )}
                {!subs.some((s: any) => s.feed_type === "iot" && s.status === "active") && (
                  <Button size="sm" variant="outline" onClick={() => subscribe("iot")} disabled={busy || !bookingRef}>
                    <MapPin className="h-3.5 w-3.5 mr-1.5" /> Add Position
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest readings */}
      {(latestReefer || latestIot) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {latestReefer?.temperature_celsius != null && (
            <MetricCard icon={Thermometer} label="Temperature" value={`${latestReefer.temperature_celsius}°C`} sub={latestReefer.setpoint_celsius != null ? `Setpoint ${latestReefer.setpoint_celsius}°C` : null} />
          )}
          {latestReefer?.humidity_percent != null && (
            <MetricCard icon={Droplets} label="Humidity" value={`${latestReefer.humidity_percent}%`} />
          )}
          {latestReefer?.o2_percent != null && (
            <MetricCard icon={Gauge} label="O₂ / CO₂" value={`${latestReefer.o2_percent}% / ${latestReefer.co2_percent ?? "—"}%`} />
          )}
          {latestReefer?.power_status && (
            <MetricCard icon={Power} label="Power" value={latestReefer.power_status} />
          )}
          {latestIot?.latitude != null && latestIot?.longitude != null && (
            <MetricCard
              icon={MapPin}
              label="Position"
              value={`${Number(latestIot.latitude).toFixed(2)}, ${Number(latestIot.longitude).toFixed(2)}`}
              sub={latestIot.speed_knots != null ? `${latestIot.speed_knots} kn` : null}
            />
          )}
        </div>
      )}

      {/* Reefer chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reefer trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Temp °C" />
                  <Line type="monotone" dataKey="setpoint" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} dot={false} name="Setpoint" />
                  <Line type="monotone" dataKey="humidity" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Humidity %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {evLoading ? (
            <Skeleton className="h-32" />
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-6">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No events received yet. Once HLAG starts pushing data, events will appear here in real time.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {events.slice(0, 50).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between border-b border-border/50 py-1.5 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs capitalize">{e.feed_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.event_datetime), "MMM d, HH:mm:ss")}
                    </span>
                    {e.equipment_reference && <span className="font-mono text-xs">{e.equipment_reference}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate ml-3">
                    {e.feed_type === "reefer"
                      ? [e.temperature_celsius != null && `${e.temperature_celsius}°C`,
                         e.humidity_percent != null && `${e.humidity_percent}%RH`].filter(Boolean).join(" • ")
                      : e.latitude != null
                        ? `${Number(e.latitude).toFixed(3)}, ${Number(e.longitude).toFixed(3)}`
                        : e.event_type || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="font-semibold text-lg">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
