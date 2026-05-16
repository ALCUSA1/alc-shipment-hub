import { useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Ship, Upload, FileSpreadsheet, RefreshCw, History, AlertTriangle, Plug,
} from "lucide-react";

/* ─── Carrier registry (extensible) ─── */
type CarrierMode = "manual_excel" | "api";
interface CarrierConfig {
  code: string;
  name: string;
  mode: CarrierMode;
  description: string;
}
const CARRIERS: CarrierConfig[] = [
  { code: "EVERGREEN", name: "Evergreen Line", mode: "manual_excel",
    description: "No live rate API. Rates are uploaded manually via Excel sheet." },
  { code: "MAERSK", name: "Maersk", mode: "api",
    description: "Live rate API integration (coming soon)." },
  { code: "MSC", name: "MSC", mode: "api",
    description: "EDI feed integration (coming soon)." },
  { code: "HAPAG", name: "Hapag-Lloyd", mode: "api",
    description: "OAuth API integration (coming soon)." },
  { code: "CMA", name: "CMA CGM", mode: "manual_excel",
    description: "Contract uploads via Excel (coming soon)." },
];

/* ─── Evergreen rate sheet column mapping ───
   Header row contains: Trade | R.GP | Cargo Type | RCT | POL | POD | DLY | SVC Mode | Line | CUR | 2SD | 4SD | 4SH | Surcharge | AMD
*/
interface ParsedRate {
  trade?: string; rate_group?: string; cargo_type?: string;
  receipt?: string; pol?: string; pod?: string; delivery?: string;
  svc_mode?: string; currency?: string;
  rate_20sd?: number | null; rate_40sd?: number | null; rate_40hc?: number | null;
  surcharges?: string; amendment?: string;
}

async function parseEvergreenWorkbook(file: ArrayBuffer): Promise<ParsedRate[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file);
  const ws = wb.worksheets.find((w) => w.name.toLowerCase() === "rate")
    || wb.worksheets.find((w) => w.name.toLowerCase().includes("rate"));
  if (!ws) throw new Error("Could not find a 'Rate' sheet in the workbook.");
  const rows: UnsafeAny[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as UnsafeAny[];
    // exceljs row.values is 1-indexed; slice(1) to make 0-indexed
    const arr = values.slice(1).map((v) => {
      if (v && typeof v === "object" && "result" in v) return (v as UnsafeAny).result; // formulas
      if (v && typeof v === "object" && "text" in v) return (v as UnsafeAny).text; // rich text
      return v ?? null;
    });
    rows.push(arr);
  });

  // Locate header row (looks for the row that contains 'Trade' and 'POL')
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = (rows[i] || []).map((c) => String(c ?? "").trim().toLowerCase());
    if (r.includes("trade") && r.includes("pol") && r.includes("pod")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error("Could not locate header row (Trade/POL/POD) in Rate sheet.");

  const header = (rows[headerIdx] || []).map((c) => String(c ?? "").trim());
  const idx = (label: string) => header.findIndex((h) => h.toLowerCase() === label.toLowerCase());
  const col = {
    trade: idx("Trade"),
    rgp: idx("R.GP"),
    cargo: idx("Cargo Type") !== -1 ? idx("Cargo Type") : header.findIndex(h => /cargo/i.test(h)),
    rct: idx("RCT"), pol: idx("POL"), pod: idx("POD"), dly: idx("DLY"),
    svc: header.findIndex(h => /svc/i.test(h)),
    cur: idx("CUR"),
    r20: header.findIndex(h => /^2sd$/i.test(String(h))),
    r40: header.findIndex(h => /^4sd$/i.test(String(h))),
    r40h: header.findIndex(h => /^4sh$/i.test(String(h))),
    sur: idx("Surcharge"),
    amd: idx("AMD"),
  };

  // Some workbooks split container codes onto a second sub-header row → fall back to columns 10/11/12
  const r20 = col.r20 !== -1 ? col.r20 : 10;
  const r40 = col.r40 !== -1 ? col.r40 : 11;
  const r40h = col.r40h !== -1 ? col.r40h : 12;

  const out: ParsedRate[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const pol = r[col.pol]; const pod = r[col.pod];
    if (!pol || !pod) continue;
    const num = (v: UnsafeAny) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(String(v).replace(/[, ]/g, ""));
      return Number.isFinite(n) ? n : null;
    };
    out.push({
      trade: r[col.trade] != null ? String(r[col.trade]) : undefined,
      rate_group: r[col.rgp] != null ? String(r[col.rgp]) : undefined,
      cargo_type: r[col.cargo] != null ? String(r[col.cargo]) : undefined,
      receipt: r[col.rct] != null ? String(r[col.rct]) : undefined,
      pol: String(pol), pod: String(pod),
      delivery: r[col.dly] != null ? String(r[col.dly]) : undefined,
      svc_mode: r[col.svc] != null ? String(r[col.svc]) : undefined,
      currency: r[col.cur] != null ? String(r[col.cur]) : "USD",
      rate_20sd: num(r[r20]),
      rate_40sd: num(r[r40]),
      rate_40hc: num(r[r40h]),
      surcharges: r[col.sur] != null ? String(r[col.sur]) : undefined,
      amendment: r[col.amd] != null ? String(r[col.amd]) : undefined,
    });
  }
  return out;
}

