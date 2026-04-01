import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Ship, Anchor, MapPin, Clock, ArrowRight, Search, Calendar, Route, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

/* ── demo data (normalized table shape) ── */
const demoSchedules = [
  {
    id: "1",
    schedule_type: "point_to_point",
    service_code: "AEX",
    service_name: "Asia Express",
    transit_time_days: 28,
    total_leg_count: 1,
    is_direct_service: true,
    carrier: { carrier_code: "EGLV", carrier_name: "Evergreen" },
    legs: [
      { sequence_number: 1, vessel_name: "Ever Given", voyage_number: "1234E", load_port: "Shanghai (CNSHA)", discharge_port: "Los Angeles (USLAX)", planned_departure: "2026-04-15T08:00:00Z", planned_arrival: "2026-05-13T06:00:00Z", service_code: "AEX" },
    ],
    places: [
      { place_role: "place_of_receipt", location: "Shanghai, CN" },
      { place_role: "port_of_loading", location: "Shanghai (CNSHA)" },
      { place_role: "port_of_discharge", location: "Los Angeles (USLAX)" },
      { place_role: "place_of_delivery", location: "Los Angeles, US" },
    ],
    cutoffs: [
      { cutoff_type: "cargo_cutoff", cutoff_datetime: "2026-04-13T16:00:00Z", location: "Shanghai (CNSHA)" },
      { cutoff_type: "documentation_cutoff", cutoff_datetime: "2026-04-12T12:00:00Z", location: "Shanghai (CNSHA)" },
      { cutoff_type: "vgm_cutoff", cutoff_datetime: "2026-04-13T12:00:00Z", location: "Shanghai (CNSHA)" },
    ],
  },
  {
    id: "2",
    schedule_type: "point_to_point",
    service_code: "TPX",
    service_name: "Trans-Pacific Express",
    transit_time_days: 35,
    total_leg_count: 2,
    is_direct_service: false,
    carrier: { carrier_code: "EGLV", carrier_name: "Evergreen" },
    legs: [
      { sequence_number: 1, vessel_name: "Ever Fortune", voyage_number: "5678W", load_port: "Ningbo (CNNGB)", discharge_port: "Busan (KRPUS)", planned_departure: "2026-04-18T10:00:00Z", planned_arrival: "2026-04-21T08:00:00Z", service_code: "TPX" },
      { sequence_number: 2, vessel_name: "Ever Globe", voyage_number: "9012E", load_port: "Busan (KRPUS)", discharge_port: "Long Beach (USLGB)", planned_departure: "2026-04-23T06:00:00Z", planned_arrival: "2026-05-23T14:00:00Z", service_code: "TPX" },
    ],
    places: [
      { place_role: "place_of_receipt", location: "Ningbo, CN" },
      { place_role: "port_of_loading", location: "Ningbo (CNNGB)" },
      { place_role: "transshipment_port", location: "Busan (KRPUS)" },
      { place_role: "port_of_discharge", location: "Long Beach (USLGB)" },
      { place_role: "place_of_delivery", location: "Long Beach, US" },
    ],
    cutoffs: [
      { cutoff_type: "cargo_cutoff", cutoff_datetime: "2026-04-16T16:00:00Z", location: "Ningbo (CNNGB)" },
    ],
  },
];

const demoPortSchedule = [
  { call_sequence: 1, vessel_name: "Ever Given", voyage_number: "1234E", service_code: "AEX", arrival: "2026-04-14T06:00:00Z", departure: "2026-04-15T08:00:00Z", port: "Shanghai (CNSHA)" },
  { call_sequence: 2, vessel_name: "Ever Fortune", voyage_number: "5678W", service_code: "TPX", arrival: "2026-04-17T22:00:00Z", departure: "2026-04-18T10:00:00Z", port: "Shanghai (CNSHA)" },
  { call_sequence: 3, vessel_name: "Ever Apex", voyage_number: "3344E", service_code: "AEX", arrival: "2026-04-21T06:00:00Z", departure: "2026-04-21T18:00:00Z", port: "Shanghai (CNSHA)" },
];

const demoVesselSchedule = [
  { port: "Kaohsiung (TWKHH)", arrival: null, departure: "2026-04-10T08:00:00Z" },
  { port: "Shanghai (CNSHA)", arrival: "2026-04-14T06:00:00Z", departure: "2026-04-15T08:00:00Z" },
  { port: "Busan (KRPUS)", arrival: "2026-04-17T14:00:00Z", departure: "2026-04-18T06:00:00Z" },
  { port: "Los Angeles (USLAX)", arrival: "2026-05-13T06:00:00Z", departure: null },
];

const cutoffLabels: Record<string, string> = {
  cargo_cutoff: "Cargo",
  documentation_cutoff: "Documentation",
  vgm_cutoff: "VGM",
  si_cutoff: "SI",
};

const placeLabels: Record<string, string> = {
  place_of_receipt: "Place of Receipt",
  port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge",
  place_of_delivery: "Place of Delivery",
  transshipment_port: "Transshipment",
  place_of_departure: "Departure",
  place_of_arrival: "Arrival",
};

