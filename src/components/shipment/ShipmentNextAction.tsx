import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FileText, Truck, Warehouse, Ship, Shield, CreditCard, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  scrollTo?: string;
}

const ALL_STEPS: Step[] = [
  { key: "documents", label: "Complete Documents", description: "Upload or mark required shipping documents as ready.", icon: FileText, scrollTo: "documents" },
  { key: "trucking", label: "Arrange Trucking", description: "Schedule a pickup — assign driver, date, and location.", icon: Truck, scrollTo: "trucking" },
  { key: "warehouse", label: "Warehouse Coordination", description: "Log cargo arrival and set storage instructions.", icon: Warehouse, scrollTo: "warehouse" },
  { key: "vessel", label: "Confirm Vessel Booking", description: "Set carrier booking number, vessel/voyage, and cutoffs.", icon: Ship, scrollTo: "vessel" },
  { key: "customs", label: "File Customs / AES", description: "Enter exporter info, HTS codes, and submit to broker.", icon: Shield, scrollTo: "customs" },
  { key: "payment", label: "Collect Payment", description: "Process payment via Stripe or mark as paid offline.", icon: CreditCard },
  { key: "tracking", label: "Track & Deliver", description: "Monitor tracking events and update status to delivered.", icon: MapPin },
];

interface Props {
  shipmentId: string;
  shipmentStatus: string;
}

export function ShipmentNextAction({ shipmentId, shipmentStatus }: Props) {
  const { data: documents } = useQuery({
    queryKey: ["documents", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: truckPickups } = useQuery({
    queryKey: ["truck_pickups_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("truck_pickups").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: warehouseOrders } = useQuery({
    queryKey: ["warehouse_orders_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("warehouse_orders").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: driverAssignments } = useQuery({
    queryKey: ["driver_assignments_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("driver_assignments").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: vesselBookings } = useQuery({
    queryKey: ["vessel_bookings_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("vessel_bookings").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: customsFilings } = useQuery({
    queryKey: ["customs_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("customs_filings").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: payments } = useQuery({
    queryKey: ["payments_guide", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("id, status").eq("shipment_id", shipmentId);
      return data || [];
    },
    enabled: !!shipmentId,
  });

  if (shipmentStatus === "delivered" || shipmentStatus === "completed" || shipmentStatus === "cancelled") {
    return null;
  }

  // Determine completed steps
  const docsReady = (documents || []).filter(d => d.status === "uploaded" || d.status === "verified" || d.status === "completed").length >= 3;
  const truckingDone = (truckPickups || []).some(t => t.status === "completed" || t.status === "dispatched" || t.status === "in_transit")
    || (driverAssignments || []).some(d => d.status === "completed" || d.status === "en_route" || d.status === "delivered");
  const warehouseDone = (warehouseOrders || []).some(w => w.status === "completed" || w.status === "confirmed");
  const vesselDone = (vesselBookings || []).some(v => v.status === "confirmed" || v.status === "completed");
  const customsDone = (customsFilings || []).some(c => c.status === "approved" || c.status === "submitted" || c.status === "filed");
  const paymentDone = (payments || []).some(p => p.status === "completed" || p.status === "succeeded");
  const isInTransit = shipmentStatus === "in_transit";

  const completedKeys = new Set<string>();
  if (docsReady) completedKeys.add("documents");
  if (truckingDone) completedKeys.add("trucking");
  if (warehouseDone) completedKeys.add("warehouse");
  if (vesselDone) completedKeys.add("vessel");
  if (customsDone) completedKeys.add("customs");
  if (paymentDone) completedKeys.add("payment");
  if (isInTransit) completedKeys.add("tracking");

  // Find next incomplete step
  const nextStep = ALL_STEPS.find(s => !completedKeys.has(s.key));
  if (!nextStep) return null;

  const completedCount = completedKeys.size;
  const totalSteps = ALL_STEPS.length;

  const handleClick = () => {
    if (nextStep.scrollTo) {
      const el = document.querySelector(`[data-guide="${nextStep.scrollTo}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-accent", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-accent", "ring-offset-2"), 2000);
      }
    }
  };

  const Icon = nextStep.icon;

  // Show context banners for cross-portal updates
  const warehouseReceived = (warehouseOrders || []).some(w => w.status === "confirmed");
  const driverEnRoute = (driverAssignments || []).some(d => d.status === "en_route");

  return (
    <div className="space-y-3">
      {/* Cross-portal status banners */}
      {warehouseReceived && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm">
          <Warehouse className="h-4 w-4" />
          <span className="font-medium">Warehouse has confirmed cargo receipt</span>
        </div>
      )}
      {driverEnRoute && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm">
          <Truck className="h-4 w-4" />
          <span className="font-medium">Driver is en route to pickup</span>
        </div>
      )}

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <button onClick={handleClick} className="w-full text-left group">
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent/10 hover:border-accent/40 transition-all">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 group-hover:bg-accent/25 transition-colors">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                    Next Step · {completedCount}/{totalSteps}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">{nextStep.label}</p>
                <p className="text-xs text-muted-foreground">{nextStep.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
