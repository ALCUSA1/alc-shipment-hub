import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, AlertCircle, Upload, Download, Loader2 } from "lucide-react";
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
  seaway_bill: "Seaway Bill (SWB)",
  // Air-specific
  mawb: "Master Air Waybill (MAWB)",
  hawb: "House Air Waybill (HAWB)",
  known_shipper_declaration: "Known Shipper Declaration",
  dg_declaration_air: "Shipper's DG Declaration (IATA)",
  cargo_manifest: "Cargo Manifest",
};

export function DocumentChecklist({ shipmentId, userId }: DocumentChecklistProps) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

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

  const completedCount = documents.filter((d) => d.status === "completed" || d.status === "uploaded").length;
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

  const handleUploadClick = (docId: string) => {
    setActiveDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocId) return;

    setUploading(activeDocId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${shipmentId}/${activeDocId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("shipment-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("shipment-documents")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("documents")
        .update({ file_url: urlData.publicUrl, status: "uploaded" })
        .eq("id", activeDocId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["documents", shipmentId] });
      toast({ title: "Document uploaded", description: `${file.name} uploaded successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setActiveDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = (fileUrl: string, docType: string) => {
    window.open(fileUrl, "_blank");
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
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
        />
        <div className="space-y-2">
          {documents.map((doc) => {
            const isCompleted = doc.status === "completed" || doc.status === "uploaded";
            const hasFile = !!doc.file_url;
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
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
                  {doc.status === "uploaded" && (
                    <p className="text-[10px] text-accent">File uploaded</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDownload(doc.file_url!, doc.doc_type)}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5 text-accent" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleUploadClick(doc.id)}
                    disabled={uploading === doc.id}
                    title="Upload file"
                  >
                    {uploading === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {doc.created_at && !isNaN(new Date(doc.created_at).getTime()) ? format(new Date(doc.created_at), "MMM d") : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
