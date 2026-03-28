import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, FileCheck, AlertCircle, Send, Loader2, CheckCircle2, Plane, Ship } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { AesFilingForm } from "./AesFilingForm";

interface CustomsFilingPanelProps {
  shipmentId: string;
  mode?: "ocean" | "air";
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

export function CustomsFilingPanel({ shipmentId, mode = "ocean" }: CustomsFilingPanelProps) {
  const queryClient = useQueryClient();
  const isAir = mode === "air";

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

  const submitMutation = useMutation({
    mutationFn: async (filingId: string) => {
      const { data, error } = await supabase.functions.invoke("submit-aes-filing", {
        body: { action: "submit", shipment_id: shipmentId, filing_id: filingId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customs_filings", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["customs_milestones", shipmentId] });
      if (data?.itn) {
        toast({ title: "AES Filed — ITN Received", description: `ITN: ${data.itn}` });
      } else {
        toast({ title: "AES Filing Submitted", description: "Your filing has been submitted electronically. You'll receive an ITN shortly." });
      }
    },
    onError: (err: any) => {
      toast({ title: "AES Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  const autoCreateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("submit-aes-filing", {
        body: { action: "auto_create", shipment_id: shipmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customs_filings", shipmentId] });
      toast({ title: "Draft Filing Created", description: "A draft AES filing has been pre-filled from shipment data." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create draft", description: err.message, variant: "destructive" });
    },
  });

  const handleFilingSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["customs_filings", shipmentId] });
  };

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
            {isAir && <Badge variant="outline" className="text-[9px] gap-0.5 ml-1"><Plane className="h-2.5 w-2.5" /> Air</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No customs filings for this shipment.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => autoCreateMutation.mutate()}
              disabled={autoCreateMutation.isPending}
            >
              {autoCreateMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shield className="mr-2 h-3.5 w-3.5" />
              )}
              Create Draft Filing
            </Button>
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
        const isDraft = filing.status === "draft";
        const canSubmit = isDraft;
        const isSubmitting = submitMutation.isPending;
        const filingIsAir = filing.mode_of_transport === "air";

        return (
          <Card key={filing.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  {filing.filing_type} Filing
                  {filingIsAir ? (
                    <Badge variant="outline" className="text-[9px] gap-0.5"><Plane className="h-2.5 w-2.5" /> Air</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] gap-0.5"><Ship className="h-2.5 w-2.5" /> Ocean</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      statusStyle[filing.status] ||
                      "bg-secondary text-muted-foreground"
                    }
                    variant="secondary"
                  >
                    {formatLabel(filing.status)}
                  </Badge>
                  {canSubmit && (
                    <Button
                      size="sm"
                      variant="electric"
                      onClick={() => submitMutation.mutate(filing.id)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-3.5 w-3.5" />
                      )}
                      File AES Electronically
                    </Button>
                  )}
                  {filing.status === "accepted" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accepted
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* ITN highlight */}
              {filing.itn && (
                <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Internal Transaction Number (ITN)</p>
                    <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{filing.itn}</p>
                  </div>
                </div>
              )}

              {/* Draft: Show editable form | Non-draft: Show read-only */}
              {isDraft ? (
                <AesFilingForm filing={filing} onSaved={handleFilingSaved} />
              ) : (
                <>
                  <FilingDetails filing={filing} isAir={filingIsAir} />

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
                  {Array.isArray(filing.hts_codes) && filing.hts_codes.length > 0 && (
                    <>
                      <Separator />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        HTS / Schedule B Line Items
                      </h4>
                      <div className="space-y-2">
                        {(filing.hts_codes as any[]).map((item: any, idx: number) => (
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
                        <FileCheck className={`h-3.5 w-3.5 shrink-0 ${ms.status === "error" ? "text-destructive" : "text-accent"}`} />
                        <span className="font-medium text-foreground">
                          {ms.milestone}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(ms.event_date), "MMM d, yyyy HH:mm")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ml-auto ${ms.status === "error" ? "text-destructive border-destructive/30" : ""}`}
                        >
                          {ms.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Notes (only for non-draft, draft has it in the form) */}
              {!isDraft && filing.notes && (
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

function FilingDetails({ filing, isAir }: { filing: any; isAir: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
      <Row label="ITN" value={filing.itn || "—"} />
      <Row label="AES Citation" value={filing.aes_citation || "—"} />
      <Row label="Exporter" value={filing.exporter_name || "—"} />
      <Row label="Exporter EIN" value={filing.exporter_ein || "—"} />
      <Row label="Consignee" value={filing.consignee_name || "—"} />
      <Row label="Country of Destination" value={filing.country_of_destination || "—"} />
      <Row label={isAir ? "Airport of Export" : "Port of Export"} value={filing.port_of_export || "—"} />
      <Row label={isAir ? "Airport of Unlading" : "Port of Unlading"} value={filing.port_of_unlading || "—"} />
      <Row label="Mode of Transport" value={formatLabel(filing.mode_of_transport || "—")} />
      <Row label="Export Date" value={filing.export_date ? format(new Date(filing.export_date), "MMM d, yyyy") : "—"} />
      {isAir ? (
        <>
          <Row label="Airline" value={filing.vessel_name || filing.carrier_name || "—"} />
          <Row label="Flight Number" value={filing.voyage_number || "—"} />
        </>
      ) : (
        <>
          <Row label="Vessel" value={filing.vessel_name || "—"} />
          <Row label="Voyage" value={filing.voyage_number || "—"} />
        </>
      )}
      <Row label="Carrier ID" value={(filing as any).carrier_identification_code || "—"} />
      <Row label="Filing Option" value={(filing as any).filing_option || "—"} />
      <Row label="State of Origin" value={(filing as any).state_of_origin || "—"} />
      <Row label="Containerized" value={(filing as any).containerized ? "Yes" : "No"} />
      <Row label="Hazardous Materials" value={(filing as any).hazardous_materials ? "Yes" : "No"} />
    </div>
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
