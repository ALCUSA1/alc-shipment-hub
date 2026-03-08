import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare, Phone, Mail, FileText, Clock, User, Building2, Plus,
} from "lucide-react";

const ACTIVITY_TYPES = [
  { value: "note", label: "Note", icon: FileText, color: "text-blue-400" },
  { value: "call", label: "Call", icon: Phone, color: "text-emerald-400" },
  { value: "email", label: "Email", icon: Mail, color: "text-amber-400" },
];

interface LeadActivityPanelProps {
  lead: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadActivityPanel({ lead, open, onOpenChange }: LeadActivityPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["lead-activities", lead?.id],
    queryFn: async () => {
      if (!lead) return [];
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead,
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!lead || !user) return;
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        user_id: user.id,
        activity_type: activityType,
        title,
        description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead?.id] });
      setTitle("");
      setDescription("");
      toast.success("Activity added");
    },
    onError: () => toast.error("Failed to add activity"),
  });

  const typeConfig = ACTIVITY_TYPES.find((t) => t.value === activityType)!;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[hsl(220,18%,8%)] border-[hsl(220,15%,15%)] text-white w-full sm:max-w-lg overflow-y-auto">
        {lead && (
          <>
            <SheetHeader className="pb-4 border-b border-[hsl(220,15%,15%)]">
              <SheetTitle className="text-white flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-400" />
                {lead.full_name}
              </SheetTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                {lead.company_name && (
                  <span className="text-[11px] text-[hsl(220,10%,50%)] flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {lead.company_name}
                  </span>
                )}
                {lead.email && (
                  <span className="text-[11px] text-[hsl(220,10%,50%)] flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="text-[11px] text-[hsl(220,10%,50%)] flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </span>
                )}
              </div>
            </SheetHeader>

            {/* Add activity form */}
            <div className="mt-4 rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,15%,10%)] p-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Log Activity</p>
              <Tabs value={activityType} onValueChange={setActivityType}>
                <TabsList className="bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] h-8">
                  {ACTIVITY_TYPES.map((t) => (
                    <TabsTrigger key={t.value} value={t.value} className="text-[11px] gap-1 data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white">
                      <t.icon className="h-3 w-3" /> {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div>
                <Label className="text-[10px] text-[hsl(220,10%,45%)]">Subject *</Label>
                <Input
                  className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white h-8 text-xs"
                  placeholder={activityType === "call" ? "Call with prospect…" : activityType === "email" ? "Follow-up email…" : "Quick note…"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-[hsl(220,10%,45%)]">Details</Label>
                <Textarea
                  className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white text-xs min-h-[60px]"
                  placeholder="Add details…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white text-xs"
                disabled={!title.trim() || addActivity.isPending}
                onClick={() => addActivity.mutate()}
              >
                <Plus className="h-3 w-3 mr-1" />
                {addActivity.isPending ? "Adding…" : `Log ${typeConfig.label}`}
              </Button>
            </div>

            {/* Timeline */}
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] mb-3">Activity Timeline</p>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full bg-[hsl(220,15%,15%)]" />)}
                </div>
              ) : !activities?.length ? (
                <p className="text-xs text-[hsl(220,10%,35%)] text-center py-8">No activities yet. Log the first one above.</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[hsl(220,15%,18%)]" />
                  <div className="space-y-4">
                    {activities.map((a: any) => {
                      const cfg = ACTIVITY_TYPES.find((t) => t.value === a.activity_type) || ACTIVITY_TYPES[0];
                      const Icon = cfg.icon;
                      return (
                        <div key={a.id} className="flex gap-3 relative">
                          <div className={`z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[hsl(220,15%,20%)] bg-[hsl(220,15%,10%)] ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,15%,10%)] p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-white">{a.title}</span>
                              <Badge variant="outline" className={`text-[9px] border-current/20 ${cfg.color} bg-transparent`}>
                                {cfg.label}
                              </Badge>
                            </div>
                            {a.description && (
                              <p className="text-[11px] text-[hsl(220,10%,50%)] mt-1 whitespace-pre-wrap">{a.description}</p>
                            )}
                            <p className="text-[10px] text-[hsl(220,10%,35%)] mt-1.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(a.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
