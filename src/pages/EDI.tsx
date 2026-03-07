import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Send, Ship, Activity } from "lucide-react";
import { format } from "date-fns";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

const CARRIERS = [
  { id: "maersk", name: "Maersk", color: "bg-blue-500" },
  { id: "msc", name: "MSC", color: "bg-yellow-500" },
  { id: "cma-cgm", name: "CMA CGM", color: "bg-red-500" },
  { id: "evergreen", name: "Evergreen", color: "bg-green-500" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "sent": case "processed": return "default";
    case "pending": return "secondary";
    case "failed": case "unmatched": return "destructive";
    default: return "outline";
  }
};

export default function EDI() {
  const queryClient = useQueryClient();
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [selectedShipment, setSelectedShipment] = useState<string>("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["edi-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edi_messages")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments-for-edi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendBooking = useMutation({
    mutationFn: async ({ shipmentId, carrier }: { shipmentId: string; carrier: string }) => {
      const { data, error } = await supabase.functions.invoke("edi-send", {
        body: { shipment_id: shipmentId, carrier, message_type: "IFTMIN" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Booking sent to ${data.carrier?.toUpperCase()}`, {
        description: `Ref: ${data.message_ref}`,
      });
      queryClient.invalidateQueries({ queryKey: ["edi-messages"] });
    },
    onError: (error) => {
      toast.error("Failed to send booking", { description: error.message });
    },
  });

  const inbound = messages.filter((m: any) => m.direction === "inbound");
  const outbound = messages.filter((m: any) => m.direction === "outbound");

  const carrierStats = CARRIERS.map((c) => ({
    ...c,
    total: messages.filter((m: any) => m.carrier === c.id).length,
    lastMessage: messages.find((m: any) => m.carrier === c.id),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EDI Integration</h1>
          <p className="text-muted-foreground">Manage carrier communications — IFTMIN bookings & IFTSTA status updates</p>
        </div>

        {/* Carrier Status Cards */}
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {carrierStats.map((carrier) => (
              <Card key={carrier.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{carrier.name}</CardTitle>
                    <div className={`h-2 w-2 rounded-full ${carrier.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{carrier.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {carrier.lastMessage
                      ? `Last: ${format(new Date(carrier.lastMessage.created_at), "MMM d, HH:mm")}`
                      : "No messages yet"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Send Booking */}
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Booking Request (IFTMIN)
              </CardTitle>
              <CardDescription>
                Send an outbound booking request to a shipping line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedShipment} onValueChange={setSelectedShipment}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select shipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shipment_ref} — {s.origin_port || "?"} → {s.destination_port || "?"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (!selectedShipment || !selectedCarrier) {
                      toast.error("Select a shipment and carrier first");
                      return;
                    }
                    sendBooking.mutate({ shipmentId: selectedShipment, carrier: selectedCarrier });
                  }}
                  disabled={sendBooking.isPending}
                >
                  {sendBooking.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Ship className="h-4 w-4 mr-2" />
                  )}
                  Send Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Message Log */}
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                EDI Message Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All ({messages.length})</TabsTrigger>
                  <TabsTrigger value="outbound">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> Outbound ({outbound.length})
                  </TabsTrigger>
                  <TabsTrigger value="inbound">
                    <ArrowDownLeft className="h-3 w-3 mr-1" /> Inbound ({inbound.length})
                  </TabsTrigger>
                </TabsList>

                {["all", "outbound", "inbound"].map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Direction</TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Shipment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(tab === "all" ? messages : tab === "outbound" ? outbound : inbound).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No {tab === "all" ? "" : tab} EDI messages yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            (tab === "all" ? messages : tab === "outbound" ? outbound : inbound).map((msg: any) => (
                              <TableRow key={msg.id}>
                                <TableCell>
                                  {msg.direction === "outbound" ? (
                                    <ArrowUpRight className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium uppercase">{msg.carrier}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{msg.message_type}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{msg.message_ref || "—"}</TableCell>
                                <TableCell>{msg.shipments?.shipment_ref || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={statusVariant(msg.status)}>{msg.status}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {format(new Date(msg.created_at), "MMM d, HH:mm")}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Webhook Info */}
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoint</CardTitle>
              <CardDescription>
                Share this URL with carriers for inbound IFTSTA status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block bg-muted p-3 rounded-md text-sm break-all">
                {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/edi-webhook`}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                POST JSON with fields: carrier, message_type, shipment_ref, events[]
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </DashboardLayout>
  );
}
