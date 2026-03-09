import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, FileText, Package, CreditCard, Shield, Edit3, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface AuditTrailPanelProps {
  shipmentId: string;
}

const TABLE_ICONS: Record<string, any> = {
  shipments: Package,
  documents: FileText,
  customs_filings: Shield,
  quotes: CreditCard,
  payments: CreditCard,
  shipment_amendments: Edit3,
};

const TABLE_LABELS: Record<string, string> = {
  shipments: "Shipment",
  documents: "Document",
  customs_filings: "Customs Filing",
  quotes: "Quote",
  payments: "Payment",
  shipment_amendments: "Amendment",
};

const ACTION_STYLES: Record<string, { icon: any; color: string; label: string }> = {
  INSERT: { icon: Plus, color: "text-green-600", label: "Created" },
  UPDATE: { icon: Edit3, color: "text-accent", label: "Updated" },
  DELETE: { icon: Trash2, color: "text-destructive", label: "Deleted" },
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  vessel: "Vessel",
  voyage: "Voyage",
  origin_port: "Origin Port",
  destination_port: "Destination Port",
  etd: "ETD",
  eta: "ETA",
  booking_ref: "Booking Ref",
  airline: "Airline",
  flight_number: "Flight",
  mawb_number: "MAWB",
  doc_type: "Document Type",
  file_url: "File",
  filing_type: "Filing Type",
  itn: "ITN",
  amount: "Amount",
  payment_status: "Payment Status",
  carrier_fee_amount: "Carrier Fee",
};

export function AuditTrailPanel({ shipmentId }: AuditTrailPanelProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_log", shipmentId],
    queryFn: async () => {
      // Get all audit logs for this shipment and related records
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .or(`record_id.eq.${shipmentId},new_data->>shipment_id.eq.${shipmentId},old_data->>shipment_id.eq.${shipmentId}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shipmentId,
  });

  if (isLoading || logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-accent" />
          Activity Log
          <Badge variant="secondary" className="text-[10px] ml-auto">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="px-4 pb-4 space-y-1">
            {logs.map((log: any) => {
              const actionInfo = ACTION_STYLES[log.action] || ACTION_STYLES.UPDATE;
              const ActionIcon = actionInfo.icon;
              const TableIcon = TABLE_ICONS[log.table_name] || FileText;
              const tableLabel = TABLE_LABELS[log.table_name] || log.table_name;

              // Build human-readable change description
              const changedFields = log.changed_fields || [];
              const changeDesc = log.action === "UPDATE" && changedFields.length > 0
                ? changedFields
                    .filter((f: string) => !["updated_at", "created_at"].includes(f))
                    .slice(0, 3)
                    .map((f: string) => {
                      const label = FIELD_LABELS[f] || f.replace(/_/g, " ");
                      const newVal = log.new_data?.[f];
                      const oldVal = log.old_data?.[f];
                      if (typeof newVal === "string" && newVal.length < 40) {
                        return `${label}: ${oldVal || "—"} → ${newVal}`;
                      }
                      return label;
                    })
                    .join(", ")
                : log.action === "INSERT"
                  ? `New ${tableLabel.toLowerCase()} created`
                  : log.action === "DELETE"
                    ? `${tableLabel} removed`
                    : "";

              return (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className={`mt-0.5 ${actionInfo.color}`}>
                    <ActionIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <TableIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{tableLabel}</span>
                      <Badge variant="outline" className={`text-[9px] ${actionInfo.color}`}>
                        {actionInfo.label}
                      </Badge>
                    </div>
                    {changeDesc && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{changeDesc}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
