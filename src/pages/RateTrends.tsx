import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, TrendingDown, Minus, Ship, Bell, BellOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { RateAlertDialog } from "@/components/rate-alerts/RateAlertDialog";
import type { Json } from "@/integrations/supabase/types";

interface CarrierRate {
  id: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string;
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: Json;
  notes: string | null;
}

function parseSurchargeTotal(surcharges: Json): number {
  if (!Array.isArray(surcharges)) return 0;
  let total = 0;
  for (const s of surcharges) {
    if (typeof s === "object" && s !== null && "amount" in s) {
      total += Number((s as Record<string, unknown>).amount ?? 0);
    }
  }
  return total;
}

const CARRIER_COLORS: Record<string, string> = {
  "Maersk": "hsl(210 80% 50%)",
  "MSC": "hsl(340 70% 50%)",
  "CMA CGM": "hsl(30 90% 50%)",
  "Evergreen": "hsl(142 60% 40%)",
  "Hapag-Lloyd": "hsl(270 60% 55%)",
  "ONE": "hsl(190 80% 45%)",
  "Yang Ming": "hsl(50 80% 45%)",
};

const CONTAINER_TYPES = [
  { value: "all", label: "All Containers" },
  { value: "20gp", label: "20' GP" },
  { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" },
];

const RateTrends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoute, setSelectedRoute] = useState<string>("all");
  const [selectedContainer, setSelectedContainer] = useState<string>("40hc");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const { data: allRates = [], isLoading } = useQuery({
    queryKey: ["rate-trends-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_rates")
        .select("*")
        .order("valid_from", { ascending: true });
      if (error) throw error;
      return data as CarrierRate[];
    },
  });

  // Fetch user's rate alerts
  interface RateAlert {
    id: string;
    origin_port: string;
    destination_port: string;
    container_type: string;
    carrier: string | null;
    threshold_rate: number;
    is_active: boolean;
  }

  const { data: rateAlerts = [] } = useQuery({
    queryKey: ["rate-alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_alerts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RateAlert[];
    },
    enabled: !!user,
  });

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    await supabase.from("rate_alerts").update({ is_active: !isActive }).eq("id", alertId);
    queryClient.invalidateQueries({ queryKey: ["rate-alerts"] });
  };

  const deleteAlert = async (alertId: string) => {
    await supabase.from("rate_alerts").delete().eq("id", alertId);
    queryClient.invalidateQueries({ queryKey: ["rate-alerts"] });
    toast({ title: "Alert deleted" });
  };

  // Derive unique routes and carriers
  const routes = useMemo(() => {
    const set = new Set(allRates.map((r) => `${r.origin_port}→${r.destination_port}`));
    return [...set].sort();
  }, [allRates]);

  const carriers = useMemo(() => {
    return [...new Set(allRates.map((r) => r.carrier))].sort();
  }, [allRates]);

  // Filter rates
  const filtered = useMemo(() => {
    let r = allRates;
    if (selectedRoute !== "all") {
      const [origin, dest] = selectedRoute.split("→");
      r = r.filter((rate) => rate.origin_port === origin && rate.destination_port === dest);
    }
    if (selectedContainer !== "all") {
      r = r.filter((rate) => rate.container_type === selectedContainer);
    }
    if (selectedCarrier !== "all") {
      r = r.filter((rate) => rate.carrier === selectedCarrier);
    }
    return r;
  }, [allRates, selectedRoute, selectedContainer, selectedCarrier]);

  // Build chart data: group by month, one line per carrier
  const { chartData, chartCarriers } = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    const carrierSet = new Set<string>();

    filtered.forEach((rate) => {
      const monthKey = format(new Date(rate.valid_from), "yyyy-MM");
      const totalRate = rate.base_rate + parseSurchargeTotal(rate.surcharges);
      carrierSet.add(rate.carrier);

      if (!monthMap.has(monthKey)) monthMap.set(monthKey, {});
      const entry = monthMap.get(monthKey)!;
      // If multiple rates per carrier/month, take the latest (or average)
      if (!entry[rate.carrier] || totalRate !== entry[rate.carrier]) {
        entry[rate.carrier] = totalRate;
      }
    });

    const sortedMonths = [...monthMap.keys()].sort();
    const data = sortedMonths.map((month) => ({
      month: format(new Date(month + "-01"), "MMM yyyy"),
      ...monthMap.get(month),
    }));

    return { chartData: data, chartCarriers: [...carrierSet].sort() };
  }, [filtered]);

  // Summary stats per carrier
  const carrierSummaries = useMemo(() => {
    const summaries: {
      carrier: string;
      currentRate: number;
      previousRate: number;
      change: number;
      changePercent: number;
      direction: "up" | "down" | "flat";
      dataPoints: number;
    }[] = [];

    const carrierGroups = new Map<string, CarrierRate[]>();
    filtered.forEach((r) => {
      if (!carrierGroups.has(r.carrier)) carrierGroups.set(r.carrier, []);
      carrierGroups.get(r.carrier)!.push(r);
    });

    carrierGroups.forEach((rates, carrier) => {
      const sorted = rates.sort(
        (a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()
      );
      const totals = sorted.map((r) => r.base_rate + parseSurchargeTotal(r.surcharges));
      const curr = totals[totals.length - 1];
      const prev = totals.length >= 2 ? totals[totals.length - 2] : curr;
      const change = curr - prev;
      const changePercent = prev > 0 ? (change / prev) * 100 : 0;

      summaries.push({
        carrier,
        currentRate: curr,
        previousRate: prev,
        change,
        changePercent,
        direction: Math.abs(changePercent) < 0.5 ? "flat" : change > 0 ? "up" : "down",
        dataPoints: totals.length,
      });
    });

    return summaries.sort((a, b) => a.currentRate - b.currentRate);
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rate Trends</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track carrier rate history across routes and container types
            </p>
          </div>
        </div>
        <Button onClick={() => setAlertDialogOpen(true)} className="gap-2">
          <Bell className="h-4 w-4" />
          Set Rate Alert
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={selectedRoute} onValueChange={setSelectedRoute}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Routes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {routes.map((r) => (
              <SelectItem key={r} value={r}>{r.replace("→", " → ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
          {CONTAINER_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setSelectedContainer(ct.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedContainer === ct.value
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>

        <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Carriers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carriers</SelectItem>
            {carriers.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="text-xs ml-auto">
          {filtered.length} rate{filtered.length !== 1 ? "s" : ""} found
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No rate data found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Rate History</CardTitle>
              <CardDescription>
                All-in rates (base + surcharges) by carrier over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`,
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                    />
                    {chartCarriers.map((carrier) => (
                      <Line
                        key={carrier}
                        type="monotone"
                        dataKey={carrier}
                        stroke={CARRIER_COLORS[carrier] || "hsl(var(--accent))"}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Carrier summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {carrierSummaries.map((cs) => {
              const Icon = cs.direction === "up" ? TrendingUp : cs.direction === "down" ? TrendingDown : Minus;
              const colorClass =
                cs.direction === "up" ? "text-destructive" :
                cs.direction === "down" ? "text-green-600" :
                "text-muted-foreground";

              return (
                <Card key={cs.carrier}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{cs.carrier}</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CARRIER_COLORS[cs.carrier] || "hsl(var(--accent))" }}
                      />
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      ${cs.currentRate.toLocaleString()}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {cs.direction === "flat" ? "Stable" : (
                          <>
                            {cs.change > 0 ? "+" : ""}${Math.abs(cs.change).toLocaleString()}
                            {" "}({Math.abs(cs.changePercent).toFixed(1)}%)
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cs.dataPoints} month{cs.dataPoints !== 1 ? "s" : ""} of data
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Rate Alerts Management */}
      {rateAlerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" />
              Your Rate Alerts
            </CardTitle>
            <CardDescription>
              Manage your price drop notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rateAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => toggleAlert(alert.id, alert.is_active)}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {alert.origin_port} → {alert.destination_port}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {alert.container_type.toUpperCase()}
                        </span>
                        {alert.carrier && (
                          <span className="ml-2 text-xs text-muted-foreground">• {alert.carrier}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alert when below ${alert.threshold_rate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteAlert(alert.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RateAlertDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        defaultOrigin={selectedRoute !== "all" ? selectedRoute.split("→")[0] : ""}
        defaultDestination={selectedRoute !== "all" ? selectedRoute.split("→")[1] : ""}
        defaultContainerType={selectedContainer !== "all" ? selectedContainer : "40hc"}
        defaultCarrier={selectedCarrier !== "all" ? selectedCarrier : undefined}
      />
    </DashboardLayout>
  );
};

export default RateTrends;
