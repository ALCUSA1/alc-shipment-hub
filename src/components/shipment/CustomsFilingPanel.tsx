import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, FileCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomsFilingPanelProps {
  shipmentId: string;
}

const statusStyle: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  submitted: "bg-yellow-100 text-yellow-700",
  itn_received: "bg-accent/10 text-accent",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-destructive/10 text-destructive",
};

const formatLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function CustomsFilingPanel({ shipmentId }: CustomsFilingPanelProps) {
  const { data: filings, isLoading } = useQuery({
    queryKey: ["customs_filings", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customs_filings")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
  });

  const { data: milestones } = useQuery({
    queryKey: ["customs_milestones", shipmentId],
    queryFn: async () => {
      if (!filings || filings.length === 0) return [];
      const filingIds = filings.map((f) => f.id);
      const { data, error } = await supabase
        .from("customs_milestones")
        .select("*")
        .in("filing_id", filingIds)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!filings && filings.length > 0,
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!filings || filings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Customs / AES Filing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No customs filings for this shipment.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {filings.map((filing) => {
        const filingMilestones = (milestones || []).filter(
          (m) => m.filing_id === filing.id
        );
        const htsCodes = Array.isArray(filing.hts_codes) ? filing.hts_codes : [];

        return (
          <Card key={filing.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  {filing.filing_type} Filing
                </CardTitle>
                <Badge
                  className={
                    statusStyle[filing.status] ||
                    "bg-secondary text-muted-foreground"
                  }
                  variant="secondary"
                >
                  {formatLabel(filing.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Core filing info */}
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <Row label="ITN" value={filing.itn || "—"} />
                <Row label="AES Citation" value={filing.aes_citation || "—"} />
                <Row label="Exporter" value={filing.exporter_name || "—"} />
                <Row label="Exporter EIN" value={filing.exporter_ein || "—"} />
                <Row label="Consignee" value={filing.consignee_name || "—"} />
                <Row
                  label="Country of Destination"
                  value={filing.country_of_destination || "—"}
                />
                <Row
                  label="Port of Export"
                  value={filing.port_of_export || "—"}
                />
                <Row
                  label="Port of Unlading"
                  value={filing.port_of_unlading || "—"}
                />
                <Row
                  label="Mode of Transport"
                  value={formatLabel(filing.mode_of_transport || "—")}
                />
                <Row
                  label="Export Date"
                  value={
                    filing.export_date
                      ? format(new Date(filing.export_date), "MMM d, yyyy")
                      : "—"
                  }
                />
                <Row label="Vessel" value={filing.vessel_name || "—"} />
                <Row label="Voyage" value={filing.voyage_number || "—"} />
              </div>

              {/* Broker info */}
              {(filing.broker_name || filing.broker_email) && (
                <>
                  <Separator />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Broker Information
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                    <Row label="Broker" value={filing.broker_name || "—"} />
                    <Row label="Broker Ref" value={filing.broker_ref || "—"} />
                    <Row label="Broker Email" value={filing.broker_email || "—"} />
                  </div>
                </>
              )}

              {/* HTS codes */}
              {htsCodes.length > 0 && (
                <>
                  <Separator />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    HTS / Schedule B Line Items
                  </h4>
                  <div className="space-y-2">
                    {htsCodes.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.code || item.hts_code || "—"}
                          </Badge>
                          <span className="text-foreground">
                            {item.description || item.commodity || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          {item.quantity && <span>{item.quantity} units</span>}
                          {item.value && <span>${item.value}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Milestones timeline */}
              {filingMilestones.length > 0 && (
                <>
                  <Separator />
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Filing Milestones
                  </h4>
                  <div className="space-y-2">
                    {filingMilestones.map((ms) => (
                      <div
                        key={ms.id}
                        className="flex items-center gap-3 text-xs"
                      >
                        <FileCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="font-medium text-foreground">
                          {ms.milestone}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(ms.event_date), "MMM d, yyyy HH:mm")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] ml-auto"
                        >
                          {ms.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Notes */}
              {filing.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-foreground">{filing.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
