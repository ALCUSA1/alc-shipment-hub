import { useState, useRef } from "react";
import { useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, AlertCircle, Upload, Download, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { DOC_TYPE_LABELS, DOC_SOURCE, DOC_SOURCE_META, type DocSource } from "@/lib/document-types";

interface DocumentChecklistProps {
  shipmentId: string;
  userId: string;
  shipmentMode?: string;
  shipmentType?: string;
  lifecycleStage?: string;
  hasCustomsClearance?: boolean;
  hasInsurance?: boolean;
  hasDangerousGoods?: boolean;
  paymentStatus?: string;
}

/**
 * Returns the list of doc_types that should exist for this shipment
 * based on mode, type, lifecycle, and services.
 */
function getRequiredDocTypes(
  mode?: string,
  shipmentType?: string,
  lifecycleStage?: string,
  hasCustomsClearance?: boolean,
  hasInsurance?: boolean,
  hasDangerousGoods?: boolean,
): string[] {
  const docs: string[] = [];

  // Universal documents for every shipment
  docs.push("commercial_invoice", "packing_list", "shipper_letter_of_instruction");

  const isOcean = mode === "ocean" || mode === "sea";
  const isAir = mode === "air";

  if (isOcean) {
    docs.push("bill_of_lading", "dock_receipt", "cargo_manifest");
    // SWB is generated after payment
    docs.push("seaway_bill");
  }

  if (isAir) {
    docs.push("mawb", "hawb", "known_shipper_declaration");
  }

  // AES / Customs is always relevant for exports
  if (shipmentType === "export" || !shipmentType) {
    docs.push("aes_filing");
  }

  if (hasCustomsClearance) {
    docs.push("customs_declaration");
  }

  if (hasInsurance) {
    docs.push("insurance_certificate");
  }

  if (hasDangerousGoods) {
    if (isAir) {
      docs.push("dg_declaration_air");
    }
  }

  docs.push("certificate_of_origin");

  // Deduplicate
  return [...new Set(docs)];
}

export function DocumentChecklist({
  shipmentId,
  userId,
  shipmentMode,
  shipmentType,
  lifecycleStage,
  hasCustomsClearance,
  hasInsurance,
  hasDangerousGoods,
  paymentStatus,
}: DocumentChecklistProps) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

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

  // Auto-seed required document placeholders if none exist
  const seedDocuments = useCallback(async () => {
    if (seeding || seeded || documents.length > 0 || !userId) return;
    setSeeding(true);
    try {
      // Double-check DB to avoid duplicates from race conditions
      const { data: existing } = await supabase.from("documents").select("id").eq("shipment_id", shipmentId).limit(1);
      if (existing && existing.length > 0) {
        setSeeded(true);
        queryClient.invalidateQueries({ queryKey: ["documents", shipmentId] });
        return;
      }
      const requiredTypes = getRequiredDocTypes(
        shipmentMode, shipmentType, lifecycleStage,
        hasCustomsClearance, hasInsurance, hasDangerousGoods,
      );
      const rows = requiredTypes.map((docType) => ({
        shipment_id: shipmentId,
        user_id: userId,
        doc_type: docType,
        status: "pending",
        file_url: "",
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("documents").insert(rows);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["documents", shipmentId] });
        setSeeded(true);
      }
    } catch (err: any) {
      console.error("Failed to seed documents:", err);
    } finally {
      setSeeding(false);
    }
  }, [shipmentId, userId, documents.length, seeding, seeded, shipmentMode, shipmentType, lifecycleStage, hasCustomsClearance, hasInsurance, hasDangerousGoods, queryClient]);

  useEffect(() => {
    if (documents.length === 0 && userId && !seeding && !seeded) {
      seedDocuments();
    }
  }, [documents.length, userId, seedDocuments, seeding, seeded]);

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

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Document Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 text-muted-foreground/40 mx-auto animate-spin" />
            <p className="text-sm text-muted-foreground">Preparing document checklist…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group documents by source — carrier first
  const sourceOrder: DocSource[] = ["carrier", "platform", "shipper"];
  const groupedBySource = sourceOrder.map((source) => ({
    source,
    meta: DOC_SOURCE_META[source],
    docs: documents.filter((d) => (DOC_SOURCE[d.doc_type] || "shipper") === source),
  })).filter((g) => g.docs.length > 0);

  const renderDocRow = (doc: any) => {
    const isCompleted = doc.status === "completed" || doc.status === "uploaded";
    const hasFile = !!doc.file_url;
    const source = DOC_SOURCE[doc.doc_type] || "shipper";
    const isCarrier = source === "carrier";
    const isPlatform = source === "platform";
    const isAvailable = hasFile && doc.file_url;
    const isSWB = doc.doc_type === "seaway_bill";
    const isPaymentBlocked = isSWB && paymentStatus !== "completed" && paymentStatus !== "succeeded" && !isAvailable;
    return (
      <div
        key={doc.id}
        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors border ${
          isCompleted ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30"
          : isPaymentBlocked ? "bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/20"
          : isCarrier && !isAvailable ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/20"
          : "hover:bg-muted/50 border-transparent"
        }`}
      >
        {isPaymentBlocked ? (
          <Lock className="h-4 w-4 text-red-500 shrink-0" />
        ) : (
          <Checkbox
            checked={isCompleted}
            disabled={updating === doc.id}
            onCheckedChange={() => toggleStatus(doc.id, doc.status)}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
          </p>
          {isPaymentBlocked ? (
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">🔒 Blocked — payment must be received by shipping line before release</p>
          ) : isAvailable ? (
            <p className="text-[10px] text-accent font-medium">✓ Available for download</p>
          ) : doc.status === "uploaded" ? (
            <p className="text-[10px] text-accent">File uploaded</p>
          ) : isPlatform ? (
            <p className="text-[10px] text-muted-foreground">Auto-generated from shipment data</p>
          ) : isCarrier ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⏳ Pending — awaiting from shipping line</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Upload required</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status badge for carrier docs */}
          {isCarrier && (
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${
              isAvailable
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : isPaymentBlocked
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>
              {isAvailable ? "Ready" : isPaymentBlocked ? "Held" : "Pending"}
            </Badge>
          )}
          {isAvailable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-accent hover:text-accent/80"
              onClick={() => handleDownload(doc.file_url!, doc.doc_type)}
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isCarrier && (
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
          )}
          {isCarrier && !isAvailable && (
            <Download className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
          <span className="text-[10px] text-muted-foreground w-10 text-right">
            {doc.created_at && !isNaN(new Date(doc.created_at).getTime()) ? format(new Date(doc.created_at), "MMM d") : "—"}
          </span>
        </div>
      </div>
    );
  };

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
        <div className="space-y-5">
          {groupedBySource.map((group) => (
            <div key={group.source}>
              <div className="flex items-center gap-2 mb-2">
                <group.meta.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.meta.label}</h4>
                  <p className="text-[10px] text-muted-foreground/70">{group.meta.description}</p>
                </div>
              </div>
              <div className="space-y-1">
                {group.docs.map(renderDocRow)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
