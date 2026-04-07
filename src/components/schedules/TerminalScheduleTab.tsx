import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Anchor, Clock, Ship, Search, Loader2, AlertCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type TerminalSchedule = {
  id: string;
  terminal_code: string;
  terminal_name: string;
  port_unlocode: string;
  port_name: string;
  vessel_name: string | null;
  vessel_imo: string | null;
  voyage_number: string | null;
  service_code: string | null;
  carrier_code: string | null;
  berth: string | null;
  eta: string | null;
  ata: string | null;
  etd: string | null;
  atd: string | null;
  begin_receive_date: string | null;
  cargo_cutoff_date: string | null;
  hazmat_cutoff_date: string | null;
  reefer_cutoff_date: string | null;
  data_source: string;
};

const PORT_OPTIONS = [
  { value: "", label: "All Ports" },
  { value: "USLAX", label: "Los Angeles" },
  { value: "USLGB", label: "Long Beach" },
  { value: "USNYC", label: "New York / New Jersey" },
  { value: "USHOU", label: "Houston" },
  { value: "USSAV", label: "Savannah" },
];

const SOURCE_LABELS: Record<string, string> = {
  apm_terminals: "APM Terminals",
  port_houston: "Port Houston",
  gpa_scrape: "GPA Savannah",
  manual: "Manual",
};

const formatDt = (dt: string | null) => {
  if (!dt) return "—";
  try { return format(new Date(dt), "MMM d, HH:mm"); } catch { return dt; }
};

export function TerminalScheduleTab() {
  const [port, setPort] = useState("");
  const [vessel, setVessel] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TerminalSchedule[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (port) params.set("port_unlocode", port);
      if (vessel) params.set("vessel", vessel);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/terminal-schedule-query?${params}`;
      const resp = await fetch(url, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) throw new Error(`Query failed: ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      setResults(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Port</label>
              <Select value={port} onValueChange={setPort}>
                <SelectTrigger><SelectValue placeholder="All Ports" /></SelectTrigger>
                <SelectContent>
                  {PORT_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vessel Name</label>
              <Input placeholder="e.g. Ever Given" value={vessel} onChange={e => setVessel(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ETA From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ETA To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <Button className="gap-1.5" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Anchor className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No terminal schedules found. Try adjusting your filters or sync data from terminal APIs first.</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.map(sched => (
        <Card key={sched.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ship className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{sched.vessel_name || "Unknown Vessel"}</span>
                    {sched.voyage_number && <Badge variant="outline" className="text-xs">{sched.voyage_number}</Badge>}
                    {sched.carrier_code && <Badge variant="secondary" className="text-xs">{sched.carrier_code}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {sched.terminal_name}
                    </span>
                    <span className="text-xs text-muted-foreground">· {sched.port_name} ({sched.port_unlocode})</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {SOURCE_LABELS[sched.data_source] || sched.data_source}
              </Badge>
            </div>

            {/* Timing grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-muted/30 rounded-md px-3 py-2">
                <div className="text-[10px] uppercase text-muted-foreground font-medium">ETA</div>
                <div className="text-xs font-medium text-foreground">{formatDt(sched.eta)}</div>
                {sched.ata && <div className="text-[10px] text-green-600">ATA: {formatDt(sched.ata)}</div>}
              </div>
              <div className="bg-muted/30 rounded-md px-3 py-2">
                <div className="text-[10px] uppercase text-muted-foreground font-medium">ETD</div>
                <div className="text-xs font-medium text-foreground">{formatDt(sched.etd)}</div>
                {sched.atd && <div className="text-[10px] text-green-600">ATD: {formatDt(sched.atd)}</div>}
              </div>
              {sched.berth && (
                <div className="bg-muted/30 rounded-md px-3 py-2">
                  <div className="text-[10px] uppercase text-muted-foreground font-medium">Berth</div>
                  <div className="text-xs font-medium text-foreground">{sched.berth}</div>
                </div>
              )}
              {sched.service_code && (
                <div className="bg-muted/30 rounded-md px-3 py-2">
                  <div className="text-[10px] uppercase text-muted-foreground font-medium">Service</div>
                  <div className="text-xs font-medium text-foreground">{sched.service_code}</div>
                </div>
              )}
            </div>

            {/* Cutoffs */}
            {(sched.begin_receive_date || sched.cargo_cutoff_date || sched.hazmat_cutoff_date || sched.reefer_cutoff_date) && (
              <div className="flex flex-wrap gap-2">
                {sched.begin_receive_date && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded text-xs">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="font-medium text-foreground">Begin Receive</span>
                    <span className="text-muted-foreground">{formatDt(sched.begin_receive_date)}</span>
                  </div>
                )}
                {sched.cargo_cutoff_date && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 rounded text-xs">
                    <Clock className="h-3 w-3 text-destructive" />
                    <span className="font-medium text-foreground">Cargo Cutoff</span>
                    <span className="text-muted-foreground">{formatDt(sched.cargo_cutoff_date)}</span>
                  </div>
                )}
                {sched.hazmat_cutoff_date && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 rounded text-xs">
                    <Clock className="h-3 w-3 text-orange-500" />
                    <span className="font-medium text-foreground">Hazmat Cutoff</span>
                    <span className="text-muted-foreground">{formatDt(sched.hazmat_cutoff_date)}</span>
                  </div>
                )}
                {sched.reefer_cutoff_date && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 rounded text-xs">
                    <Clock className="h-3 w-3 text-cyan-500" />
                    <span className="font-medium text-foreground">Reefer Cutoff</span>
                    <span className="text-muted-foreground">{formatDt(sched.reefer_cutoff_date)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
