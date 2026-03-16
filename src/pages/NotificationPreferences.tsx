import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, Clock, Ship, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Preferences {
  demurrage_alerts: boolean;
  rate_alerts: boolean;
  shipment_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaults: Preferences = {
  demurrage_alerts: true,
  rate_alerts: true,
  shipment_updates: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          demurrage_alerts: data.demurrage_alerts,
          rate_alerts: data.rate_alerts,
          shipment_updates: data.shipment_updates,
          quiet_hours_enabled: data.quiet_hours_enabled,
          quiet_hours_start: data.quiet_hours_start?.slice(0, 5) ?? "22:00",
          quiet_hours_end: data.quiet_hours_end?.slice(0, 5) ?? "08:00",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { ...prefs, user_id: user.id };
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Notification preferences updated." });
    }
  };

  const toggle = (key: keyof Preferences) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const alertTypes = [
    {
      key: "demurrage_alerts" as const,
      icon: DollarSign,
      title: "Demurrage & Detention",
      desc: "Daily alerts when D&D charges are accruing, with rates and deadlines.",
    },
    {
      key: "rate_alerts" as const,
      icon: TrendingDown,
      title: "Rate Alerts",
      desc: "Notifications when carrier rates drop below your set thresholds.",
    },
    {
      key: "shipment_updates" as const,
      icon: Ship,
      title: "Shipment Updates",
      desc: "Status changes, milestone events, and cutoff reminders.",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" /> Notification Preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose which alerts you receive and when.
            </p>
          </div>
        </div>

        {/* Alert Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alert Types</CardTitle>
            <CardDescription>Toggle notifications on or off by category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertTypes.map(({ key, icon: Icon, title, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{title}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch checked={prefs[key] as boolean} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Quiet Hours
            </CardTitle>
            <CardDescription>
              Suppress notifications during specific hours. Alerts will be delivered when quiet hours end.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Quiet Hours</Label>
              <Switch
                checked={prefs.quiet_hours_enabled}
                onCheckedChange={() => toggle("quiet_hours_enabled")}
              />
            </div>
            {prefs.quiet_hours_enabled && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={prefs.quiet_hours_start}
                      onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={prefs.quiet_hours_end}
                      onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </DashboardLayout>
  );
}
