import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowRight, Ship, FileText, Truck, CreditCard, Warehouse, UserCheck, Receipt, Building2 } from "lucide-react";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { motion } from "framer-motion";

interface ActionBanner {
  key: string;
  label: string;
  count: number;
  icon: React.ElementType;
  link: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  sortOrder: number; // 0=critical, 1=urgent, 2=attention, 3=normal
}

export function DashboardActionBanners() {
  const { user } = useAuth();
  const { needsOnboarding } = useOnboardingCheck();

  const { data: activeShipments } = useQuery({
    queryKey: ["guide-active-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("id, status, shipment_ref")
        .in("status", ["draft", "booked"]);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: missingDocs } = useQuery({
    queryKey: ["guide-missing-docs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, status")
        .eq("status", "pending");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pendingPickups } = useQuery({
    queryKey: ["guide-pending-pickups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("truck_pickups")
        .select("id")
        .eq("status", "scheduled");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: unpaidShipments } = useQuery({
    queryKey: ["guide-unpaid"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id")
        .eq("status", "accepted")
        .eq("payment_status", "unpaid");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: warehouseUpdates } = useQuery({
    queryKey: ["guide-warehouse-updates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("warehouse_orders")
        .select("id, status")
        .in("status", ["confirmed", "in_progress"]);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: driverUpdates } = useQuery({
    queryKey: ["guide-driver-updates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("driver_assignments")
        .select("id, status")
        .in("status", ["en_route", "assigned"]);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: unpaidCharges } = useQuery({
    queryKey: ["guide-unpaid-charges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipment_charges")
        .select("id, amount, currency")
        .eq("payment_status", "unpaid")
        .eq("who_pays", "shipper");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: unpaidAmendments } = useQuery({
    queryKey: ["guide-unpaid-amendments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipment_amendments")
        .select("id")
        .eq("carrier_fee_required", true)
        .eq("payment_status", "unpaid");
      return data || [];
    },
    enabled: !!user,
  });

  const banners: ActionBanner[] = [];

  // Onboarding banner — show if user skipped onboarding
  const skipped = user ? localStorage.getItem(`onboarding_skipped_${user.id}`) === "true" : false;
  if (skipped && needsOnboarding) {
    banners.push({
      key: "onboarding",
      label: "Complete your organization setup",
      count: 1,
      icon: Building2,
      link: "/onboarding",
      borderColor: "border-accent/30",
      bgColor: "bg-accent/5",
      textColor: "text-accent",
      iconColor: "text-accent",
      sortOrder: 2,
    });
  }

  const draftCount = (activeShipments || []).filter(s => s.status === "draft").length;
  if (draftCount > 0) {
    banners.push({
      key: "drafts",
      label: `${draftCount} shipment${draftCount > 1 ? "s" : ""} in draft — complete details`,
      count: draftCount,
      icon: Ship,
      link: "/dashboard/shipments",
      borderColor: "border-blue-200",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      iconColor: "text-blue-600",
      sortOrder: 2,
    });
  }

  const pendingDocCount = (missingDocs || []).length;
  if (pendingDocCount > 0) {
    banners.push({
      key: "docs",
      label: `${pendingDocCount} document${pendingDocCount > 1 ? "s" : ""} pending upload`,
      count: pendingDocCount,
      icon: FileText,
      link: "/dashboard/documents",
      borderColor: "border-orange-200",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      iconColor: "text-orange-600",
      sortOrder: 1,
    });
  }

  const pickupCount = (pendingPickups || []).length;
  if (pickupCount > 0) {
    banners.push({
      key: "pickups",
      label: `${pickupCount} truck pickup${pickupCount > 1 ? "s" : ""} need dispatching`,
      count: pickupCount,
      icon: Truck,
      link: "/dashboard/trucking",
      borderColor: "border-purple-200",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      iconColor: "text-purple-600",
    });
  }

  const unpaidCount = (unpaidShipments || []).length;
  if (unpaidCount > 0) {
    banners.push({
      key: "payments",
      label: `${unpaidCount} accepted quote${unpaidCount > 1 ? "s" : ""} awaiting payment`,
      count: unpaidCount,
      icon: CreditCard,
      link: "/dashboard/quotes",
      borderColor: "border-emerald-200",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      iconColor: "text-emerald-600",
    });
  }

  // Cross-portal banners
  const warehouseConfirmed = (warehouseUpdates || []).filter(w => w.status === "confirmed").length;
  if (warehouseConfirmed > 0) {
    banners.push({
      key: "warehouse-received",
      label: `${warehouseConfirmed} warehouse${warehouseConfirmed > 1 ? "s" : ""} confirmed cargo receipt`,
      count: warehouseConfirmed,
      icon: Warehouse,
      link: "/dashboard/shipments",
      borderColor: "border-teal-200",
      bgColor: "bg-teal-50",
      textColor: "text-teal-700",
      iconColor: "text-teal-600",
    });
  }

  const driversEnRoute = (driverUpdates || []).filter(d => d.status === "en_route").length;
  if (driversEnRoute > 0) {
    banners.push({
      key: "driver-enroute",
      label: `${driversEnRoute} driver${driversEnRoute > 1 ? "s" : ""} en route to pickup`,
      count: driversEnRoute,
      icon: UserCheck,
      link: "/dashboard/shipments",
      borderColor: "border-indigo-200",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
      iconColor: "text-indigo-600",
    });
  }

  const chargeCount = (unpaidCharges || []).length + (unpaidAmendments || []).length;
  if (chargeCount > 0) {
    banners.push({
      key: "unpaid-charges",
      label: `${chargeCount} charge${chargeCount > 1 ? "s" : ""} require payment`,
      count: chargeCount,
      icon: Receipt,
      link: "/dashboard/shipments",
      borderColor: "border-red-200",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      iconColor: "text-red-600",
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {banners.map((b, i) => (
        <motion.div
          key={b.key}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
        >
          <Link
            to={b.link}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${b.borderColor} ${b.bgColor} hover:shadow-sm transition-all`}
          >
            <b.icon className={`h-4 w-4 ${b.iconColor}`} />
            <span className={`text-sm font-medium ${b.textColor}`}>{b.label}</span>
            <ArrowRight className={`h-3.5 w-3.5 ${b.iconColor}`} />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
