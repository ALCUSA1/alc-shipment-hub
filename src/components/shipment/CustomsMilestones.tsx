import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, Circle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CustomsMilestonesProps {
  filingId: string;
}

const MILESTONE_ORDER = [
  "Draft Created",
  "Sent to Broker",
  "Under Review",
  "Filed with CBP",
  "ITN Received",
  "Accepted",
];

export function CustomsMilestones({ filingId }: CustomsMilestonesProps) {
  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ["customs-milestones", filingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customs_milestones")
        .select("*")
        .eq("filing_id", filingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`customs-milestones-${filingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customs_milestones",
          filter: `filing_id=eq.${filingId}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["customs-milestones", filingId] });
          const milestone = payload.new?.milestone || "Update";
          toast.info(`Customs: ${milestone}`, {
            description: "A customs filing milestone has been reached.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filingId, queryClient]);

  if (milestones.length === 0) return null;

  const completedSet = new Set(milestones.map((m: any) => m.milestone));

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Filing Progress
      </p>
      <div className="space-y-1.5">
        {MILESTONE_ORDER.map((label) => {
          const completed = completedSet.has(label);
          const event = milestones.find((m: any) => m.milestone === label);
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              {completed ? (
                <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-accent-foreground" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-border flex items-center justify-center shrink-0">
                  <Circle className="h-2 w-2 text-muted-foreground" />
                </div>
              )}
              <span className={completed ? "text-foreground font-medium" : "text-muted-foreground"}>
                {label}
              </span>
              {event && (
                <span className="text-muted-foreground/60 text-[10px] ml-auto">
                  {format(new Date(event.event_date), "MMM d, HH:mm")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
