import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Satellite, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";

const CARRIERS: Record<string, string> = {
  maersk: "Maersk",
  msc: "MSC",
  "cma-cgm": "CMA CGM",
  evergreen: "Evergreen",
};

interface CarrierStatusUpdatesProps {
  shipmentId: string;
}

export function CarrierStatusUpdates({ shipmentId }: CarrierStatusUpdatesProps) {
  const queryClient = useQueryClient();

  const { data: updates = [] } = useQuery({
    queryKey: ["edi-status-updates", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edi_messages")
        .select("*")
        .eq("shipment_id", shipmentId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`edi-inbound-${shipmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "edi_messages",
          filter: `shipment_id=eq.${shipmentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["edi-status-updates", shipmentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId, queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Satellite className="h-4 w-4 text-accent" />
          Carrier Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status updates received from carriers yet.</p>
        ) : (
          <div className="space-y-3">
            {updates.map((u: any) => {
              const events = Array.isArray((u.payload as any)?.events) ? (u.payload as any).events : [];
              return (
                <div key={u.id} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm font-medium">{CARRIERS[u.carrier] || u.carrier}</span>
                      <Badge variant="outline" className="text-[10px]">{u.message_type}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  {events.length > 0 && (
                    <div className="pl-5 space-y-1">
                      {events.map((evt: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span className="font-medium text-foreground">{evt.milestone || evt.status}</span>
                          {evt.location && <span className="text-muted-foreground">— {evt.location}</span>}
                          {evt.date && <span className="text-muted-foreground/60">{evt.date}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
