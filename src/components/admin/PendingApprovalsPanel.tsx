import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Building2, Shield, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const roleColor: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400 border-red-500/20",
  ops_manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  viewer: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]",
  trucker: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const PendingApprovalsPanel = () => {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-signup-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles to get names/emails
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const getProfile = (userId: string) =>
    (profiles || []).find((p) => p.user_id === userId);

  const handleAction = async (requestId: string, action: "approve" | "reject", reason?: string) => {
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("approve-signup", {
        body: { request_id: requestId, action, rejection_reason: reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || `Request ${action}d`);
      queryClient.invalidateQueries({ queryKey: ["admin-signup-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      setRejectDialogId(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg bg-[hsl(220,15%,15%)]" />
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-[hsl(220,10%,30%)] mx-auto mb-2" />
        <p className="text-sm text-[hsl(220,10%,40%)]">No pending signup requests</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {requests.map((req: any) => {
          const profile = getProfile(req.user_id);
          return (
            <div
              key={req.id}
              className="flex items-center justify-between p-4 rounded-lg border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] hover:bg-[hsl(220,15%,12%)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
                  {(profile?.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{profile?.full_name || "Unknown"}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {req.company_name && (
                      <span className="flex items-center gap-1 text-xs text-[hsl(220,10%,45%)]">
                        <Building2 className="h-3 w-3" />
                        {req.company_name}
                      </span>
                    )}
                    <span className="text-xs text-[hsl(220,10%,35%)]">
                      {format(new Date(req.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-[10px] ${roleColor[req.requested_role] || ""}`}>
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {req.requested_role?.replace("_", " ")}
                </Badge>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleAction(req.id, "approve")}
                    disabled={processing === req.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                  >
                    {processing === req.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectDialogId(req.id)}
                    disabled={processing === req.id}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={() => { setRejectDialogId(null); setRejectionReason(""); }}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Signup Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(220,10%,45%)] mb-1 block">Reason (optional)</label>
              <Input
                placeholder="e.g. Unable to verify company credentials"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setRejectDialogId(null); setRejectionReason(""); }}>
                Cancel
              </Button>
              <Button
                onClick={() => rejectDialogId && handleAction(rejectDialogId, "reject", rejectionReason)}
                disabled={!!processing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingApprovalsPanel;
