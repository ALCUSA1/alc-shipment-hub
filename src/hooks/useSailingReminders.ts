import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SailingReminderInput {
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type?: string;
  etd?: string;
  remind_at: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  sailing_data?: any;
}

export function useSailingReminders() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["sailing-reminders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sailing_reminders" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const addReminder = useMutation({
    mutationFn: async (input: SailingReminderInput) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sailing_reminders" as any).insert({
        user_id: user.id,
        carrier: input.carrier,
        origin_port: input.origin_port,
        destination_port: input.destination_port,
        container_type: input.container_type || null,
        etd: input.etd || null,
        remind_at: input.remind_at,
        date_from: input.date_from || null,
        date_to: input.date_to || null,
        price_min: input.price_min ?? null,
        price_max: input.price_max ?? null,
        sailing_data: input.sailing_data || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sailing-reminders"] });
      toast.success("Rate alert set! You'll be notified via app and email.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to set reminder"),
  });

  const removeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sailing_reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sailing-reminders"] });
      toast.success("Reminder removed");
    },
  });

  const hasReminder = (carrier: string, origin: string, destination: string, etd?: string) => {
    return reminders.some(
      (r: any) =>
        r.carrier === carrier &&
        r.origin_port === origin &&
        r.destination_port === destination &&
        (!etd || r.etd === etd)
    );
  };

  const findReminder = (carrier: string, origin: string, destination: string, etd?: string) => {
    return reminders.find(
      (r: any) =>
        r.carrier === carrier &&
        r.origin_port === origin &&
        r.destination_port === destination &&
        (!etd || r.etd === etd)
    );
  };

  return { reminders, isLoading, addReminder, removeReminder, hasReminder, findReminder };
}
