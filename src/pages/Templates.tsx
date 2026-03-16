import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Copy, Trash2, Ship, Plane, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["shipment-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_templates")
        .select("*")
        .eq("user_id", user!.id)
        .order("use_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipment_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment-templates"] });
      toast({ title: "Template deleted" });
      setDeleteId(null);
    },
  });

  const useTemplate = async (template: any) => {
    // Increment use count
    await supabase
      .from("shipment_templates")
      .update({ use_count: (template.use_count || 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", template.id);

    // Navigate to new shipment with template data as query params
    const params = new URLSearchParams();
    params.set("template", template.id);
    navigate(`/dashboard/shipments/new?${params.toString()}`);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipment Templates</h1>
          <p className="text-sm text-muted-foreground">
            Save and reuse shipment configurations for faster booking
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : templates && templates.length > 0 ? (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">
                      {t.origin_port || "—"} → {t.destination_port || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {t.mode === "air" ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
                        {t.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.commodity || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.use_count || 0}x
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => useTemplate(t)} title="Use template">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No templates saved yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Save a shipment as template from any shipment detail page
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Templates;
