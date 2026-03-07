import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DocumentChecklistProps {
  shipmentId: string;
  userId: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  bill_of_lading: "Bill of Lading",
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  certificate_of_origin: "Certificate of Origin",
  shipper_letter_of_instruction: "Shipper's Letter of Instruction",
  dock_receipt: "Dock Receipt",
  insurance_certificate: "Insurance Certificate",
  aes_filing: "AES Filing / ITN",
};

export function DocumentChecklist({ shipmentId, userId }: DocumentChecklistProps) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const completedCount = documents.filter((d) => d.status === "completed").length;
  const totalCount = documents.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  const toggleStatus = async (docId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    setUpdating(docId);
    try {
      const { error } = await supabase
        .from("documents")
        .update({ status: newStatus })
        .eq("id", docId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["documents", shipmentId] });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  if (totalCount === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Document Checklist
          </CardTitle>
          <Badge
            variant="secondary"
            className={allComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
          >
            {allComplete ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> All Complete</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> {completedCount}/{totalCount}</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => {
            const isCompleted = doc.status === "completed";
            return (
              <label
                key={doc.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isCompleted ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={isCompleted}
                  disabled={updating === doc.id}
                  onCheckedChange={() => toggleStatus(doc.id, doc.status)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(doc.created_at), "MMM d")}
                </span>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
