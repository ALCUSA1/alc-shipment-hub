import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, AlertTriangle, CheckCircle2, Pencil, Zap, X, Save, Loader2, RefreshCw } from "lucide-react";
import { differenceInHours, differenceInDays, format, isPast, subDays, setHours, setMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface CutoffDates {
  cy_cutoff: string | null;
  si_cutoff: string | null;
  vgm_cutoff: string | null;
  doc_cutoff: string | null;
}

interface CutoffTrackerProps {
  cutoffs: CutoffDates;
  shipmentId: string;
  etd?: string | null;
}

interface CutoffItem {
  label: string;
  key: keyof CutoffDates;
  description: string;
  etdOffsetDays: number; // days before ETD
}

const CUTOFFS: CutoffItem[] = [
  { label: "CY Cutoff", key: "cy_cutoff", description: "Container yard closing", etdOffsetDays: 3 },
  { label: "SI Cutoff", key: "si_cutoff", description: "Shipping instructions deadline", etdOffsetDays: 5 },
  { label: "VGM Cutoff", key: "vgm_cutoff", description: "Verified gross mass submission", etdOffsetDays: 4 },
  { label: "Doc Cutoff", key: "doc_cutoff", description: "Documentation deadline", etdOffsetDays: 7 },
];

function getTimeStatus(dateStr: string | null): { text: string; severity: "ok" | "warning" | "critical" | "passed" | "unset" } {
  if (!dateStr) return { text: "Not set", severity: "unset" };
  const date = new Date(dateStr);
  const now = new Date();
  if (isPast(date)) return { text: "Passed", severity: "passed" };
  const hoursLeft = differenceInHours(date, now);
  const daysLeft = differenceInDays(date, now);
  if (hoursLeft <= 24) return { text: `${hoursLeft}h remaining`, severity: "critical" };
  if (hoursLeft <= 48) return { text: `${hoursLeft}h remaining`, severity: "warning" };
  return { text: `${daysLeft}d remaining`, severity: "ok" };
}

function toLocalDatetime(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function CutoffTracker({ cutoffs, shipmentId, etd }: CutoffTrackerProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [draft, setDraft] = useState({
    cy_cutoff: toLocalDatetime(cutoffs.cy_cutoff),
    si_cutoff: toLocalDatetime(cutoffs.si_cutoff),
    vgm_cutoff: toLocalDatetime(cutoffs.vgm_cutoff),
    doc_cutoff: toLocalDatetime(cutoffs.doc_cutoff),
  });

  const hasCutoffs = Object.values(cutoffs).some((v) => v !== null);

  const handleSyncFromCarrier = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-cutoffs", {
        body: { shipment_id: shipmentId },
      });
      if (error) throw error;
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
        toast({ title: "Cutoffs synced", description: data.message });
      } else {
        toast({ title: "Sync unavailable", description: data?.message || "Carrier API not configured for this shipment.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickSet = () => {
    if (!etd) {
      toast({ title: "ETD required", description: "Set an ETD on the shipment first to auto-calculate cutoffs.", variant: "destructive" });
      return;
    }
    const etdDate = new Date(etd);
    const newDraft: Record<string, string> = {};
    for (const c of CUTOFFS) {
      const d = setMinutes(setHours(subDays(etdDate, c.etdOffsetDays), 17), 0);
      newDraft[c.key] = toLocalDatetime(d.toISOString());
    }
    setDraft(newDraft as any);
    setEditing(true);
    toast({ title: "Cutoffs auto-calculated", description: `Based on ETD ${format(etdDate, "MMM d, yyyy")}. Review and save.` });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const update: Record<string, string | null> = {};
      for (const c of CUTOFFS) {
        const val = draft[c.key];
        update[c.key] = val ? new Date(val).toISOString() : null;
      }
      const { error } = await supabase
        .from("shipments")
        .update(update as any)
        .eq("id", shipmentId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      setEditing(false);
      toast({ title: "Cutoffs updated" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    setDraft({
      cy_cutoff: toLocalDatetime(cutoffs.cy_cutoff),
      si_cutoff: toLocalDatetime(cutoffs.si_cutoff),
      vgm_cutoff: toLocalDatetime(cutoffs.vgm_cutoff),
      doc_cutoff: toLocalDatetime(cutoffs.doc_cutoff),
    });
    setEditing(true);
  };

  const severityStyles: Record<string, string> = {
    ok: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    critical: "bg-destructive/5 border-destructive/20 text-destructive",
    passed: "bg-secondary border-border text-muted-foreground",
    unset: "bg-muted/30 border-border text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent" />
            Cutoff Deadlines
          </CardTitle>
          <div className="flex items-center gap-1">
            {!editing && (
              <>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSyncFromCarrier} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Sync
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleQuickSet}>
                  <Zap className="h-3 w-3 mr-1" />
                  Quick Set
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleStartEdit}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {editing ? (
            <>
              {etd && (
                <p className="text-[10px] text-muted-foreground mb-2">
                  ETD: {format(new Date(etd), "MMM d, yyyy")} — Quick Set calculates CY (ETD-3), VGM (ETD-4), SI (ETD-5), Doc (ETD-7)
                </p>
              )}
              {CUTOFFS.map((cutoff) => (
                <div key={cutoff.key}>
                  <Label className="text-xs text-muted-foreground">{cutoff.label}</Label>
                  <Input
                    type="datetime-local"
                    className="mt-1 h-8 text-xs"
                    value={draft[cutoff.key]}
                    onChange={(e) => setDraft({ ...draft, [cutoff.key]: e.target.value })}
                  />
                </div>
              ))}
            </>
          ) : (
            CUTOFFS.map((cutoff) => {
              const dateStr = cutoffs[cutoff.key];
              const status = getTimeStatus(dateStr);

              const Icon = status.severity === "passed" ? CheckCircle2
                : status.severity === "critical" || status.severity === "warning" ? AlertTriangle
                : Timer;

              return (
                <div key={cutoff.key} className={`flex items-center justify-between rounded-lg border p-3 ${severityStyles[status.severity]}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">{cutoff.label}</p>
                      <p className="text-[10px] opacity-70">{cutoff.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{status.text}</p>
                    {dateStr && (
                      <p className="text-[10px] opacity-70">
                        {format(new Date(dateStr), "MMM d, HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
