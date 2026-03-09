import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkOperationsPanelProps {
  shipments: any[];
}

const CSV_TEMPLATE = `shipment_type,mode,origin_port,destination_port,pickup_location,delivery_location,commodity,hs_code,gross_weight,volume,num_packages,package_type
export,ocean,USLAX,CNSHA,Los Angeles CA,Shanghai China,Electronics,8471.30,1500,12,10,pallet
import,air,JFKAP,LHRAP,London UK,New York NY,Textiles,6204.43,200,3,5,carton`;

export function BulkOperationsPanel({ shipments }: BulkOperationsPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [showBatchUpdate, setShowBatchUpdate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipment-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Create shipment
          const { data: shipment, error: shipErr } = await supabase
            .from("shipments")
            .insert({
              user_id: user.id,
              shipment_type: row.shipment_type || "export",
              mode: row.mode || "ocean",
              origin_port: row.origin_port || null,
              destination_port: row.destination_port || null,
              pickup_location: row.pickup_location || null,
              delivery_location: row.delivery_location || null,
              status: "draft",
            })
            .select("id")
            .single();

          if (shipErr) throw shipErr;

          // Create cargo if commodity is provided
          if (row.commodity && shipment) {
            await supabase.from("cargo").insert({
              shipment_id: shipment.id,
              commodity: row.commodity,
              hs_code: row.hs_code || null,
              gross_weight: row.gross_weight ? parseFloat(row.gross_weight) : null,
              volume: row.volume ? parseFloat(row.volume) : null,
              num_packages: row.num_packages ? parseInt(row.num_packages) : null,
              package_type: row.package_type || null,
            });
          }

          success++;
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }

      setImportResults({ success, errors });
      if (success > 0) {
        queryClient.invalidateQueries({ queryKey: ["shipments"] });
        toast({ title: "Import Complete", description: `${success} shipment(s) created.` });
      }
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0 || !batchStatus) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: batchStatus })
        .in("id", Array.from(selectedIds));
      if (error) throw error;

      toast({ title: "Batch Update Complete", description: `${selectedIds.size} shipment(s) updated to ${batchStatus.replace(/_/g, " ")}.` });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      setShowBatchUpdate(false);
      setSelectedIds(new Set());
      setBatchStatus("");
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const draftShipments = shipments.filter(s => ["draft", "pending", "booked", "booking_confirmed", "cargo_received"].includes(s.status));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-accent" />
            Bulk Operations
          </CardTitle>
          <CardDescription>Import shipments from CSV or update multiple shipments at once</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBatchUpdate(true)} disabled={draftShipments.length === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Batch Status Update
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Shipments from CSV</DialogTitle>
            <DialogDescription>Upload a CSV file with shipment data. Download the template for the expected format.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {importing ? "Importing…" : "Select CSV File"}
              </Button>
            </div>
            {importResults && (
              <div className="space-y-2">
                {importResults.success > 0 && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResults.success} shipment(s) imported successfully
                  </div>
                )}
                {importResults.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {importResults.errors.length} error(s)
                    </div>
                    <ScrollArea className="max-h-32">
                      {importResults.errors.map((e, i) => (
                        <p key={i} className="text-[11px] text-destructive/80">{e}</p>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Update Dialog */}
      <Dialog open={showBatchUpdate} onOpenChange={setShowBatchUpdate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch Status Update</DialogTitle>
            <DialogDescription>Select shipments and a target status to update them all at once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={batchStatus} onValueChange={setBatchStatus}>
              <SelectTrigger><SelectValue placeholder="Select target status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="booking_confirmed">Booking Confirmed</SelectItem>
                <SelectItem value="cargo_received">Cargo Received</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <ScrollArea className="max-h-48 border rounded-lg">
              {draftShipments.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/30 cursor-pointer">
                  <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelection(s.id)} />
                  <span className="text-sm font-medium text-foreground">{s.shipment_ref}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{s.status.replace(/_/g, " ")}</Badge>
                </label>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchUpdate(false)}>Cancel</Button>
            <Button variant="electric" onClick={handleBatchUpdate} disabled={updating || selectedIds.size === 0 || !batchStatus}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update {selectedIds.size} Shipment{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