/* ─── Evergreen tab ─── */
function EvergreenTab() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRate[]>([]);
  const [validFrom, setValidFrom] = useState<string>("");
  const [validTo, setValidTo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UnsafeAny[]>([]);
  const [currentRates, setCurrentRates] = useState<UnsafeAny[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: hist }, { data: rates }] = await Promise.all([
      supabase.from("carrier_rate_uploads" as UnsafeAny).select("*")
        .eq("carrier_code", "EVERGREEN").order("created_at", { ascending: false }).limit(20),
      supabase.from("carrier_manual_rates" as UnsafeAny).select("*")
        .eq("carrier_code", "EVERGREEN").order("pol").limit(500),
    ]);
    setHistory((hist as UnsafeAny[]) || []);
    setCurrentRates((rates as UnsafeAny[]) || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const handleFile = async (f: File) => {
    setFile(f); setParseError(null); setParsed([]);
    try {
      const buf = await f.arrayBuffer();
      const rows = await parseEvergreenWorkbook(buf);
      if (rows.length === 0) throw new Error("No rate rows found.");
      setParsed(rows);
      toast.success(`Parsed ${rows.length} rate rows from ${f.name}`);
    } catch (e: UnsafeAny) {
      setParseError(e?.message || "Failed to parse file");
      toast.error(e?.message || "Failed to parse file");
    }
  };

  const doUpload = async () => {
    if (parsed.length === 0) return;
    setUploading(true);
    try {
      const { data: uploadRow, error: upErr } = await (supabase
        .from("carrier_rate_uploads" as UnsafeAny)
        .insert({
          carrier_code: "EVERGREEN",
          file_name: file?.name || "evergreen_rates.xlsx",
          row_count: parsed.length,
          valid_from: validFrom || null,
          valid_to: validTo || null,
          notes: notes || null,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        } as UnsafeAny)
        .select()
        .single());
      if (upErr) throw upErr;

      // Replace all Evergreen rates
      const { error: delErr } = await supabase
        .from("carrier_manual_rates" as UnsafeAny).delete().eq("carrier_code", "EVERGREEN");
      if (delErr) throw delErr;

      const payload = parsed.map((r) => ({
        ...r,
        carrier_code: "EVERGREEN",
        upload_id: (uploadRow as UnsafeAny).id,
        valid_from: validFrom || null,
        valid_to: validTo || null,
      }));
      // Chunk inserts to keep request size sane
      const chunkSize = 500;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("carrier_manual_rates" as UnsafeAny).insert(chunk as UnsafeAny);
        if (error) throw error;
      }
      toast.success(`Replaced Evergreen rates with ${parsed.length} rows`);
      setFile(null); setParsed([]); setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e: UnsafeAny) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false); setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Ship className="h-4 w-4 text-emerald-400" />
                Evergreen Line — Manual Rate Upload
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Evergreen does not provide a live rate feed. Upload the latest contract Excel sheet to refresh all Evergreen rates.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              <FileSpreadsheet className="h-3 w-3 mr-1" />Manual Excel
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Excel File</Label>
              <Input
                ref={fileRef} type="file" accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Valid From</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="mt-1 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Valid To</Label>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="mt-1 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Amendment 3, Q2 2026 contract" className="mt-1 text-xs" />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
              <p className="text-xs text-red-300">{parseError}</p>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-xs font-medium">Preview — {parsed.length} rows parsed</span>
                <Button size="sm" className="h-7 text-xs" onClick={() => setConfirmOpen(true)} disabled={uploading}>
                  <Upload className="h-3 w-3 mr-1" />
                  Replace all Evergreen rates
                </Button>
              </div>
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Trade</TableHead>
                      <TableHead className="text-[10px]">RG</TableHead>
                      <TableHead className="text-[10px]">Cargo</TableHead>
                      <TableHead className="text-[10px]">POL</TableHead>
                      <TableHead className="text-[10px]">POD</TableHead>
                      <TableHead className="text-[10px]">SVC</TableHead>
                      <TableHead className="text-[10px] text-right">20'SD</TableHead>
                      <TableHead className="text-[10px] text-right">40'SD</TableHead>
                      <TableHead className="text-[10px] text-right">40'HC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[10px]">{r.trade}</TableCell>
                        <TableCell className="text-[10px]">{r.rate_group}</TableCell>
                        <TableCell className="text-[10px]">{r.cargo_type}</TableCell>
                        <TableCell className="text-[10px]">{r.pol}</TableCell>
                        <TableCell className="text-[10px]">{r.pod}</TableCell>
                        <TableCell className="text-[10px]">{r.svc_mode}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{r.rate_20sd ?? "—"}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{r.rate_40sd ?? "—"}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{r.rate_40hc ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.length > 50 && (
                <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t border-border">
                  Showing first 50 of {parsed.length} rows.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current rates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Current Evergreen Rates ({currentRates.length})</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={refresh}>
              <RefreshCw className="h-3 w-3 mr-1" />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-xs text-muted-foreground p-4">Loading…</p>
          ) : currentRates.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No Evergreen rates uploaded yet.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">RG</TableHead>
                    <TableHead className="text-[10px]">Cargo</TableHead>
                    <TableHead className="text-[10px]">POL</TableHead>
                    <TableHead className="text-[10px]">POD</TableHead>
                    <TableHead className="text-[10px]">SVC</TableHead>
                    <TableHead className="text-[10px] text-right">20'SD</TableHead>
                    <TableHead className="text-[10px] text-right">40'SD</TableHead>
                    <TableHead className="text-[10px] text-right">40'HC</TableHead>
                    <TableHead className="text-[10px]">Surcharges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRates.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-[10px]">{r.rate_group}</TableCell>
                      <TableCell className="text-[10px]">{r.cargo_type}</TableCell>
                      <TableCell className="text-[10px]">{r.pol}</TableCell>
                      <TableCell className="text-[10px]">{r.pod}</TableCell>
                      <TableCell className="text-[10px]">{r.svc_mode}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.rate_20sd ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.rate_40sd ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.rate_40hc ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{r.surcharges || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />Upload History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No uploads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">File</TableHead>
                  <TableHead className="text-xs text-right">Rows</TableHead>
                  <TableHead className="text-xs">Valid From</TableHead>
                  <TableHead className="text-xs">Valid To</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-medium">{h.file_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{h.row_count}</TableCell>
                    <TableCell className="text-xs">{h.valid_from || "—"}</TableCell>
                    <TableCell className="text-xs">{h.valid_to || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all Evergreen rates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current {currentRates.length} Evergreen rate rows and replace them with the {parsed.length} rows from <strong>{file?.name}</strong>.
              An audit record will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "Replace rates"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Placeholder tab for carriers not yet wired ─── */
function ComingSoonTab({ carrier }: { carrier: CarrierConfig }) {
  return (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <Plug className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="text-sm font-semibold">{carrier.name}</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{carrier.description}</p>
        <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
      </CardContent>
    </Card>
  );
}

/* ─── Main page ─── */
const AdminShippingLines = () => {
  const [active, setActive] = useState(CARRIERS[0].code);
  const carrier = useMemo(() => CARRIERS.find(c => c.code === active)!, [active]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Ship className="h-5 w-5 text-emerald-400" />
          <h1 className="text-2xl font-bold">Shipping Lines</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage each carrier individually — API integrations and manual rate uploads.
        </p>
      </div>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="bg-transparent p-0 gap-1 mb-6 flex-wrap h-auto">
          {CARRIERS.map((c) => (
            <TabsTrigger
              key={c.code}
              value={c.code}
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border"
            >
              <Ship className="h-3.5 w-3.5 mr-1.5" />
              {c.name}
              <Badge variant="secondary" className="ml-2 text-[9px]">
                {c.mode === "manual_excel" ? "Manual" : "API"}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {CARRIERS.map((c) => (
          <TabsContent key={c.code} value={c.code} className="mt-0">
            {c.code === "EVERGREEN" ? <EvergreenTab /> : <ComingSoonTab carrier={c} />}
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
};

export default AdminShippingLines;
