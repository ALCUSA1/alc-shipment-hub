import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

/**
 * Polls for due sailing reminders every 60s and fires toast notifications + 
 * creates in-app notifications when remind_at has passed.
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
        // Fire toast
        toast.info(
          `🔔 Sailing Reminder: ${reminder.carrier} — ${reminder.origin_port} → ${reminder.destination_port}${reminder.etd ? ` (ETD: ${new Date(reminder.etd).toLocaleDateString()})` : ""}`,
          { duration: 10000 }
        );

        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Sailing Reminder",
          message: `Your reminder for ${reminder.carrier} sailing from ${reminder.origin_port} to ${reminder.destination_port}${reminder.etd ? ` (ETD: ${new Date(reminder.etd).toLocaleDateString()})` : ""} is now due. Check availability!`,
          type: "sailing_reminder",
          severity: "info",
          metadata: {
            reminder_id: reminder.id,
            carrier: reminder.carrier,
            origin_port: reminder.origin_port,
            destination_port: reminder.destination_port,
            etd: reminder.etd,
            sailing_data: reminder.sailing_data,
          },
        });

        // Mark as triggered
        await supabase
          .from("sailing_reminders" as any)
          .update({ is_triggered: true } as any)
          .eq("id", reminder.id);
      }
    };

    // Check immediately on mount
    checkReminders();

    // Then every 60 seconds
    intervalRef.current = setInterval(checkReminders, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
