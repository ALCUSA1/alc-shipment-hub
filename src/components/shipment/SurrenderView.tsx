import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  HandCoins, FileText, Ship, Clock, AlertTriangle, Activity, ArrowRight,
  Users, ChevronDown, ChevronUp, Hash, Shield, CheckCircle2, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  shipmentId: string;
  transportDocumentId?: string;
}

export function SurrenderView({ shipmentId, transportDocumentId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const params = transportDocumentId
        ? `transport_document_id=${transportDocumentId}`
        : `shipment_id=${shipmentId}`;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/surrender-detail?${params}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await resp.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load surrender data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [shipmentId, transportDocumentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const requests = data?.surrender_requests || [];
  const carrier = data?.carrier;
  const td = data?.transport_document;
  const booking = data?.booking;
  const issuance = data?.issuance;

  return (
    <div className="space-y-6">
      {/* ── Header + New Request ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HandCoins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">eBL Surrender</h3>
            <p className="text-sm text-muted-foreground">
              {requests.length} surrender request{requests.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Surrender Request"}
        </Button>
      </div>

      {/* ── Surrender Request Form ── */}
      {showForm && (
        <SurrenderRequestForm
          shipmentId={shipmentId}
          transportDocumentId={transportDocumentId}
          onSubmitted={() => { setShowForm(false); load(); }}
        />
      )}

      {/* ── Empty State ── */}
      {requests.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HandCoins className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>No surrender requests found.</p>
            <p className="text-sm mt-1">Create a surrender request to initiate amendment, switch to paper, or delivery surrender.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Linked Records Summary ── */}
      {(td || booking || issuance) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {td && (
                <LinkedRecord
                  label="Transport Document"
                  value={td.transport_document_reference || td.bill_of_lading_number}
                  status={td.transport_document_status}
                  detail={td.is_electronic === false ? "Switched to paper" : td.is_electronic ? "Electronic" : undefined}
                />
              )}
              {booking && (
                <LinkedRecord label="Booking" value={booking.carrier_booking_number} status={booking.booking_status} />
              )}
              {issuance && (
                <LinkedRecord
                  label="Issuance"
                  value={issuance.issuance_reference}
                  status={issuance.issuance_status_internal}
                  detail={issuance.ebill_platform}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Surrender Request Cards ── */}
      {requests.map((sr: any) => (
        <SurrenderRequestCard
          key={sr.id}
          sr={sr}
          carrier={carrier}
          expandedChain={expandedChain}
          onToggleChain={(id) => setExpandedChain(expandedChain === id ? null : id)}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   Surrender Request Form
   ════════════════════════════════════════════ */

function SurrenderRequestForm({
  shipmentId,
  transportDocumentId,
  onSubmitted,
}: {
  shipmentId: string;
  transportDocumentId?: string;
  onSubmitted: () => void;
}) {
  const [requestCode, setRequestCode] = useState("SREQ");
  const [reasonCode, setReasonCode] = useState("");
  const [comments, setComments] = useState("");
  const [tdRef, setTdRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load TD ref from transport document
  useEffect(() => {
    if (transportDocumentId) {
      supabase
        .from("transport_documents")
        .select("transport_document_reference, alc_carrier_id")
        .eq("id", transportDocumentId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.transport_document_reference) setTdRef(data.transport_document_reference);
        });
    }
  }, [transportDocumentId]);

  const handleSubmit = async () => {
    if (!tdRef) {
      toast.error("Transport Document Reference is required");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("surrender-submit", {
        body: {
          carrier_code: "EGLV", // Will be resolved dynamically in the future
          payload: {
            surrenderRequestReference: `SURR-${Date.now()}`,
            transportDocumentReference: tdRef,
            surrenderRequestCode: requestCode,
            reasonCode: reasonCode || undefined,
            comments: comments || undefined,
          },
        },
      });

      if (error) throw error;
      toast.success("Surrender request submitted successfully");
      onSubmitted();
    } catch (err: any) {
      toast.error(`Failed to submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Surrender Request</CardTitle>
        <CardDescription>Submit an eBL surrender request to the carrier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Transport Document Reference</Label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={tdRef}
              onChange={(e) => setTdRef(e.target.value)}
              placeholder="e.g. EGLV1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label>Request Code</Label>
            <Select value={requestCode} onValueChange={setRequestCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SREQ">SREQ — Standard Surrender</SelectItem>
                <SelectItem value="SWTP">SWTP — Switch to Paper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason Code (optional)</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AMENDMENT">Amendment</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
                <SelectItem value="SWITCH">Switch to Paper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Comments (optional)</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Additional notes for the carrier..."
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Surrender Request"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════
   Surrender Request Card
   ════════════════════════════════════════════ */

function SurrenderRequestCard({
  sr,
  carrier,
  expandedChain,
  onToggleChain,
}: {
  sr: any;
  carrier: any;
  expandedChain: string | null;
  onToggleChain: (id: string) => void;
}) {
  const statusColor = (s: string) => {
    const lower = (s || "").toLowerCase();
    if (["accepted", "completed", "surrender_requested"].includes(lower))
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    if (["submitted", "pending", "switch_to_paper"].includes(lower))
      return "bg-amber-500/10 text-amber-700 border-amber-200";
    if (["rejected", "submission_failed", "validation_failed"].includes(lower))
      return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-muted text-muted-foreground";
  };

  const chain = sr.endorsement_chain || [];
  const responses = sr.responses || [];
  const errors = sr.errors || [];
  const displayStatus = sr.surrender_status_internal || "draft";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HandCoins className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">
                {sr.surrender_request_reference || sr.transport_document_reference || "Surrender Request"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-0.5">
                {sr.surrender_request_code && (
                  <span className="font-mono text-xs">{sr.surrender_request_code}</span>
                )}
                {sr.reason_code && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-xs">{sr.reason_code}</span>
                  </>
                )}
                {carrier && <span className="text-xs">· {carrier.carrier_name}</span>}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColor(displayStatus)} variant="outline">
            {displayStatus.toUpperCase().replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Details Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sr.transport_document_reference && (
            <InfoItem icon={FileText} label="TD Reference" value={sr.transport_document_reference} />
          )}
          {sr.surrender_request_reference && (
            <InfoItem icon={Hash} label="Surrender Ref" value={sr.surrender_request_reference} />
          )}
          {sr.request_submitted_at && (
            <InfoItem icon={Clock} label="Submitted" value={new Date(sr.request_submitted_at).toLocaleString()} />
          )}
          {sr.callback_received_at && (
            <InfoItem icon={Clock} label="Callback" value={new Date(sr.callback_received_at).toLocaleString()} />
          )}
        </div>

        {sr.comments && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-xs text-muted-foreground mb-1">Comments</p>
            {sr.comments}
          </div>
        )}

        {/* ── Code Mapping ── */}
        {sr.code_mapping && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{sr.code_mapping.external_name}</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline">{sr.code_mapping.internal_status}</Badge>
            {sr.code_mapping.description && (
              <span className="text-muted-foreground">— {sr.code_mapping.description}</span>
            )}
          </div>
        )}

        {/* ── Callback Responses ── */}
        {responses.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Carrier Responses ({responses.length})
              </h4>
              <div className="space-y-2">
                {responses.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {r.response_status_internal === "accepted" || r.response_status_internal === "completed"
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : r.response_status_internal === "rejected"
                        ? <XCircle className="h-4 w-4 text-destructive" />
                        : <Clock className="h-4 w-4 text-amber-600" />}
                      <div>
                        <p className="text-sm font-medium">
                          {r.surrender_response_code || "Response"}
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {r.response_status_internal}
                          </Badge>
                        </p>
                        {r.surrender_response_message && (
                          <p className="text-xs text-muted-foreground">{r.surrender_response_message}</p>
                        )}
                      </div>
                    </div>
                    {r.callback_received_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.callback_received_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Errors ── */}
        {errors.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Errors ({errors.length})
              </h4>
              <div className="space-y-2">
                {errors.map((err: any, i: number) => (
                  <div key={err.id || i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                    <div className="flex items-center gap-2">
                      {err.error_code && (
                        <Badge variant="outline" className="text-xs font-mono text-destructive border-destructive/30">
                          {err.error_code}
                        </Badge>
                      )}
                      {err.error_code_text && (
                        <span className="text-xs font-medium text-destructive">{err.error_code_text}</span>
                      )}
                    </div>
                    <p className="text-sm">{err.error_message}</p>
                    {err.property_name && (
                      <p className="text-xs text-muted-foreground">
                        Field: <span className="font-mono">{err.property_name}</span>
                        {err.property_value && <> = <span className="font-mono">{err.property_value}</span></>}
                        {err.json_path && <> ({err.json_path})</>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Endorsement Chain ── */}
        {chain.length > 0 && (
          <>
            <Separator />
            <div>
              <button
                onClick={() => onToggleChain(sr.id)}
                className="flex items-center gap-2 text-sm font-medium w-full text-left hover:text-primary transition-colors"
              >
                <Users className="h-4 w-4" />
                Endorsement Chain ({chain.length})
                {expandedChain === sr.id
                  ? <ChevronUp className="h-4 w-4 ml-auto" />
                  : <ChevronDown className="h-4 w-4 ml-auto" />}
              </button>
              {expandedChain === sr.id && (
                <div className="mt-3 space-y-3">
                  {chain.map((entry: any, i: number) => (
                    <div key={entry.id || i} className="relative pl-6 pb-3 border-l-2 border-muted last:border-0 last:pb-0">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            #{entry.sequence_number}
                          </Badge>
                          {entry.action_code && (
                            <Badge variant="secondary" className="text-xs">{entry.action_code}</Badge>
                          )}
                          {entry.action_datetime && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.action_datetime).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Actor</p>
                            <p className="text-sm font-medium">{entry.actor_party_name || "—"}</p>
                            {entry.actor_ebl_platform && (
                              <p className="text-xs text-muted-foreground">{entry.actor_ebl_platform}</p>
                            )}
                            {entry.actor_party_code && (
                              <p className="text-xs font-mono text-muted-foreground">{entry.actor_party_code}</p>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Recipient</p>
                            <p className="text-sm font-medium">{entry.recipient_party_name || "—"}</p>
                            {entry.recipient_ebl_platform && (
                              <p className="text-xs text-muted-foreground">{entry.recipient_ebl_platform}</p>
                            )}
                            {entry.recipient_party_code && (
                              <p className="text-xs font-mono text-muted-foreground">{entry.recipient_party_code}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Raw Sync Indicator ── */}
        <Separator />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>Source: raw message {sr.source_message_id?.slice(0, 8)}…</span>
          {sr.updated_at && <span>· Updated {new Date(sr.updated_at).toLocaleString()}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium break-all">{value}</p>
    </div>
  );
}

function LinkedRecord({ label, value, status, detail }: { label: string; value?: string; status?: string; detail?: string }) {
  if (!value) return null;
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-medium">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      {status && (
        <Badge variant="secondary" className="text-xs capitalize">
          {status.replace(/_/g, " ")}
        </Badge>
      )}
    </div>
  );
}
