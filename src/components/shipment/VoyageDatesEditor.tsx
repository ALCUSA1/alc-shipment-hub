import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, Pencil, X, Save, Loader2, Anchor } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface VoyageDatesEditorProps {
  shipmentId: string;
  etd: string | null;
  eta: string | null;
  vessel: string | null;
  voyage: string | null;
  readOnly?: boolean;
}

export function VoyageDatesEditor({ shipmentId, etd, eta, vessel, voyage, readOnly = false }: VoyageDatesEditorProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ etd: etd || "", eta: eta || "", vessel: vessel || "", voyage: voyage || "" });

  const handleStartEdit = () => {
    setDraft({ etd: etd || "", eta: eta || "", vessel: vessel || "", voyage: voyage || "" });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("shipments")
        .update({
          etd: draft.etd || null,
          eta: draft.eta || null,
          vessel: draft.vessel || null,
          voyage: draft.voyage || null,
        })
        .eq("id", shipmentId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      setEditing(false);
      toast({ title: "Voyage details updated", description: "ETD, ETA, vessel and voyage have been saved." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4 text-accent" />
            Shipping Line Schedule
          </CardTitle>
          {!editing && !readOnly ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleStartEdit}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          ) : !editing && readOnly ? null : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground">
              Enter voyage schedule as received from the shipping line.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Vessel</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="e.g. EVER GIVEN"
                  value={draft.vessel}
                  onChange={(e) => setDraft({ ...draft, vessel: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Voyage</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="e.g. 123E"
                  value={draft.voyage}
                  onChange={(e) => setDraft({ ...draft, voyage: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ETD (Estimated Departure)</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={draft.etd}
                onChange={(e) => setDraft({ ...draft, etd: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ETA (Estimated Arrival)</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={draft.eta}
                onChange={(e) => setDraft({ ...draft, eta: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{vessel || "TBD"}</p>
                  <p className="text-[10px] text-muted-foreground">Vessel / Voyage {voyage || "—"}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ETD</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {etd ? format(new Date(etd), "MMM d, yyyy") : "Not set"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-muted/20">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ETA</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {eta ? format(new Date(eta), "MMM d, yyyy") : "Not set"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
