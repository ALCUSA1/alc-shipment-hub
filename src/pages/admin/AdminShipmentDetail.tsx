import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { VesselBookingPanel } from "@/components/shipment/VesselBookingPanel";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Package, ArrowLeft, MapPin, Ship, Calendar, FileText, Truck, DollarSign,
  Users, CheckCircle2, Clock, Pencil, Save, X, AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SHIPMENT_STATUSES = ["draft", "booked", "in_transit", "arrived", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  draft: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)]",
  booked: "bg-blue-500/15 text-blue-400",
  in_transit: "bg-indigo-500/15 text-indigo-400",
  arrived: "bg-purple-500/15 text-purple-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const AdminShipmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["admin-shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, companies(company_name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: owner } = useQuery({
    queryKey: ["admin-shipment-owner", shipment?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("user_id", shipment!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!shipment?.user_id,
  });

  const { data: containers } = useQuery({
    queryKey: ["admin-shipment-containers", id],
    queryFn: async () => {
      const { data } = await supabase.from("containers").select("*").eq("shipment_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: cargo } = useQuery({
    queryKey: ["admin-shipment-cargo", id],
    queryFn: async () => {
      const { data } = await supabase.from("cargo").select("*").eq("shipment_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: parties } = useQuery({
    queryKey: ["admin-shipment-parties", id],
    queryFn: async () => {
      const { data } = await supabase.from("shipment_parties").select("*").eq("shipment_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: tracking } = useQuery({
    queryKey: ["admin-shipment-tracking", id],
    queryFn: async () => {
      const { data } = await supabase.from("tracking_events").select("*").eq("shipment_id", id!).order("event_date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: financials } = useQuery({
    queryKey: ["admin-shipment-financials", id],
    queryFn: async () => {
      const { data } = await supabase.from("shipment_financials").select("*").eq("shipment_id", id!).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("shipments").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipment", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-shipments"] });
      setEditing(false);
      setEditData({});
      toast.success("Shipment updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startEditing = () => {
    if (!shipment) return;
    setEditData({
      status: shipment.status,
      origin_port: shipment.origin_port || "",
      destination_port: shipment.destination_port || "",
      vessel: shipment.vessel || "",
      voyage: shipment.voyage || "",
      booking_ref: shipment.booking_ref || "",
      etd: shipment.etd || "",
      eta: shipment.eta || "",
      pickup_location: shipment.pickup_location || "",
      delivery_location: shipment.delivery_location || "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(editData)) {
      if (val !== (shipment as any)?.[key] && val !== "") {
        updates[key] = val || null;
      }
    }
    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-[hsl(220,15%,15%)]" />
          <Skeleton className="h-[400px] w-full bg-[hsl(220,15%,15%)]" />
        </div>
      </AdminLayout>
    );
  }

  if (!shipment) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Shipment not found</h2>
          <Link to="/admin/shipments" className="text-sm text-blue-400 hover:text-blue-300">← Back to shipments</Link>
        </div>
      </AdminLayout>
    );
  }

  const totalRevenue = financials?.filter(f => f.entry_type === "revenue").reduce((s, f) => s + f.amount, 0) || 0;
  const totalCosts = financials?.filter(f => f.entry_type === "cost").reduce((s, f) => s + f.amount, 0) || 0;

  const Field = ({ label, value, field }: { label: string; value: string; field?: string }) => {
    if (editing && field && field in editData) {
      if (field === "status") {
        return (
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{label}</Label>
            <Select value={editData.status} onValueChange={(v) => setEditData(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="mt-1 bg-[hsl(220,18%,13%)] border-[hsl(220,15%,20%)] text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,16%)]">
                {SHIPMENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-[hsl(220,15%,18%)] focus:text-white">
                    {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      return (
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{label}</Label>
          <Input
            value={editData[field] || ""}
            onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
            className="mt-1 bg-[hsl(220,18%,13%)] border-[hsl(220,15%,20%)] text-white h-9"
            type={field === "etd" || field === "eta" ? "date" : "text"}
          />
        </div>
      );
    }
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{label}</p>
        <p className="text-sm text-white mt-1">{value || "—"}</p>
      </div>
    );
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/admin/shipments" className="flex items-center gap-1 text-xs text-[hsl(220,10%,45%)] hover:text-blue-400 transition-colors mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to shipments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">{shipment.shipment_ref}</h1>
            <Badge variant="secondary" className={`text-[10px] border-0 ${statusColors[shipment.status] || statusColors.draft}`}>
              {shipment.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-[hsl(220,10%,45%)] mt-1">
            Owner: <span className="text-white">{owner?.full_name || "Unknown"}</span> · {owner?.company_name || (shipment as any).companies?.company_name || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditing(false); setEditData({}); }}
                className="text-[hsl(220,10%,50%)] hover:text-white hover:bg-[hsl(220,15%,15%)]"
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
              >
                <Save className="h-4 w-4 mr-1" /> Save Changes
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={startEditing}
              className="bg-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,20%)] text-white border border-[hsl(220,15%,20%)]"
            >
              <Pencil className="h-4 w-4 mr-1" /> Edit Shipment
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Shipment Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Routing & Voyage</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Origin Port" value={shipment.origin_port || ""} field="origin_port" />
              <Field label="Destination Port" value={shipment.destination_port || ""} field="destination_port" />
              <Field label="Vessel" value={shipment.vessel || ""} field="vessel" />
              <Field label="Voyage" value={shipment.voyage || ""} field="voyage" />
              <Field label="Booking Ref" value={shipment.booking_ref || ""} field="booking_ref" />
              <Field label="Status" value={shipment.status} field="status" />
              <Field label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : ""} field="etd" />
              <Field label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : ""} field="eta" />
              <Field label="Pickup Location" value={shipment.pickup_location || ""} field="pickup_location" />
              <Field label="Delivery Location" value={shipment.delivery_location || ""} field="delivery_location" />
            </div>
          </div>

          {/* Vessel Bookings */}
          <VesselBookingPanel shipmentId={id!} variant="admin" />

          {/* Containers */}
          {(containers || []).length > 0 && (
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Containers ({containers?.length})</h2>
              </div>
              <div className="space-y-2">
                {containers?.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,15%,8%)] px-4 py-3">
                    <div>
                      <span className="text-sm text-white font-mono">{c.container_number || "No number"}</span>
                      <span className="text-xs text-[hsl(220,10%,40%)] ml-3">{c.container_type} × {c.quantity}</span>
                    </div>
                    {c.seal_number && <span className="text-xs text-[hsl(220,10%,40%)]">Seal: {c.seal_number}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cargo */}
          {(cargo || []).length > 0 && (
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Cargo ({cargo?.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,15%)]">
                      <th className="text-left text-[hsl(220,10%,40%)] p-2 uppercase tracking-wider font-semibold">Commodity</th>
                      <th className="text-left text-[hsl(220,10%,40%)] p-2 uppercase tracking-wider font-semibold">HS Code</th>
                      <th className="text-left text-[hsl(220,10%,40%)] p-2 uppercase tracking-wider font-semibold">Packages</th>
                      <th className="text-left text-[hsl(220,10%,40%)] p-2 uppercase tracking-wider font-semibold">Weight</th>
                      <th className="text-left text-[hsl(220,10%,40%)] p-2 uppercase tracking-wider font-semibold">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargo?.map(c => (
                      <tr key={c.id} className="border-b border-[hsl(220,15%,12%)] last:border-0">
                        <td className="p-2 text-white">{c.commodity || "—"}</td>
                        <td className="p-2 text-[hsl(220,10%,55%)] font-mono">{c.hs_code || "—"}</td>
                        <td className="p-2 text-[hsl(220,10%,55%)]">{c.num_packages ?? "—"} {c.package_type || ""}</td>
                        <td className="p-2 text-[hsl(220,10%,55%)]">{c.gross_weight ? `${c.gross_weight} kg` : "—"}</td>
                        <td className="p-2 text-[hsl(220,10%,55%)]">{c.volume ? `${c.volume} m³` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tracking */}
          {(tracking || []).length > 0 && (
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Tracking Events ({tracking?.length})</h2>
              </div>
              <div className="space-y-3">
                {tracking?.map((t, i) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-blue-400" : "bg-[hsl(220,15%,25%)]"}`} />
                      {i < (tracking?.length || 1) - 1 && <div className="w-px flex-1 bg-[hsl(220,15%,18%)]" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-white font-medium">{t.milestone.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-[hsl(220,10%,45%)]">
                        {format(new Date(t.event_date), "MMM d, yyyy HH:mm")}
                        {t.location ? ` · ${t.location}` : ""}
                      </p>
                      {t.notes && <p className="text-xs text-[hsl(220,10%,40%)] mt-0.5">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Parties */}
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Parties</h2>
            </div>
            {(parties || []).length === 0 ? (
              <p className="text-xs text-[hsl(220,10%,35%)]">No parties assigned.</p>
            ) : (
              <div className="space-y-3">
                {parties?.map(p => (
                  <div key={p.id} className="rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,15%,8%)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold mb-1">{p.role}</p>
                    <p className="text-sm text-white font-medium">{p.company_name}</p>
                    {p.contact_name && <p className="text-xs text-[hsl(220,10%,50%)]">{p.contact_name}</p>}
                    {p.email && <p className="text-xs text-blue-400">{p.email}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Financials</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-[hsl(220,10%,45%)]">Revenue</span>
                <span className="text-sm font-medium text-emerald-400">${totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[hsl(220,10%,45%)]">Costs</span>
                <span className="text-sm font-medium text-red-400">${totalCosts.toLocaleString()}</span>
              </div>
              <div className="border-t border-[hsl(220,15%,15%)] pt-2 flex justify-between">
                <span className="text-xs font-semibold text-[hsl(220,10%,50%)]">Margin</span>
                <span className={`text-sm font-bold ${totalRevenue - totalCosts >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ${(totalRevenue - totalCosts).toLocaleString()}
                </span>
              </div>
            </div>
            {(financials || []).length > 0 && (
              <div className="mt-4 pt-3 border-t border-[hsl(220,15%,15%)] space-y-2 max-h-48 overflow-y-auto">
                {financials?.map(f => (
                  <div key={f.id} className="flex justify-between text-xs">
                    <span className="text-[hsl(220,10%,50%)] truncate mr-2">{f.description}</span>
                    <span className={f.entry_type === "revenue" ? "text-emerald-400" : "text-red-400"}>
                      {f.entry_type === "revenue" ? "+" : "-"}${f.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Metadata</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,40%)]">Created</span>
                <span className="text-[hsl(220,10%,55%)]">{format(new Date(shipment.created_at), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,40%)]">Updated</span>
                <span className="text-[hsl(220,10%,55%)]">{format(new Date(shipment.updated_at), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,40%)]">Type</span>
                <span className="text-[hsl(220,10%,55%)]">{shipment.shipment_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(220,10%,40%)]">User ID</span>
                <span className="text-[hsl(220,10%,55%)] font-mono">{shipment.user_id.slice(0, 12)}…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminShipmentDetail;
