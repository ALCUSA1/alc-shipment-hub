import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Ship, Users, Package, MapPin, DollarSign, ScrollText, Anchor, Container, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  shipmentId: string;
}

export function NormalizedTransportDocView({ shipmentId }: Props) {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/td-detail?shipment_id=${shipmentId}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shipmentId, session]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!data?.transport_document) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No transport document data available for this shipment yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Transport documents will appear here once issued by the carrier.</p>
        </CardContent>
      </Card>
    );
  }

  const td = data.transport_document;
  const carrier = data.carrier;
  const si = data.shipping_instruction;
  const parties = data.parties || [];
  const consignmentItems = data.consignment_items || [];
  const equipments = data.equipments || [];
  const charges = data.charges || [];
  const instructions = data.instructions || [];
  const references = data.references || [];
  const transportPlan = data.transport_plan || [];
  const cargoDetails = data.cargo_details || [];
  const routeLocations = data.route_locations || {};
  const issueLocation = data.issue_location;

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      issued: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      draft: "bg-amber-500/10 text-amber-700 border-amber-200",
      surrendered: "bg-blue-500/10 text-blue-700 border-blue-200",
      void: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return map[s?.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  };

  const shipper = parties.find((p: any) => p.party_role === "shipper");
  const consignee = parties.find((p: any) => p.party_role === "consignee");
  const notifyParty = parties.find((p: any) => p.party_role === "notify_party");

  const locName = (loc: any) => loc?.location_name || loc?.city || loc?.unlocode || "—";

  return (
    <div className="space-y-6">
      {/* ── Transport Document Summary ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Transport Document
            </CardTitle>
            <Badge variant="outline" className={statusColor(td.transport_document_status)}>
              {td.transport_document_status?.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
          {carrier && <CardDescription>Carrier: {carrier.carrier_name} ({carrier.carrier_code})</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem label="TD Reference" value={td.transport_document_reference} />
            <InfoItem label="B/L Number" value={td.bill_of_lading_number} />
            <InfoItem label="Document Type" value={td.transport_document_type_code === "SWB" ? "Sea Waybill" : td.transport_document_type_code === "BOL" ? "Bill of Lading" : td.transport_document_type_code} />
            <InfoItem label="Issue Date" value={td.issue_date} />
            <InfoItem label="Issue Location" value={locName(issueLocation)} />
            <InfoItem label="Shipped on Board" value={td.shipped_on_board_date} />
            <InfoItem label="Originals" value={td.number_of_originals} />
            <InfoItem label="Copies" value={td.number_of_copies} />
            <div className="flex gap-3">
              {td.is_electronic && <Badge variant="outline" className="text-xs">Electronic</Badge>}
              {td.is_surrendered && <Badge variant="outline" className="text-xs">Surrendered</Badge>}
            </div>
          </div>

          {si && (
            <>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Shipping Instruction Ref" value={si.shipping_instruction_reference} />
                <InfoItem label="SI Status" value={si.shipping_instruction_status} />
              </div>
            </>
          )}

          {(td.declared_value || td.freight_payment_term_code) && (
            <>
              <Separator />
              <div className="grid sm:grid-cols-3 gap-4">
                {td.declared_value && <InfoItem label="Declared Value" value={`${td.declared_value} ${td.declared_value_currency || ""}`} />}
                <InfoItem label="Freight Terms" value={td.freight_payment_term_code} />
                <InfoItem label="Origin Charges" value={td.origin_charge_payment_term_code} />
                <InfoItem label="Destination Charges" value={td.destination_charge_payment_term_code} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Route ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            {[
              { label: "Place of Receipt", loc: routeLocations.origin },
              { label: "Port of Loading", loc: routeLocations.pol },
              { label: "Port of Discharge", loc: routeLocations.pod },
              { label: "Place of Delivery", loc: routeLocations.destination },
            ].map((stop, idx, arr) => (
              <div key={stop.label} className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stop.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{locName(stop.loc)}</p>
                  {stop.loc?.country && <p className="text-[10px] text-muted-foreground">{stop.loc.country}</p>}
                </div>
                {idx < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Parties ── */}
      {parties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Shipper", party: shipper },
                { label: "Consignee", party: consignee },
                { label: "Notify Party", party: notifyParty },
              ].filter(p => p.party).map(({ label, party }) => (
                <div key={label} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{party.company_name || party.contact_name}</p>
                  {party.address && <p className="text-xs text-muted-foreground">{party.address}</p>}
                  {(party.city || party.country) && <p className="text-xs text-muted-foreground">{[party.city, party.state, party.country].filter(Boolean).join(", ")}</p>}
                  {party.email && <p className="text-xs text-muted-foreground">{party.email}</p>}
                </div>
              ))}
              {parties.filter((p: any) => !["shipper", "consignee", "notify_party"].includes(p.party_role)).map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{p.party_role?.replace(/_/g, " ")}</p>
                  <p className="text-sm font-medium text-foreground">{p.company_name || p.contact_name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Equipment ── */}
      {equipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Anchor className="h-4 w-4 text-primary" />Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipments.map((eq: any) => (
                <div key={eq.id} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <p className="text-sm font-semibold text-foreground font-mono">{eq.container_number || eq.equipment_reference || "—"}</p>
                  <p className="text-xs text-muted-foreground">ISO: {eq.iso_equipment_code || eq.equipment_type_code || "—"}</p>
                  {eq.seal_number && <p className="text-xs text-muted-foreground">Seal: {eq.seal_number}</p>}
                  <div className="flex gap-1 mt-1">
                    {eq.dangerous_goods_flag && <Badge variant="destructive" className="text-[10px] px-1.5">DG</Badge>}
                    {eq.overdimension_flag && <Badge variant="outline" className="text-[10px] px-1.5">OOG</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Consignment Items ── */}
      {consignmentItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Consignment Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Description</th>
                    <th className="text-left py-2 pr-3">HS Code</th>
                    <th className="text-right py-2 pr-3">Packages</th>
                    <th className="text-right py-2 pr-3">Gross Wt</th>
                    <th className="text-right py-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {consignmentItems.map((ci: any) => (
                    <tr key={ci.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 text-muted-foreground">{ci.consignment_item_number}</td>
                      <td className="py-2 pr-3 font-medium">{ci.description || "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{ci.harmonized_system_code || "—"}</td>
                      <td className="py-2 pr-3 text-right">{ci.package_quantity ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{ci.gross_weight ? `${ci.gross_weight} kg` : "—"}</td>
                      <td className="py-2 text-right">{ci.volume ? `${ci.volume} cbm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Transport Plan / Voyage ── */}
      {transportPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Ship className="h-4 w-4 text-primary" />Transport Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transportPlan.map((leg: any) => (
              <div key={leg.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 border border-border">
                <div className="flex-1 grid sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Leg {leg.sequence_number}</p>
                    <p className="font-medium">{leg.vessel_name || leg.transport_mode}</p>
                    {leg.voyage_number && <p className="text-xs text-muted-foreground">Voyage: {leg.voyage_number}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Load</p>
                    <p className="font-medium">{locName(leg.load_loc)}</p>
                    {leg.planned_departure && <p className="text-xs text-muted-foreground">{leg.planned_departure}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Discharge</p>
                    <p className="font-medium">{locName(leg.discharge_loc)}</p>
                    {leg.planned_arrival && <p className="text-xs text-muted-foreground">{leg.planned_arrival}</p>}
                  </div>
                  {leg.service_name && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Service</p>
                      <p className="font-medium">{leg.service_name}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Charges ── */}
      {charges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-3">Charge</th>
                    <th className="text-right py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pr-3">Currency</th>
                    <th className="text-left py-2">Payment Term</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((ch: any) => (
                    <tr key={ch.id} className="border-b border-border/50">
                      <td className="py-2 pr-3">{ch.charge_description || ch.charge_code || "—"}</td>
                      <td className="py-2 pr-3 text-right font-mono">{ch.amount?.toLocaleString() ?? "—"}</td>
                      <td className="py-2 pr-3">{ch.currency_code || "—"}</td>
                      <td className="py-2">{ch.payment_term_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Clauses / Instructions ── */}
      {instructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" />Document Clauses & Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {instructions.map((instr: any) => (
              <div key={instr.id} className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{instr.instruction_type?.replace(/_/g, " ")}</p>
                <p className="text-sm text-foreground">{instr.instruction_text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── References ── */}
      {references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />References</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {references.map((ref: any) => (
                <div key={ref.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ref.reference_type?.replace(/_/g, " ")}</p>
                    <p className="text-sm font-mono font-medium">{ref.reference_value}</p>
                  </div>
                  {ref.is_primary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: any }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{String(value)}</p>
    </div>
  );
}
