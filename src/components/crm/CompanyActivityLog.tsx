import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Plus, MessageSquare, Phone, Mail, FileText, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  document: FileText,
  status_change: ArrowRightLeft,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: "bg-accent/10 text-accent",
  call: "bg-blue-100 text-blue-600",
  email: "bg-green-100 text-green-600",
  document: "bg-yellow-100 text-yellow-600",
  status_change: "bg-secondary text-muted-foreground",
};

interface CompanyActivityLogProps {
  companyId: string;
}

export function CompanyActivityLog({ companyId }: CompanyActivityLogProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ activity_type: "note", title: "", description: "" });

  const { data: activities = [] } = useQuery({
    queryKey: ["company-activities", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_activities")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("company_activities").insert({
        company_id: companyId,
        user_id: user.id,
        activity_type: form.activity_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-activities", companyId] });
      toast.success("Activity logged");
      setForm({ activity_type: "note", title: "", description: "" });
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            Activity Log
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Log Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="border border-border rounded-lg p-3 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select value={form.activity_type} onValueChange={(v) => setForm((p) => ({ ...p, activity_type: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  className="h-8 text-xs"
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
            </div>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder="Details..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="electric" size="sm" onClick={() => addActivity.mutate()} disabled={addActivity.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((a: any) => {
                const Icon = ACTIVITY_ICONS[a.activity_type] || MessageSquare;
                const color = ACTIVITY_COLORS[a.activity_type] || ACTIVITY_COLORS.note;
                return (
                  <div key={a.id} className="relative flex gap-3 pl-0">
                    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0 z-10`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(a.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
