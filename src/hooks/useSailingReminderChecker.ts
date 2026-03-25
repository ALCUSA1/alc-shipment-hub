import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Polls for due sailing reminders every 60s.
 * When remind_at has passed:
 * 1. Fires a toast notification
 * 2. Creates an in-app notification
 * 3. Sends an email notification via the send-notification-email edge function
 * 4. Marks reminder as triggered
 */
export function useSailingReminderChecker() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sailing_reminders" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_triggered", false)
        .lte("remind_at", now);

      if (error || !data || data.length === 0) return;

      for (const reminder of data as any[]) {
        const priceRange = reminder.price_min || reminder.price_max
          ? ` | Target: ${reminder.price_min ? `$${Number(reminder.price_min).toLocaleString()}` : "any"} – ${reminder.price_max ? `$${Number(reminder.price_max).toLocaleString()}` : "any"}`
          : "";
        const dateRange = reminder.date_from || reminder.date_to
          ? ` | Dates: ${reminder.date_from || "any"} to ${reminder.date_to || "any"}`
          : "";

        const message = `Your rate alert for ${reminder.carrier} sailing from ${reminder.origin_port} to ${reminder.destination_port}${reminder.etd ? ` (ETD: ${new Date(reminder.etd).toLocaleDateString()})` : ""} is now due.${priceRange}${dateRange} Check availability!`;

        // 1. Fire toast
        toast.info(`🔔 Rate Alert: ${reminder.carrier} — ${reminder.origin_port} → ${reminder.destination_port}${priceRange}`, {
          duration: 12000,
        });

        // 2. Create in-app notification
        const { data: notifData } = await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Sailing Rate Alert",
          message,
          type: "sailing_reminder",
          severity: "info",
          metadata: {
            reminder_id: reminder.id,
            carrier: reminder.carrier,
            origin_port: reminder.origin_port,
            destination_port: reminder.destination_port,
            etd: reminder.etd,
            date_from: reminder.date_from,
            date_to: reminder.date_to,
            price_min: reminder.price_min,
            price_max: reminder.price_max,
            sailing_data: reminder.sailing_data,
          },
        }).select("id").single();

        // 3. Send email notification
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              user_id: user.id,
              template: "sailing_reminder",
              data: {
                carrier: reminder.carrier,
                origin: reminder.origin_port,
                destination: reminder.destination_port,
                etd: reminder.etd || "Flexible",
                date_from: reminder.date_from || "Any",
                date_to: reminder.date_to || "Any",
                price_min: reminder.price_min ? `$${Number(reminder.price_min).toLocaleString()}` : "No minimum",
                price_max: reminder.price_max ? `$${Number(reminder.price_max).toLocaleString()}` : "No maximum",
                current_rate: reminder.sailing_data?.total_rate
                  ? `$${Number(reminder.sailing_data.total_rate).toLocaleString()}`
                  : "—",
                currency: reminder.sailing_data?.currency || "USD",
              },
            },
          });

          // Mark email sent
          await supabase
            .from("sailing_reminders" as any)
            .update({ email_sent: true } as any)
            .eq("id", reminder.id);
        } catch (emailErr) {
          console.error("Failed to send reminder email:", emailErr);
        }

        // 4. Mark as triggered
        await supabase
          .from("sailing_reminders" as any)
          .update({ is_triggered: true } as any)
          .eq("id", reminder.id);
      }
    };

    checkReminders();
    intervalRef.current = setInterval(checkReminders, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
