import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SEO } from "@/components/SEO";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Plus, ArrowRight, Trash2, Pause, Play, RotateCcw, Ship, TrendingDown, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { RateAlertDialog } from "@/components/rate-alerts/RateAlertDialog";
import { format } from "date-fns";

type AlertTab = "all" | "rate" | "sailing";

export default function Alerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<AlertTab>("all");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [newAlertType, setNewAlertType] = useState<"rate" | "sailing" | null>(null);

  // Fetch rate alerts
  const { data: rateAlerts = [] } = useQuery({
    queryKey: ["rate-alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_alerts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch sailing reminders
  const { data: sailingReminders = [] } = useQuery({
    queryKey: ["sailing-reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sailing_reminders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Delete rate alert
  const deleteRateAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-alerts"] }); toast.success("Rate alert deleted"); },
  });

  // Toggle rate alert active
  const toggleRateAlert = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("rate_alerts").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-alerts"] }); toast.success("Alert updated"); },
  });

  // Delete sailing reminder
  const deleteSailingReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sailing_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sailing-reminders"] }); toast.success("Reminder deleted"); },
  });

  // Toggle sailing reminder active
  const toggleSailingReminder = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sailing_reminders" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sailing-reminders"] }); toast.success("Reminder updated"); },
  });

  // Re-arm sailing reminder
  const rearmReminder = useMutation({
    mutationFn: async (id: string) => {
      const newRemindAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("sailing_reminders" as any).update({ is_triggered: false, remind_at: newRemindAt, is_active: true, email_sent: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sailing-reminders"] }); toast.success("Reminder re-armed for 24h from now"); },
  });

  const rateCount = rateAlerts.length;
  const sailingCount = sailingReminders.length;
  const allCount = rateCount + sailingCount;

  const getStatusBadge = (isActive: boolean, isTriggered: boolean) => {
    if (isTriggered) return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">Triggered</Badge>;
    if (!isActive) return <Badge variant="secondary" className="bg-muted text-muted-foreground">Paused</Badge>;
    return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
  };

  const renderRateAlertCard = (alert: any) => (
    <Card key={alert.id} className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{alert.origin_port}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-sm">{alert.destination_port}</span>
                <Badge variant="outline" className="text-[10px]">{alert.container_type?.toUpperCase() || "ANY"}</Badge>
                {getStatusBadge(alert.is_active !== false, false)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alert when rate drops below <span className="font-medium text-foreground">${Number(alert.threshold_rate).toLocaleString()}</span>
                {alert.carrier && <> · Carrier: {alert.carrier}</>}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Created {format(new Date(alert.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleRateAlert.mutate({ id: alert.id, is_active: alert.is_active === false })}>
                {alert.is_active === false ? <><Play className="h-3.5 w-3.5 mr-2" />Resume</> : <><Pause className="h-3.5 w-3.5 mr-2" />Pause</>}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteRateAlert.mutate(alert.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const renderSailingReminderCard = (reminder: any) => {
    const isTriggered = reminder.is_triggered === true;
    const isActive = reminder.is_active !== false;

    return (
      <Card key={reminder.id} className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Ship className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{reminder.carrier}</span>
                  <span className="text-muted-foreground text-xs">—</span>
                  <span className="text-sm">{reminder.origin_port}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{reminder.destination_port}</span>
                  {getStatusBadge(isActive, isTriggered)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                  {(reminder.date_from || reminder.date_to) && (
                    <span>Dates: {reminder.date_from ? format(new Date(reminder.date_from), "MMM d") : "Any"} – {reminder.date_to ? format(new Date(reminder.date_to), "MMM d") : "Any"}</span>
                  )}
                  {(reminder.price_min != null || reminder.price_max != null) && (
                    <span>Price: {reminder.price_min != null ? `$${Number(reminder.price_min).toLocaleString()}` : "Any"} – {reminder.price_max != null ? `$${Number(reminder.price_max).toLocaleString()}` : "Any"}</span>
                  )}
                  <span>Remind: {format(new Date(reminder.remind_at), "MMM d, h:mm a")}</span>
                </div>
                {reminder.container_type && (
                  <Badge variant="outline" className="text-[10px] mt-1">{reminder.container_type.toUpperCase()}</Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isTriggered ? (
                  <DropdownMenuItem onClick={() => rearmReminder.mutate(reminder.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />Re-arm (24h)
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => toggleSailingReminder.mutate({ id: reminder.id, is_active: !isActive })}>
                    {isActive ? <><Pause className="h-3.5 w-3.5 mr-2" />Pause</> : <><Play className="h-3.5 w-3.5 mr-2" />Resume</>}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => deleteSailingReminder.mutate(reminder.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">No alerts yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Set rate alerts or sailing reminders to get notified when prices drop or bookings become available.
      </p>
    </div>
  );

  const filteredRateAlerts = tab === "sailing" ? [] : rateAlerts;
  const filteredSailingReminders = tab === "rate" ? [] : sailingReminders;
  const showEmpty = filteredRateAlerts.length === 0 && filteredSailingReminders.length === 0;

  return (
    <DashboardLayout>
      <SEO title="My Alerts | ALC Shipper Portal" description="Manage your rate alerts and sailing reminders." />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">My Alerts</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Alert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRateDialogOpen(true)}>
                <TrendingDown className="h-4 w-4 mr-2" />
                Rate Alert
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Set sailing reminders from the Booking Flow → Sailing Board")}>
                <Ship className="h-4 w-4 mr-2" />
                Sailing Reminder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as AlertTab)}>
          <TabsList>
            <TabsTrigger value="all">All ({allCount})</TabsTrigger>
            <TabsTrigger value="rate">Rate Alerts ({rateCount})</TabsTrigger>
            <TabsTrigger value="sailing">Sailing ({sailingCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-3">
            {showEmpty ? (
              <EmptyState />
            ) : (
              <>
                {filteredRateAlerts.map(renderRateAlertCard)}
                {filteredSailingReminders.map(renderSailingReminderCard)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RateAlertDialog open={rateDialogOpen} onOpenChange={setRateDialogOpen} />
    </DashboardLayout>
  );
}
