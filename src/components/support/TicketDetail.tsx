import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, User, Headphones, Package } from "lucide-react";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  waiting_on_customer: { label: "Waiting on You", variant: "outline" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "secondary" },
};

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: ticket } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, shipments:shipment_id(id, reference, origin, destination)")
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: user!.id,
        sender_name: user?.email?.split("@")[0] || "You",
        content: reply,
        is_staff: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      setReply("");
      toast.success("Reply sent");
    },
  });

  if (!ticket) return null;
  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to tickets</Button>

      {/* Ticket header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_ref}</span>
              <h2 className="text-lg font-semibold text-foreground">{ticket.subject}</h2>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={(ticket as any).priority || "normal"} />
              <Badge variant="outline">{ticket.category}</Badge>
              <Badge variant={sc.variant}>{sc.label}</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
          <p className="text-xs text-muted-foreground mt-3">Created {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
        </CardContent>
      </Card>

      {/* Thread */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No replies yet. Our team will respond shortly.</p>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex gap-3 ${msg.is_staff ? "" : "flex-row-reverse"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.is_staff ? "bg-primary/10" : "bg-accent/10"}`}>
              {msg.is_staff ? <Headphones className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-accent" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.is_staff ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
              <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender_name || "Support"}</p>
              <p className="text-sm">{msg.content}</p>
              <p className="text-[10px] opacity-50 mt-1">{format(new Date(msg.created_at), "MMM d, h:mm a")}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      {ticket.status !== "closed" && (
        <div className="flex gap-2">
          <Textarea placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} rows={2} className="flex-1" />
          <Button size="icon" className="shrink-0 self-end" disabled={!reply.trim() || sendReply.isPending} onClick={() => sendReply.mutate()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
