import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowRight, Ship, FileText, Truck, CreditCard } from "lucide-react";
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
}

export function DashboardActionBanners() {
  const { user } = useAuth();

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

  const banners: ActionBanner[] = [];

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