const CommercialSchedules = () => {
  const [queryType, setQueryType] = useState("point_to_point");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Commercial Schedules</h1>
        <p className="text-sm text-muted-foreground">Search carrier sailing schedules across your network</p>
      </div>

      {/* Search form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Tabs value={queryType} onValueChange={setQueryType}>
            <TabsList className="mb-4">
              <TabsTrigger value="point_to_point" className="gap-1.5"><Route className="h-3.5 w-3.5" /> Point to Point</TabsTrigger>
              <TabsTrigger value="port_schedule" className="gap-1.5"><Anchor className="h-3.5 w-3.5" /> Port Schedule</TabsTrigger>
              <TabsTrigger value="vessel_schedule" className="gap-1.5"><Ship className="h-3.5 w-3.5" /> Vessel Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="point_to_point">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Origin / Place of Receipt</label>
                  <Input placeholder="e.g. Shanghai" defaultValue="Shanghai" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Loading</label>
                  <Input placeholder="e.g. CNSHA" defaultValue="CNSHA" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port of Discharge</label>
                  <Input placeholder="e.g. USLAX" defaultValue="USLAX" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Departure Date</label>
                  <Input type="date" defaultValue="2026-04-15" />
                </div>
                <Button className="gap-1.5"><Search className="h-4 w-4" /> Search</Button>
              </div>
            </TabsContent>

            <TabsContent value="port_schedule">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Port</label>
                  <Input placeholder="e.g. Shanghai (CNSHA)" defaultValue="CNSHA" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
                  <Input type="date" defaultValue="2026-04-10" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
                  <Input type="date" defaultValue="2026-04-30" />
                </div>
                <Button className="gap-1.5"><Search className="h-4 w-4" /> Search</Button>
              </div>
            </TabsContent>

            <TabsContent value="vessel_schedule">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vessel Name</label>
                  <Input placeholder="e.g. Ever Given" defaultValue="Ever Given" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Voyage Number</label>
                  <Input placeholder="e.g. 1234E" defaultValue="1234E" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Carrier</label>
                  <Select defaultValue="EGLV">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGLV">Evergreen</SelectItem>
                      <SelectItem value="ALL">All Carriers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="gap-1.5"><Search className="h-4 w-4" /> Search</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {queryType === "point_to_point" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{demoSchedules.length} schedules found</h2>
          {demoSchedules.map((sched) => {
            const isExpanded = expandedId === sched.id;
            return (
              <Card key={sched.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Summary row */}
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left" onClick={() => setExpandedId(isExpanded ? null : sched.id)}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Ship className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{sched.service_name}</span>
                          <Badge variant="outline" className="text-[10px]">{sched.service_code}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{sched.carrier.carrier_name}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{sched.legs[0].load_port}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{sched.legs[sched.legs.length - 1].discharge_port}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Transit</div>
                        <div className="text-sm font-semibold text-foreground">{sched.transit_time_days} days</div>
                      </div>
                      <Badge variant={sched.is_direct_service ? "default" : "secondary"}>
                        {sched.is_direct_service ? "Direct" : `${sched.total_leg_count} legs`}
                      </Badge>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-muted/20 space-y-4">
                      {/* Leg timeline */}
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Route Legs</h3>
                        <div className="space-y-2">
                          {sched.legs.map((leg) => (
                            <div key={leg.sequence_number} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{leg.sequence_number}</div>
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Vessel</span>
                                  <span className="font-medium text-foreground">{leg.vessel_name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Voyage</span>
                                  <span className="font-medium text-foreground">{leg.voyage_number}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">From</span>
                                  <span className="font-medium text-foreground">{leg.load_port}</span>
                                  <span className="text-muted-foreground block">{format(new Date(leg.planned_departure), "MMM d, HH:mm")}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">To</span>
                                  <span className="font-medium text-foreground">{leg.discharge_port}</span>
                                  <span className="text-muted-foreground block">{format(new Date(leg.planned_arrival), "MMM d, HH:mm")}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Service</span>
                                  <span className="font-medium text-foreground">{leg.service_code}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Places */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {sched.places.map((pl, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground block">{placeLabels[pl.place_role] || pl.place_role}</span>
                            <span className="font-medium text-foreground">{pl.location}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cutoffs */}
                      {sched.cutoffs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Cutoffs</h3>
                          <div className="flex flex-wrap gap-3">
                            {sched.cutoffs.map((co, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border text-xs">
                                <Clock className="h-3 w-3 text-destructive" />
                                <span className="font-medium text-foreground">{cutoffLabels[co.cutoff_type] || co.cutoff_type}</span>
                                <span className="text-muted-foreground">{format(new Date(co.cutoff_datetime), "MMM d, HH:mm")}</span>
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

      {queryType === "port_schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Port Calls — Shanghai (CNSHA)</CardTitle>
          </CardHeader>
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
                </tr>
              </thead>
              <tbody>
                {demoPortSchedule.map((pc) => (
                  <tr key={pc.call_sequence} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-3 text-foreground">{pc.call_sequence}</td>
                    <td className="p-3 font-medium text-foreground">{pc.vessel_name}</td>
                    <td className="p-3 text-foreground">{pc.voyage_number}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{pc.service_code}</Badge></td>
                    <td className="p-3 text-foreground">{format(new Date(pc.arrival), "MMM d, HH:mm")}</td>
                    <td className="p-3 text-foreground">{format(new Date(pc.departure), "MMM d, HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {queryType === "vessel_schedule" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Ship className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-sm">Ever Given — Voyage 1234E</CardTitle>
                <p className="text-xs text-muted-foreground">Evergreen · Service AEX</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {demoVesselSchedule.map((stop, i) => (
                <div key={i} className="flex items-start gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : i === demoVesselSchedule.length - 1 ? "bg-destructive border-destructive" : "bg-background border-muted-foreground"}`} />
                    {i < demoVesselSchedule.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <div className="text-sm font-medium text-foreground">{stop.port}</div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                      {stop.arrival && <span>Arr: {format(new Date(stop.arrival), "MMM d, HH:mm")}</span>}
                      {stop.departure && <span>Dep: {format(new Date(stop.departure), "MMM d, HH:mm")}</span>}
                      {!stop.arrival && <span className="italic">Origin</span>}
                      {!stop.departure && <span className="italic">Final Port</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default CommercialSchedules;
