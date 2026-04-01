import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ship, MapPin, Package, Users, FileText, Bell, Clock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Anchor
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING_UPDATE: "bg-yellow-100 text-yellow-800",
  UPDATE_RECEIVED: "bg-blue-100 text-blue-800",
  PENDING_AMENDMENT: "bg-orange-100 text-orange-800",
  AMENDMENT_RECEIVED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  DECLINED: "bg-red-100 text-red-800",
};

const INTERNAL_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  received: "Received",
  confirmed: "Confirmed",
  pending_update: "Pending Update",
  update_received: "Update Received",
  pending_amendment: "Pending Amendment",
  amendment_received: "Amendment Received",
  cancellation_requested: "Cancellation Requested",
  cancelled: "Cancelled",
  declined: "Declined",
  placeholder: "Placeholder",
  unknown: "Unknown",
};

interface BookingDetailPanelProps {
  bookingId: string;
}

export function BookingDetailPanel({ bookingId }: BookingDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["dcsa-booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: parties } = useQuery({
    queryKey: ["booking-parties", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_parties")
        .select("*")
        .eq("booking_id", bookingId)
        .order("party_role");
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: locations } = useQuery({
    queryKey: ["booking-locations", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_locations")
        .select("*, alc_locations(*)")
        .eq("booking_id", bookingId)
        .order("location_type_code");
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: equipments } = useQuery({
    queryKey: ["booking-equipments", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_equipments")
        .select("*")
        .eq("booking_id", bookingId);
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: commodities } = useQuery({
    queryKey: ["booking-commodities", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_commodities")
        .select("*")
        .eq("booking_id", bookingId);
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: notifications } = useQuery({
    queryKey: ["booking-notifications", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_notifications")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("dcsa-booking", {
        body: { action: "sync", booking_id: bookingId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Booking synced with carrier");
      queryClient.invalidateQueries({ queryKey: ["dcsa-booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-notifications", bookingId] });
    },
    onError: (err: any) => toast.error(`Sync failed: ${err.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("dcsa-booking", {
        body: { action: "cancel", booking_id: bookingId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cancellation requested");
      queryClient.invalidateQueries({ queryKey: ["dcsa-booking", bookingId] });
    },
    onError: (err: any) => toast.error(`Cancel failed: ${err.message}`),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!booking) return <p className="text-muted-foreground p-4">Booking not found</p>;

  const LOCATION_TYPE_LABELS: Record<string, string> = {
    PRE: "Place of Receipt",
    POL: "Port of Loading",
    POD: "Port of Discharge",
    PDE: "Place of Delivery",
    FCD: "Full Container Drop-off",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5 text-primary" />
              Booking {booking.carrier_booking_number || booking.carrier_booking_request_reference || booking.id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.carrier_service_name && `${booking.carrier_service_name} · `}
              {booking.vessel_name && `${booking.vessel_name} · `}
              {booking.carrier_export_voyage_number && `Voy ${booking.carrier_export_voyage_number}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[booking.booking_status] || "bg-muted text-muted-foreground"}>
              {booking.booking_status || "N/A"}
            </Badge>
            <Badge variant="outline">
              {INTERNAL_STATUS_LABELS[booking.booking_status_internal] || booking.booking_status_internal}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sync with Carrier
            </Button>
            {booking.booking_status !== "CANCELLED" && booking.booking_status_internal !== "cancelled" && (
              <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Booking
              </Button>
            )}
          </div>
          {booking.updated_datetime && (
            <p className="text-xs text-muted-foreground mt-3">
              <Clock className="h-3 w-3 inline mr-1" />
              Last carrier sync: {format(new Date(booking.updated_datetime), "PPpp")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <BookingStatusTimeline booking={booking} notifications={notifications || []} />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="route">Route & Locations</TabsTrigger>
          <TabsTrigger value="parties">Parties ({parties?.length || 0})</TabsTrigger>
          <TabsTrigger value="equipment">Equipment ({equipments?.length || 0})</TabsTrigger>
          <TabsTrigger value="commodities">Commodities ({commodities?.length || 0})</TabsTrigger>
          <TabsTrigger value="notifications">Notifications ({notifications?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Booking References</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Carrier Request Ref</span>
                  <p className="font-mono">{booking.carrier_booking_request_reference || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Carrier Booking Ref</span>
                  <p className="font-mono">{booking.carrier_booking_number || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Service Contract</span>
                  <p>{booking.service_contract_reference || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transport Document Type</span>
                  <p>{booking.transport_document_type_code || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Terms</span>
                  <p>{booking.freight_payment_term_code || booking.payment_term_code || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Incoterms</span>
                  <p>{booking.inco_terms || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Departure</span>
                  <p>{booking.expected_departure_date || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vessel / Voyage</span>
                  <p>{[booking.vessel_name, booking.carrier_export_voyage_number].filter(Boolean).join(" / ") || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Booking Flags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {booking.is_partial_load_allowed && <Badge variant="outline">Partial Load</Badge>}
                {booking.is_export_declaration_required && <Badge variant="outline">Export Declaration Required</Badge>}
                {booking.is_equipment_substitution_allowed && <Badge variant="outline">Equipment Substitution</Badge>}
                {booking.declared_value && (
                  <Badge variant="outline">
                    Declared Value: {booking.declared_value} {booking.declared_value_currency}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipment Locations</CardTitle></CardHeader>
            <CardContent>
              {!locations?.length ? (
                <p className="text-muted-foreground text-sm">No locations mapped</p>
              ) : (
                <div className="space-y-3">
                  {locations.map((loc: any) => (
                    <div key={loc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Badge variant="outline" className="text-xs min-w-[60px] justify-center">
                        {loc.location_type_code}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{loc.location_name_snapshot || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {LOCATION_TYPE_LABELS[loc.location_type_code] || loc.location_type_code}
                          {loc.alc_locations?.unlocode && ` · ${loc.alc_locations.unlocode}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Document Parties</CardTitle></CardHeader>
            <CardContent>
              {!parties?.length ? (
                <p className="text-muted-foreground text-sm">No parties mapped</p>
              ) : (
                <div className="space-y-3">
                  {parties.map((p: any) => (
                    <div key={p.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-1">{p.party_role}</Badge>
                          <p className="font-medium text-sm">{p.party_name}</p>
                        </div>
                        {p.tax_reference_value && (
                          <span className="text-xs text-muted-foreground">
                            {p.tax_reference_type}: {p.tax_reference_value}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {p.address_line1 && <p>{[p.address_line1, p.city, p.state_region, p.country_code].filter(Boolean).join(", ")}</p>}
                        {p.contact_name && <p>Contact: {p.contact_name} {p.contact_email && `· ${p.contact_email}`}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Requested Equipment</CardTitle></CardHeader>
            <CardContent>
              {!equipments?.length ? (
                <p className="text-muted-foreground text-sm">No equipment records</p>
              ) : (
                <div className="space-y-3">
                  {equipments.map((eq: any) => {
                    const eqCommodities = commodities?.filter((c: any) => c.booking_equipment_id === eq.id) || [];
                    return (
                      <div key={eq.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge>{eq.iso_equipment_code || eq.equipment_type_code || "N/A"}</Badge>
                            <span className="text-sm font-medium">× {eq.units || eq.quantity || 1}</span>
                          </div>
                          <div className="flex gap-1">
                            {eq.is_shipper_owned && <Badge variant="outline" className="text-xs">SOC</Badge>}
                            {eq.reefer_flag && <Badge variant="outline" className="text-xs">Reefer</Badge>}
                            {eq.is_non_operating_reefer && <Badge variant="outline" className="text-xs">NOR</Badge>}
                          </div>
                        </div>
                        {eq.cargo_gross_weight_value && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Gross: {eq.cargo_gross_weight_value} {eq.cargo_gross_weight_unit}
                          </p>
                        )}
                        {eqCommodities.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-muted space-y-1">
                            {eqCommodities.map((c: any) => (
                              <div key={c.id} className="text-xs">
                                <span className="font-medium">{c.hs_code || "—"}</span>
                                {c.package_description && ` · ${c.package_description}`}
                                {c.number_of_packages && ` · ${c.number_of_packages} pkgs`}
                                {c.cargo_gross_weight_value && ` · ${c.cargo_gross_weight_value} ${c.cargo_gross_weight_unit}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commodities">
          <Card>
            <CardHeader><CardTitle className="text-sm">All Commodities</CardTitle></CardHeader>
            <CardContent>
              {!commodities?.length ? (
                <p className="text-muted-foreground text-sm">No commodity records</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">HS Code</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Packages</th>
                        <th className="pb-2">Gross Weight</th>
                        <th className="pb-2">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commodities.map((c: any) => (
                        <tr key={c.id} className="border-b">
                          <td className="py-2 font-mono">{c.hs_code || "—"}</td>
                          <td className="py-2">{c.commodity_type || "—"}</td>
                          <td className="py-2">{c.package_description || "—"}</td>
                          <td className="py-2">{c.number_of_packages ? `${c.number_of_packages} ${c.package_code || ""}` : "—"}</td>
                          <td className="py-2">{c.cargo_gross_weight_value ? `${c.cargo_gross_weight_value} ${c.cargo_gross_weight_unit}` : "—"}</td>
                          <td className="py-2">{c.cargo_gross_volume_value ? `${c.cargo_gross_volume_value} ${c.cargo_gross_volume_unit}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notification History</CardTitle></CardHeader>
            <CardContent>
              {!notifications?.length ? (
                <p className="text-muted-foreground text-sm">No notifications received</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{n.notification_type || "status"}</Badge>
                          {n.booking_status && (
                            <Badge className={STATUS_COLORS[n.booking_status] || "bg-muted"}>
                              {n.booking_status}
                            </Badge>
                          )}
                          {n.amended_booking_status && (
                            <Badge variant="outline">{n.amended_booking_status}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.carrier_booking_reference && `Ref: ${n.carrier_booking_reference} · `}
                          {n.subscription_reference && `Sub: ${n.subscription_reference}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {n.notification_time ? format(new Date(n.notification_time), "PP p") : format(new Date(n.created_at), "PP p")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Status Timeline sub-component ─── */

function BookingStatusTimeline({ booking, notifications }: { booking: any; notifications: any[] }) {
  const LIFECYCLE_STEPS = [
    { key: "submitted", label: "Submitted", icon: ArrowRight },
    { key: "received", label: "Received", icon: CheckCircle2 },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  ];

  const internalStatus = booking.booking_status_internal || "draft";
  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === internalStatus);

  if (internalStatus === "cancelled" || internalStatus === "declined") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-destructive" />
          <span className="font-medium text-destructive">
            Booking {internalStatus === "cancelled" ? "Cancelled" : "Declined"}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (internalStatus === "cancellation_requested") {
    return (
      <Card className="border-orange-300 bg-orange-50">
        <CardContent className="py-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="font-medium text-orange-700">Cancellation Requested — awaiting carrier response</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          {LIFECYCLE_STEPS.map((step, i) => {
            const isComplete = currentIdx >= i;
            const isCurrent = currentIdx === i;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 ${isComplete ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className={`h-4 w-4 ${isCurrent ? "animate-pulse" : ""}`} />
                  <span className={`text-xs ${isCurrent ? "font-semibold" : ""}`}>{step.label}</span>
                </div>
                {i < LIFECYCLE_STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${isComplete && currentIdx > i ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
