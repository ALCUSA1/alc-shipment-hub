import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle, XCircle, Clock, Shield, Loader2,
  MessageSquare, FileText, Building2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending_review: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
  info_requested: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

const ComplianceReviewPanel = () => {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<"reject" | "info_requested">("reject");
  const [adminNotes, setAdminNotes] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-compliance-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const getProfile = (userId: string) =>
    (profiles || []).find((p: any) => p.user_id === userId);

  const pendingReviews = (reviews || []).filter((r: any) => r.status === "pending_review" || r.status === "info_requested");
  const completedReviews = (reviews || []).filter((r: any) => r.status === "approved" || r.status === "rejected");

  const handleApprove = async (reviewId: string) => {
    setProcessing(reviewId);
    try {
      const { error } = await supabase
        .from("compliance_reviews")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;
      toast.success("Compliance review approved");
      queryClient.invalidateQueries({ queryKey: ["admin-compliance-reviews"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleActionWithNotes = async () => {
    if (!dialogId) return;
    setProcessing(dialogId);
    try {
      const { error } = await supabase
        .from("compliance_reviews")
        .update({
          status: dialogAction,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dialogId);
      if (error) throw error;
      toast.success(
        dialogAction === "rejected"
          ? "Compliance review rejected"
          : "More information requested from user"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-compliance-reviews"] });
      setDialogId(null);
      setAdminNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update review");
    } finally {
      setProcessing(null);
    }
  };

  const detailReview = detailId ? (reviews || []).find((r: any) => r.id === detailId) : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg bg-[hsl(220,15%,15%)]" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Pending Reviews */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          Pending Reviews ({pendingReviews.length})
        </h3>
        {pendingReviews.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="h-8 w-8 text-[hsl(220,10%,30%)] mx-auto mb-2" />
            <p className="text-sm text-[hsl(220,10%,40%)]">No pending compliance reviews</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingReviews.map((review: any) => {
              const profile = getProfile(review.user_id);
              return (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] hover:bg-[hsl(220,15%,12%)] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {(profile?.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{profile?.full_name || "Unknown User"}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {review.exporter_name && (
                          <span className="flex items-center gap-1 text-xs text-[hsl(220,10%,45%)]">
                            <Building2 className="h-3 w-3" />
                            {review.exporter_name}
                          </span>
                        )}
                        <span className="text-xs text-[hsl(220,10%,35%)]">
                          {format(new Date(review.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-[10px] ${statusColor[review.status] || ""}`}>
                      {review.status === "info_requested" ? "Info Requested" : "Pending"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailId(review.id)}
                      className="text-[hsl(220,10%,50%)] hover:text-white h-8 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" /> View
                    </Button>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(review.id)}
                        disabled={processing === review.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                      >
                        {processing === review.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDialogAction("info_requested");
                          setDialogId(review.id);
                        }}
                        disabled={processing === review.id}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-8 text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Request Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDialogAction("reject");
                          setDialogId(review.id);
                        }}
                        disabled={processing === review.id}
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
        )}
      </div>

      {/* Completed Reviews */}
      {completedReviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[hsl(220,10%,50%)] mb-3">
            Recent Decisions ({completedReviews.length})
          </h3>
          <div className="space-y-2">
            {completedReviews.slice(0, 10).map((review: any) => {
              const profile = getProfile(review.user_id);
              return (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,8%)] opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[hsl(220,10%,45%)]">{profile?.full_name || "Unknown"}</span>
                    <span className="text-xs text-[hsl(220,10%,35%)]">{review.exporter_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${statusColor[review.status] || ""}`}>
                      {review.status}
                    </Badge>
                    {review.reviewed_at && (
                      <span className="text-[10px] text-[hsl(220,10%,35%)]">
                        {format(new Date(review.reviewed_at), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Compliance Details
            </DialogTitle>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">Exporter (USPPI)</label>
                  <p className="text-white">{detailReview.exporter_name || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">EIN / Tax ID</label>
                  <p className="text-white">{detailReview.exporter_ein || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">AES Citation</label>
                  <p className="text-white">{detailReview.aes_type || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">Export License</label>
                  <p className="text-white">{detailReview.export_license || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">Insurance Provider</label>
                  <p className="text-white">{detailReview.insurance_provider || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">Policy #</label>
                  <p className="text-white">{detailReview.insurance_policy || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-0.5">Coverage (USD)</label>
                  <p className="text-white">{detailReview.insurance_coverage ? `$${Number(detailReview.insurance_coverage).toLocaleString()}` : "—"}</p>
                </div>
              </div>
              {detailReview.admin_notes && (
                <div className="rounded-lg border border-[hsl(220,15%,18%)] bg-[hsl(220,18%,12%)] p-3">
                  <label className="text-[10px] text-[hsl(220,10%,45%)] block mb-1">Admin Notes</label>
                  <p className="text-white text-xs">{detailReview.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject / Request Info Dialog */}
      <Dialog open={!!dialogId} onOpenChange={() => { setDialogId(null); setAdminNotes(""); }}>
        <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "reject" ? "Reject Compliance Review" : "Request More Information"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(220,10%,45%)] mb-1 block">
                {dialogAction === "reject" ? "Reason for rejection" : "What additional information is needed?"}
              </label>
              <Textarea
                placeholder={
                  dialogAction === "reject"
                    ? "e.g. EIN does not match company records"
                    : "e.g. Please provide a valid export license number"
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)] text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setDialogId(null); setAdminNotes(""); }}>
                Cancel
              </Button>
              <Button
                onClick={handleActionWithNotes}
                disabled={!!processing}
                className={
                  dialogAction === "reject"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {dialogAction === "reject" ? "Reject" : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ComplianceReviewPanel;
