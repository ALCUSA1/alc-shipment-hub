import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, Anchor, MapPin, Clock, ArrowRight, Search, Route, ChevronRight, Loader2, AlertCircle, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const cutoffLabels: Record<string, string> = {
  cargo_cutoff: "Cargo", documentation_cutoff: "Documentation", vgm_cutoff: "VGM",
  si_cutoff: "SI", CRG: "Cargo", DOC: "Documentation", VGM: "VGM", SHP: "Shipping",
};

const placeLabels: Record<string, string> = {
  place_of_receipt: "Place of Receipt", port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge", place_of_delivery: "Place of Delivery",
  transshipment_port: "Transshipment", place_of_departure: "Departure", place_of_arrival: "Arrival",
};

type ScheduleResult = {
  id: string;
  schedule_type: string;
  service_code: string | null;
  service_name: string | null;
  transit_time_days: number | null;
  total_leg_count: number | null;
  is_direct_service: boolean | null;
  carrier: { carrier_code: string; carrier_name: string } | null;
  legs: any[];
  places: any[];
  cutoffs: any[];
  port_calls: any[];
  vessel_schedule: any[];
};

const CommercialSchedules = () => {
  
  const [queryType, setQueryType] = useState("point_to_point");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  // P2P fields
  const [p2pOrigin, setP2pOrigin] = useState("");
  const [p2pPol, setP2pPol] = useState("");
  const [p2pPod, setP2pPod] = useState("");
  const [p2pDate, setP2pDate] = useState("");

  // Port fields
  const [portCode, setPortCode] = useState("");
  const [portDateFrom, setPortDateFrom] = useState("");
  const [portDateTo, setPortDateTo] = useState("");

  // Vessel fields
  const [vesselImo, setVesselImo] = useState("");
  const [vesselVoyage, setVesselVoyage] = useState("");
  const [vesselService, setVesselService] = useState("");

  const fetchScheduleDetail = async (scheduleId: string): Promise<ScheduleResult | null> => {
    const { data, error } = await supabase.functions.invoke("schedule-detail", {
      body: null,
      headers: { "Content-Type": "application/json" },
      method: "GET",
    });

    // Use query params approach via direct fetch
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-detail?schedule_id=${scheduleId}`;
    const resp = await fetch(url, {
      headers: {
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) return null;
    const d = await resp.json();

    const sched = d.schedule;
    if (!sched) return null;

    return {
      id: sched.id,
      schedule_type: sched.schedule_type,
      service_code: sched.service_code,
      service_name: sched.service_name,
      transit_time_days: sched.transit_time_days,
      total_leg_count: sched.total_leg_count,
      is_direct_service: sched.is_direct_service,
      carrier: sched.alc_carriers ? { carrier_code: sched.alc_carriers.carrier_code, carrier_name: sched.alc_carriers.carrier_name } : null,
      legs: (d.legs || []).map((l: any) => ({
        sequence_number: l.sequence_number,
        vessel_name: l.vessel_name || l.alc_vessels?.vessel_name || null,
        voyage_number: l.voyage_number,
        load_port: l.alc_locations?.location_name || l.alc_locations?.unlocode || "—",
        discharge_port: (l as any)["alc_locations!schedule_legs_discharge_location_id_fkey"]?.location_name ||
          (l as any)["alc_locations!schedule_legs_discharge_location_id_fkey"]?.unlocode || "—",
        planned_departure: l.planned_departure,
        planned_arrival: l.planned_arrival,
        service_code: l.service_code,
      })),
      places: (d.places || []).map((p: any) => ({
        place_role: p.place_role,
        location: p.alc_locations?.location_name || p.alc_locations?.unlocode || "—",
      })),
      cutoffs: (d.cutoffs || []).map((c: any) => ({
        cutoff_type: c.cutoff_type,
        cutoff_datetime: c.cutoff_datetime,
        location: c.alc_locations?.location_name || c.alc_locations?.unlocode || null,
      })),
      port_calls: (d.port_calls || []).map((pc: any) => ({
        call_sequence: pc.call_sequence,
        vessel_name: pc.vessel_name || pc.alc_vessels?.vessel_name || null,
        voyage_number: pc.voyage_number,
        service_code: pc.service_code,
        arrival: pc.arrival_datetime,
        departure: pc.departure_datetime,
        port: pc.alc_locations?.location_name || pc.alc_locations?.unlocode || "—",
      })),
      vessel_schedule: (d.vessel_schedule || []).map((vs: any) => ({
        vessel_name: vs.vessel_name || vs.alc_vessels?.vessel_name || null,
        voyage_number: vs.voyage_number,
        service_code: vs.service_code,
        first_port: vs.alc_locations?.location_name || null,
        last_port: (vs as any)["alc_locations!vessel_schedules_last_port_location_id_fkey"]?.location_name || null,
        first_departure: vs.first_departure_datetime,
        final_arrival: vs.final_arrival_datetime,
      })),
    };
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      let body: any = { query_type: queryType };

      if (queryType === "point_to_point") {
        if (!p2pPol && !p2pOrigin) { setError("Enter origin or port of loading"); setLoading(false); return; }
        body.placeOfReceipt = p2pOrigin || undefined;
        body.portOfLoading = p2pPol || undefined;
        body.portOfDischarge = p2pPod || undefined;
        body.departureDate = p2pDate || undefined;
      } else if (queryType === "port_schedule") {
        if (!portCode) { setError("Enter port UN location code"); setLoading(false); return; }
        body.unLocationCode = portCode;
        body.startDate = portDateFrom || undefined;
        body.endDate = portDateTo || undefined;
      } else {
        if (!vesselImo && !vesselService) { setError("Enter vessel IMO or service code"); setLoading(false); return; }
        body.vesselIMONumber = vesselImo || undefined;
        body.carrierVoyageNumber = vesselVoyage || undefined;
        body.carrierServiceCode = vesselService || undefined;
      }

      const { data, error: fnError } = await supabase.functions.invoke("schedule-search", { body });

      if (fnError) throw new Error(fnError.message || "Search failed");
      if (data?.error) throw new Error(data.error);

      const scheduleIds: string[] = data.schedule_ids || [];
      if (scheduleIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Fetch details for each schedule
      const details = await Promise.all(scheduleIds.map(fetchScheduleDetail));
      setResults(details.filter(Boolean) as ScheduleResult[]);

      toast({ title: "Schedules fetched", description: `${scheduleIds.length} result(s) from carrier API` });
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatDt = (dt: string | null) => {
    if (!dt) return "—";
    try { return format(new Date(dt), "MMM d, HH:mm"); } catch { return dt; }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Commercial Schedules</h1>
        <p className="text-sm text-muted-foreground">Search carrier sailing schedules</p>
      </div>

      <>


      {/* Search form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Tabs value={queryType} onValueChange={(v) => { setQueryType(v); setResults([]); setSearched(false); setError(null); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="point_to_point" className="gap-1.5"><Route className="h-3.5 w-3.5" /> Point to Point</TabsTrigger>
              <TabsTrigger value="port_schedule" className="gap-1.5"><Anchor className="h-3.5 w-3.5" /> Port Schedule</TabsTrigger>
              <TabsTrigger value="vessel_schedule" className="gap-1.5"><Ship className="h-3.5 w-3.5" /> Vessel Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="point_to_point">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Origin / Place of Receipt</label>
                  <Input placeholder="e.g. CNSHA" value={p2pOrigin} onChange={(e) => setP2pOrigin(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Loading</label>
                  <Input placeholder="e.g. CNSHA" value={p2pPol} onChange={(e) => setP2pPol(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Discharge</label>
                  <Input placeholder="e.g. USLAX" value={p2pPod} onChange={(e) => setP2pPod(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Departure Date</label>
                  <Input type="date" value={p2pDate} onChange={(e) => setP2pDate(e.target.value)} />
                </div>
                <Button className="gap-1.5" onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="port_schedule">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port UN Location Code</label>
                  <Input placeholder="e.g. CNSHA" value={portCode} onChange={(e) => setPortCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
                  <Input type="date" value={portDateFrom} onChange={(e) => setPortDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
                  <Input type="date" value={portDateTo} onChange={(e) => setPortDateTo(e.target.value)} />
                </div>
                <Button className="gap-1.5" onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="vessel_schedule">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vessel IMO Number</label>
                  <Input placeholder="e.g. 9811000" value={vesselImo} onChange={(e) => setVesselImo(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Code</label>
                  <Input placeholder="e.g. AEX" value={vesselService} onChange={(e) => setVesselService(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Voyage Number</label>
                  <Input placeholder="e.g. 1234E" value={vesselVoyage} onChange={(e) => setVesselVoyage(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Carrier</label>
                  <Select defaultValue="EGLV">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGLV">Evergreen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="gap-1.5" onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Fetching schedules from carrier API…</span>
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && results.length === 0 && !error && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No schedules found for the given search criteria.</CardContent></Card>
      )}

      {/* Point-to-Point Results */}
      {!loading && queryType === "point_to_point" && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{results.length} schedule(s) found</h2>
          {results.map((sched) => {
            const isExpanded = expandedId === sched.id;
            const firstLeg = sched.legs[0];
            const lastLeg = sched.legs[sched.legs.length - 1];
            return (
              <Card key={sched.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left" onClick={() => setExpandedId(isExpanded ? null : sched.id)}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10"><Ship className="h-5 w-5 text-primary" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{sched.service_name || "Route"}</span>
                          {sched.service_code && <Badge variant="outline" className="text-[10px]">{sched.service_code}</Badge>}
                          {sched.carrier && <Badge variant="secondary" className="text-[10px]">{sched.carrier.carrier_name}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{firstLeg?.load_port || "—"}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{lastLeg?.discharge_port || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Transit</div>
                        <div className="text-sm font-semibold text-foreground">{sched.transit_time_days ? `${sched.transit_time_days} days` : "—"}</div>
                      </div>
                      <Badge variant={sched.is_direct_service ? "default" : "secondary"}>
                        {sched.is_direct_service ? "Direct" : `${sched.total_leg_count} legs`}
                      </Badge>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-muted/20 space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Route Legs</h3>
                        <div className="space-y-2">
                          {sched.legs.map((leg) => (
                            <div key={leg.sequence_number} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{leg.sequence_number}</div>
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <div><span className="text-muted-foreground block">Vessel</span><span className="font-medium text-foreground">{leg.vessel_name || "—"}</span></div>
                                <div><span className="text-muted-foreground block">Voyage</span><span className="font-medium text-foreground">{leg.voyage_number || "—"}</span></div>
                                <div><span className="text-muted-foreground block">From</span><span className="font-medium text-foreground">{leg.load_port}</span><span className="text-muted-foreground block">{formatDt(leg.planned_departure)}</span></div>
                                <div><span className="text-muted-foreground block">To</span><span className="font-medium text-foreground">{leg.discharge_port}</span><span className="text-muted-foreground block">{formatDt(leg.planned_arrival)}</span></div>
                                <div><span className="text-muted-foreground block">Service</span><span className="font-medium text-foreground">{leg.service_code || "—"}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {sched.places.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {sched.places.map((pl, i) => (
                            <div key={i} className="text-xs">
                              <span className="text-muted-foreground block">{placeLabels[pl.place_role] || pl.place_role}</span>
                              <span className="font-medium text-foreground">{pl.location}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {sched.cutoffs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Cutoffs</h3>
                          <div className="flex flex-wrap gap-3">
                            {sched.cutoffs.map((co, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border text-xs">
                                <Clock className="h-3 w-3 text-destructive" />
                                <span className="font-medium text-foreground">{cutoffLabels[co.cutoff_type] || co.cutoff_type}</span>
                                <span className="text-muted-foreground">{formatDt(co.cutoff_datetime)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Port Schedule Results */}
      {!loading && queryType === "port_schedule" && results.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Port Calls — {portCode}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Vessel</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Voyage</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Service</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Arrival</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Departure</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Cutoffs</th>
                </tr>
              </thead>
              <tbody>
                {results.map((sched, idx) => {
                  const pc = sched.port_calls[0];
                  if (!pc) return null;
                  return (
                    <tr key={sched.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-foreground">{idx + 1}</td>
                      <td className="p-3 font-medium text-foreground">{pc.vessel_name || "—"}</td>
                      <td className="p-3 text-foreground">{pc.voyage_number || "—"}</td>
                      <td className="p-3">{pc.service_code ? <Badge variant="outline" className="text-[10px]">{pc.service_code}</Badge> : "—"}</td>
                      <td className="p-3 text-foreground">{formatDt(pc.arrival)}</td>
                      <td className="p-3 text-foreground">{formatDt(pc.departure)}</td>
                      <td className="p-3">
                        {sched.cutoffs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sched.cutoffs.map((co, i) => (
                              <span key={i} className="text-[10px] text-destructive">{cutoffLabels[co.cutoff_type] || co.cutoff_type}: {formatDt(co.cutoff_datetime)}</span>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Vessel Schedule Results */}
      {!loading && queryType === "vessel_schedule" && results.length > 0 && results.map((sched) => {
        const vs = sched.vessel_schedule[0];
        return (
          <Card key={sched.id} className="mb-4">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Ship className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-sm">{vs?.vessel_name || "Vessel"} — Voyage {vs?.voyage_number || "—"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{sched.carrier?.carrier_name} · Service {sched.service_code || "—"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {sched.port_calls.map((stop, i) => (
                  <div key={i} className="flex items-start gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : i === sched.port_calls.length - 1 ? "bg-destructive border-destructive" : "bg-background border-muted-foreground"}`} />
                      {i < sched.port_calls.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <div className="text-sm font-medium text-foreground">{stop.port}</div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                        {stop.arrival && <span>Arr: {formatDt(stop.arrival)}</span>}
                        {stop.departure && <span>Dep: {formatDt(stop.departure)}</span>}
                        {!stop.arrival && i === 0 && <span className="italic">Origin</span>}
                        {!stop.departure && i === sched.port_calls.length - 1 && <span className="italic">Final Port</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {sched.port_calls.length === 0 && <p className="text-sm text-muted-foreground">No port call details available</p>}
              </div>

              {sched.cutoffs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Cutoffs</h3>
                  <div className="flex flex-wrap gap-3">
                    {sched.cutoffs.map((co, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-md text-xs">
                        <Clock className="h-3 w-3 text-destructive" />
                        <span className="font-medium text-foreground">{cutoffLabels[co.cutoff_type] || co.cutoff_type}</span>
                        <span className="text-muted-foreground">{formatDt(co.cutoff_datetime)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      </>
    </DashboardLayout>
  );
};

export default CommercialSchedules;
