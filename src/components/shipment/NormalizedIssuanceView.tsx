import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, Ship, Hash, Clock, User, Layers, FileText, Shield } from "lucide-react";

interface Props {
  shipmentId: string;
}

export function NormalizedIssuanceView({ shipmentId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: result } = await supabase.functions.invoke("issuance-detail", {
          body: null,
          headers: { "Content-Type": "application/json" },
          method: "GET",
        });
        // The edge function uses query params, so we construct the URL manually
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const resp = await fetch(
          `https://${projectId}.supabase.co/functions/v1/issuance-detail?shipment_id=${shipmentId}`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
          }
        );
        const json = await resp.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load issuance data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shipmentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.issuance_record) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>No eBL issuance record found for this shipment.</p>
          <p className="text-sm mt-1">Issuance data will appear here once the carrier issues an electronic Bill of Lading.</p>
        </CardContent>
      </Card>
    );
  }

  const iss = data.issuance_record;
  const carrier = data.carrier;
  const td = data.transport_document;
  const codeDef = data.response_code_definition;
  const booking = data.booking;
  const si = data.shipping_instruction;
  const references = data.references || [];
  const documents = data.documents || [];

  const statusColor = (s: string) => {
    const lower = (s || "").toLowerCase();
    if (lower === "completed" || lower === "issued") return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    if (lower === "pending" || lower === "processing") return "bg-amber-500/10 text-amber-700 border-amber-200";
    if (lower === "rejected" || lower === "failed") return "bg-red-500/10 text-red-700 border-red-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* ── Issuance Summary Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">eBL Issuance</CardTitle>
                <CardDescription>Electronic Bill of Lading issuance confirmation</CardDescription>
              </div>
            </div>
            <Badge className={statusColor(iss.issuance_status)} variant="outline">
              {(iss.issuance_status || "Unknown").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {iss.issuance_reference && (
              <InfoItem icon={Hash} label="Issuance Reference" value={iss.issuance_reference} />
            )}
            {iss.ebill_identifier && (
              <InfoItem icon={Shield} label="eBL Identifier" value={iss.ebill_identifier} />
            )}
            {iss.ebill_platform && (
              <InfoItem icon={Layers} label="eBL Platform" value={iss.ebill_platform} />
            )}
            {carrier && (
              <InfoItem icon={Ship} label="Carrier" value={`${carrier.carrier_name} (${carrier.carrier_code})`} />
            )}
            {iss.issuer_name && (
              <InfoItem icon={User} label="Issuer" value={iss.issuer_name} />
            )}
            {iss.receiver_name && (
              <InfoItem icon={User} label="Receiver" value={iss.receiver_name} />
            )}
            {iss.issuance_completed_at && (
              <InfoItem icon={Clock} label="Issued At" value={new Date(iss.issuance_completed_at).toLocaleString()} />
            )}
            {iss.issuance_requested_at && (
              <InfoItem icon={Clock} label="Requested At" value={new Date(iss.issuance_requested_at).toLocaleString()} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Response Code ── */}
      {iss.issuance_response_code && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Response Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Badge variant="outline" className="font-mono text-sm">
                {iss.issuance_response_code}
              </Badge>
              <div className="space-y-1">
                {codeDef?.response_name && (
                  <p className="font-medium text-sm">{codeDef.response_name}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {iss.issuance_response_message || codeDef?.response_description || "No description available"}
                </p>
                {codeDef?.status_category && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {codeDef.status_category}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Linked Records ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Linked Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {td && (
              <LinkedRecord
                label="Transport Document"
                value={td.transport_document_reference || td.bill_of_lading_number}
                status={td.transport_document_status}
                detail={td.bill_of_lading_number ? `B/L: ${td.bill_of_lading_number}` : undefined}
              />
            )}
            {booking && (
              <LinkedRecord
                label="Booking"
                value={booking.carrier_booking_number}
                status={booking.booking_status}
              />
            )}
            {si && (
              <LinkedRecord
                label="Shipping Instruction"
                value={si.shipping_instruction_reference}
                status={si.shipping_instruction_status}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── References ── */}
      {references.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">References</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {references.map((ref: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground capitalize">
                    {(ref.reference_type || "").replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-mono font-medium">{ref.reference_value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Documents ── */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issued Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">{(doc.document_type || "").replace(/_/g, " ")}</p>
                    {doc.document_reference && (
                      <p className="text-xs text-muted-foreground font-mono">{doc.document_reference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
