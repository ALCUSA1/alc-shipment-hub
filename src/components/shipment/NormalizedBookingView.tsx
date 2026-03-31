import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ship, MapPin, Package, Users, FileText, DollarSign,
  Anchor, Box, ClipboardList, ArrowRight, Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface NormalizedBookingViewProps {
  shipmentId?: string;
  bookingId?: string;
}

const fmt = (d: string | null) => d ? format(new Date(d), "MMM d, yyyy") : "—";
const fmtStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusBadge: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  rejected: "bg-destructive/10 text-destructive",
  amended: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-muted text-muted-foreground",
};

export function NormalizedBookingView({ shipmentId, bookingId }: NormalizedBookingViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["normalized-booking", bookingId || shipmentId],
    queryFn: async () => {
      const params = bookingId
        ? `booking_id=${bookingId}`
        : `shipment_id=${shipmentId}`;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-detail?${params}`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(await res.text());
      }
      return res.json();
    },
    enabled: !!(shipmentId || bookingId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data?.booking) {
    return null; // No booking data — silently hide
  }

  const { booking, carrier, shipment, equipments, cargo, transport_plan, charges, instructions, references, parties, documents } = data;

  const shipper = parties?.find((p: any) => p.role === "shipper");
  const consignee = parties?.find((p: any) => p.role === "consignee");

  return (
    <div className="space-y-6">
      {/* ── Booking Summary ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-xs ${statusBadge[booking.booking_status] || "bg-secondary text-secondary-foreground"}`}>
              {fmtStatus(booking.booking_status)}
            </Badge>
            {carrier && (
              <Badge variant="outline" className="text-xs">
                {carrier.carrier_name} ({carrier.carrier_code})
              </Badge>
            )}
            {booking.amendment_number > 0 && (
              <Badge variant="secondary" className="text-xs">
                Amendment #{booking.amendment_number}
              </Badge>
            )}
          </div>

          {/* Key Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCell label="Booking No." value={booking.carrier_booking_number} />
            <InfoCell label="Booking Date" value={fmt(booking.booking_date)} />
            <InfoCell label="Payment Term" value={booking.payment_term_code} />
            <InfoCell label="Service Contract" value={booking.service_contract_reference} />
          </div>

          <Separator />

          {/* Route */}
          {shipment && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <RoutePoint label="Origin" port={shipment.origin_port} date={shipment.etd} dateLabel="ETD" />
              <RoutePoint label="POL" port={shipment.origin_port} />
              <RoutePoint label="POD" port={shipment.destination_port} />
              <RoutePoint label="Destination" port={shipment.destination_port} date={shipment.eta} dateLabel="ETA" />
            </div>
          )}

          <Separator />

          {/* Shipper & Consignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PartyCard label="Shipper" party={shipper} />
            <PartyCard label="Consignee" party={consignee} />
          </div>
        </CardContent>
      </Card>

      {/* ── Equipment ── */}
      {equipments && equipments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4 text-accent" />
              Requested Equipment ({equipments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {equipments.map((eq: any) => (
                <div key={eq.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center">
                      <Box className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {eq.iso_equipment_code || eq.equipment_type_code || "Container"}
                        {eq.equipment_description && ` — ${eq.equipment_description}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {eq.quantity}
                        {eq.gross_weight && ` • ${eq.gross_weight} kg`}
                        {eq.volume && ` • ${eq.volume} m³`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {eq.reefer_flag && <Badge variant="secondary" className="text-[10px]">Reefer</Badge>}
                    {eq.dangerous_goods_flag && <Badge variant="destructive" className="text-[10px]">DG</Badge>}
                    {eq.overdimension_flag && <Badge variant="secondary" className="text-[10px]">OOG</Badge>}
                    {eq.is_shipper_owned && <Badge variant="outline" className="text-[10px]">SOC</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Cargo ── */}
      {cargo && cargo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              Cargo Details ({cargo.length} line{cargo.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cargo.map((c: any) => (
                <div key={c.id} className="py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        #{c.cargo_line_number}: {c.commodity_description || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.hs_code && `HS: ${c.hs_code} • `}
                        {c.package_count && `${c.package_count} ${c.package_type_code || "pkgs"} • `}
                        {c.gross_weight && `${c.gross_weight} kg`}
                        {c.volume && ` • ${c.volume} m³`}
                      </p>
                      {c.marks_and_numbers && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">Marks: {c.marks_and_numbers}</p>
                      )}
                    </div>
                    {c.dangerous_goods_flag && <Badge variant="destructive" className="text-[10px]">DG</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Transport Plan ── */}
      {transport_plan && transport_plan.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Anchor className="h-4 w-4 text-accent" />
              Transport Plan ({transport_plan.length} leg{transport_plan.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transport_plan.map((leg: any, i: number) => {
                const loadLoc = leg.load_location || leg.receipt_location;
                const dischLoc = leg.discharge_location || leg.delivery_location;
                const vessel = leg.alc_vessels;
                return (
                  <div key={leg.id} className="py-3 px-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                        {i + 1}
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{leg.transport_mode || "vessel"}</Badge>
                      {leg.service_name && <Badge variant="secondary" className="text-[10px]">{leg.service_name}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Load</p>
                        <p className="text-sm font-medium text-foreground">
                          {loadLoc?.location_name || leg.vessel_name || "—"}
                          {loadLoc?.unlocode && <span className="text-muted-foreground ml-1">({loadLoc.unlocode})</span>}
                        </p>
                        {leg.planned_departure && <p className="text-xs text-muted-foreground">ETD: {fmt(leg.planned_departure)}</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Discharge</p>
                        <p className="text-sm font-medium text-foreground">
                          {dischLoc?.location_name || "—"}
                          {dischLoc?.unlocode && <span className="text-muted-foreground ml-1">({dischLoc.unlocode})</span>}
                        </p>
                        {leg.planned_arrival && <p className="text-xs text-muted-foreground">ETA: {fmt(leg.planned_arrival)}</p>}
                      </div>
                    </div>
                    {vessel && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Ship className="h-3 w-3" />
                        {vessel.vessel_name}
                        {leg.voyage_number && ` / Voy ${leg.voyage_number}`}
                        {vessel.imo_number && ` • IMO ${vessel.imo_number}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Charges ── */}
      {charges && charges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" />
              Booking Charges ({charges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {charges.map((ch: any) => (
                <div key={ch.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{ch.charge_description || ch.charge_code}</p>
                    {ch.calculation_basis && <p className="text-[10px] text-muted-foreground">Basis: {ch.calculation_basis}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {Number(ch.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} {ch.currency_code}
                    </p>
                    {ch.payment_term_code && (
                      <p className="text-[10px] text-muted-foreground">{ch.payment_term_code}</p>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-semibold">
                <p className="text-sm text-foreground">Total</p>
                <p className="text-sm text-foreground tabular-nums">
                  {charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} {charges[0]?.currency_code || "USD"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Instructions ── */}
      {instructions && instructions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Booking Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instructions.map((instr: any) => (
                <div key={instr.id} className="py-2 px-3 rounded-lg bg-secondary/30 border border-border/50">
                  <Badge variant="secondary" className="text-[10px] mb-1">{fmtStatus(instr.instruction_type || "general")}</Badge>
                  <p className="text-sm text-foreground">{instr.instruction_text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── References & Documents ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {references && references.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                References
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {references.map((ref: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase">{fmtStatus(ref.reference_type)}</p>
                    <p className="text-sm font-mono font-medium text-foreground">{ref.reference_value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {documents && documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                Booking Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between py-1.5">
                    <p className="text-sm text-foreground">{fmtStatus(doc.doc_type)}</p>
                    <Badge variant={doc.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                      {fmtStatus(doc.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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

function PartyCard({ label, party }: { label: string; party?: any }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <Users className="h-3 w-3" />
        {label}
      </p>
      {party ? (
        <>
          <p className="text-sm font-medium text-foreground">{party.company_name}</p>
          {party.contact_name && <p className="text-xs text-muted-foreground">{party.contact_name}</p>}
          {party.email && <p className="text-xs text-muted-foreground">{party.email}</p>}
          {(party.city || party.country) && (
            <p className="text-xs text-muted-foreground">{[party.city, party.country].filter(Boolean).join(", ")}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">Not assigned</p>
      )}
    </div>
  );
}
