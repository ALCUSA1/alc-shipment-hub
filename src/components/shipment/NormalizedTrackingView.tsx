import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Ship, Anchor, MapPin, Clock, Box, FileText, Navigation,
  ArrowRight, RefreshCw, Loader2, Check, Circle, Container,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface NormalizedTrackingViewProps {
  shipmentId: string;
}

/* ── helpers ── */
const fmt = (d: string | null) => d ? format(new Date(d), "MMM d, yyyy") : "—";
const fmtFull = (d: string | null) => d ? format(new Date(d), "MMM d, yyyy HH:mm") : "—";
const statusBadge: Record<string, string> = {
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit: "bg-accent/10 text-accent",
  departed: "bg-accent/10 text-accent",
  arrived: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  discharged: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};
const fmtStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function NormalizedTrackingView({ shipmentId }: NormalizedTrackingViewProps) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["normalized-tracking", shipmentId],
    queryFn: async () => {
      const { data: resp, error: err } = await supabase.functions.invoke("shipment-tracking", {
        body: null,
        method: "GET",
      });
      // Edge function uses query params; call via fetch instead
      const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/shipment-tracking?shipment_id=${shipmentId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!shipmentId,
    staleTime: 30_000,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("track-shipment", {
        body: { shipment_id: shipmentId },
      });
      if (err) throw err;
      toast({ title: "Tracking synced", description: `${result?.new_events ?? 0} new event(s).` });
      queryClient.invalidateQueries({ queryKey: ["normalized-tracking", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["tracking_events", shipmentId] });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.shipment) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Unable to load carrier tracking data.</p>
        </CardContent>
      </Card>
    );
  }

  const { shipment, references, containers, tracking_timeline, transport_calls, carrier_documents } = data;
  const carrier = (shipment as any).alc_carriers;
  const bookingRef = references?.find((r: any) => r.reference_type === "booking_number")?.reference_value
    || shipment.booking_ref;
  const blRef = references?.find((r: any) => r.reference_type === "bill_of_lading")?.reference_value;

  return (
    <div className="space-y-6">
      {/* ── Shipment Summary Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="h-4 w-4 text-accent" />
              Carrier Tracking Summary
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-7 text-xs">
              {syncing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Sync Carrier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status & Carrier */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-xs ${statusBadge[shipment.current_substatus] || statusBadge[shipment.status] || "bg-secondary text-secondary-foreground"}`}>
              {fmtStatus(shipment.current_substatus || shipment.status)}
            </Badge>
            {carrier && (
              <Badge variant="outline" className="text-xs">
                {carrier.carrier_name} ({carrier.carrier_code})
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs capitalize">
              {shipment.mode || "Ocean"}
            </Badge>
          </div>

          {/* References */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoCell label="Shipment Ref" value={shipment.shipment_ref} />
            <InfoCell label="Booking No." value={bookingRef} />
            <InfoCell label="Bill of Lading" value={blRef} />
          </div>

          <Separator />

          {/* Route */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RoutePoint label="Origin" port={shipment.origin_port} date={shipment.etd} dateLabel="ETD" />
            <RoutePoint label="POL" port={shipment.origin_port} />
            <RoutePoint label="POD" port={shipment.destination_port} />
            <RoutePoint label="Destination" port={shipment.destination_port} date={shipment.eta} dateLabel="ETA" />
          </div>
        </CardContent>
      </Card>

      {/* ── Vessel & Voyage ── */}
      {(shipment.vessel || transport_calls?.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Anchor className="h-4 w-4 text-accent" />
              Vessel &amp; Voyage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shipment.vessel && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 mb-4">
                <Ship className="h-6 w-6 text-accent shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{shipment.vessel}</p>
                  <p className="text-xs text-muted-foreground">Voyage: {shipment.voyage || "—"}</p>
                </div>
              </div>
            )}
            {transport_calls && transport_calls.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Port Calls</p>
                {transport_calls.map((tc: any, i: number) => {
                  const loc = tc.alc_locations;
                  const vessel = tc.alc_vessels;
                  return (
                    <div key={tc.id} className="flex items-center justify-between text-xs py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {loc?.location_name || tc.facility_code || "—"}
                            {loc?.unlocode && <span className="text-muted-foreground ml-1">({loc.unlocode})</span>}
                          </p>
                          {vessel && <p className="text-muted-foreground">{vessel.vessel_name} • Voy {tc.voyage_number}</p>}
                        </div>
                      </div>
                      <div className="text-right text-muted-foreground">
                        {(tc.actual_arrival || tc.planned_arrival) && (
                          <p>Arr: {fmt(tc.actual_arrival || tc.planned_arrival)}</p>
                        )}
                        {(tc.actual_departure || tc.planned_departure) && (
                          <p>Dep: {fmt(tc.actual_departure || tc.planned_departure)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Containers ── */}
      {containers && containers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4 text-accent" />
              Containers ({containers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {containers.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center">
                      <Box className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground font-mono">{c.container_number || "TBD"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.iso_equipment_code || c.equipment_size_type || `${c.container_size || ""}${c.container_type || ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.container_seals && c.container_seals.length > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">Seal</p>
                        <p className="text-xs font-mono text-foreground">
                          {c.container_seals.map((s: any) => s.seal_number).join(", ")}
                        </p>
                      </div>
                    )}
                    {c.status && (
                      <Badge variant="secondary" className="text-[10px]">{fmtStatus(c.status)}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tracking Timeline ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-accent" />
            Tracking Timeline ({tracking_timeline?.length || 0} events)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tracking_timeline && tracking_timeline.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
              <div className="space-y-0">
                {tracking_timeline.map((evt: any, i: number) => {
                  const loc = evt.alc_locations;
                  const vessel = evt.alc_vessels;
                  const isLatest = i === tracking_timeline.length - 1;
                  return (
                    <div key={evt.id} className="relative flex gap-4 py-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 ${
                        isLatest
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                          : "bg-secondary border-2 border-border text-muted-foreground"
                      }`}>
                        {isLatest ? <Check className="h-3 w-3 stroke-[3]" /> : <Circle className="h-2.5 w-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-medium ${isLatest ? "text-foreground" : "text-muted-foreground"}`}>
                              {evt.internal_event_name || evt.milestone || evt.external_event_name || fmtStatus(evt.internal_event_code || "")}
                            </p>
                            {(loc || evt.location) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {loc ? `${loc.location_name || loc.city || ""}${loc.unlocode ? ` (${loc.unlocode})` : ""}` : evt.location}
                              </p>
                            )}
                            {vessel && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {vessel.vessel_name}{vessel.imo_number ? ` • IMO ${vessel.imo_number}` : ""}
                              </p>
                            )}
                            {evt.external_event_code && evt.internal_event_code && (
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {evt.external_event_code} → {evt.internal_event_code}
                                {evt.event_classifier_code && ` • ${evt.event_classifier_code}`}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">{fmtFull(evt.event_date || evt.event_created_datetime)}</p>
                            {evt.event_date && (
                              <p className="text-[10px] text-muted-foreground/60">
                                {formatDistanceToNow(new Date(evt.event_date), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Navigation className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tracking events recorded yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "Sync Carrier" to fetch the latest from the shipping line</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Carrier Documents ── */}
      {carrier_documents && carrier_documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Carrier Documents ({carrier_documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {carrier_documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fmtStatus(doc.doc_type)}</p>
                    {doc.document_reference && (
                      <p className="text-xs text-muted-foreground font-mono">{doc.document_reference}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                      {fmtStatus(doc.status)}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground">{fmt(doc.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── All References ── */}
      {references && references.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Shipment References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {references.map((ref: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">{fmtStatus(ref.reference_type)}</p>
                    <p className="text-sm font-mono font-medium text-foreground">{ref.reference_value}</p>
                  </div>
                  {ref.is_primary && <Badge variant="default" className="text-[10px]">Primary</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function InfoCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 font-mono">{value || "—"}</p>
    </div>
  );
}

function RoutePoint({ label, port, date, dateLabel }: { label: string; port?: string | null; date?: string | null; dateLabel?: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
        <p className="text-sm font-medium text-foreground">{port || "—"}</p>
      </div>
      {date && dateLabel && (
        <p className="text-xs text-muted-foreground mt-1">{dateLabel}: {fmt(date)}</p>
      )}
    </div>
  );
}
