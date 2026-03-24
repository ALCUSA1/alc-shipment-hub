import { useMemo } from "react";
import { AlertTriangle, Clock, FileText, CreditCard, Anchor, Shield } from "lucide-react";
import { differenceInHours, differenceInDays, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PriorityBadge, type CustomerPriority } from "@/components/shared/PriorityBadge";

interface Props {
  shipment: Record<string, any>;
  documents?: any[];
  payments?: any[];
  customsFilings?: any[];
}

interface Banner {
  id: string;
  icon: React.ElementType;
  message: string;
  severity: "warning" | "critical" | "info";
  priority: CustomerPriority;
}

export function AiSmartBanners({ shipment, documents, payments, customsFilings }: Props) {
  const banners = useMemo(() => {
    const items: Banner[] = [];
    const now = new Date();

    // 1. Cutoff approaching
    const cutoffs = [
      { key: "cy_cutoff", label: "CY Cutoff" },
      { key: "si_cutoff", label: "SI Cutoff" },
      { key: "vgm_cutoff", label: "VGM Cutoff" },
      { key: "doc_cutoff", label: "Doc Cutoff" },
    ];
    for (const c of cutoffs) {
      const val = (shipment as any)[c.key];
      if (val) {
        const hoursLeft = differenceInHours(parseISO(val), now);
        if (hoursLeft > 0 && hoursLeft <= 24) {
          items.push({
            id: `cutoff-${c.key}`,
            icon: Clock,
            message: `⏰ ${c.label} is in ${hoursLeft} hours — act now to avoid delays.`,
            severity: "critical",
            priority: "critical",
          });
        } else if (hoursLeft > 24 && hoursLeft <= 72) {
          items.push({
            id: `cutoff-${c.key}`,
            icon: Clock,
            message: `${c.label} is approaching in ${Math.ceil(hoursLeft / 24)} days.`,
            severity: "warning",
            priority: "attention_needed",
          });
        }
      }
    }

    // 2. Missing documents
    if (documents) {
      const pending = documents.filter(d => d.status === "pending" || d.status === "draft");
      if (pending.length > 0 && ["booked", "in_transit"].includes(shipment.status)) {
        items.push({
          id: "docs-missing",
          icon: FileText,
          message: `${pending.length} document${pending.length > 1 ? "s" : ""} still pending — complete before vessel departure.`,
          severity: pending.length >= 3 ? "critical" : "warning",
          priority: pending.length >= 3 ? "urgent" : "attention_needed",
        });
      }
    }

    // 3. Payment not collected
    if (payments) {
      const hasPaid = payments.some(p => p.status === "completed" || p.status === "succeeded");
      if (!hasPaid && ["in_transit", "arrived"].includes(shipment.status)) {
        items.push({
          id: "payment-pending",
          icon: CreditCard,
          message: "Payment has not been collected yet — shipment is already in transit.",
          severity: "warning",
          priority: "urgent",
        });
      }
    }

    // 4. No vessel booking
    if (shipment.status === "draft" && !shipment.booking_ref && shipment.mode !== "air") {
      const etd = shipment.etd ? parseISO(shipment.etd) : null;
      if (etd) {
        const daysToEtd = differenceInDays(etd, now);
        if (daysToEtd <= 7 && daysToEtd > 0) {
          items.push({
            id: "no-booking",
            icon: Anchor,
            message: `ETD is in ${daysToEtd} day${daysToEtd !== 1 ? "s" : ""} but no carrier booking exists yet.`,
            severity: "critical",
          });
        }
      }
    }

    // 5. Customs not filed
    if (customsFilings) {
      const filed = customsFilings.some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed");
      if (!filed && ["booked", "in_transit"].includes(shipment.status)) {
        items.push({
          id: "customs-not-filed",
          icon: Shield,
          message: "Customs/AES filing has not been submitted — required before vessel departure.",
          severity: "warning",
        });
      }
    }

    return items;
  }, [shipment, documents, payments, customsFilings]);

  if (banners.length === 0) return null;

  const severityStyles = {
    critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  };

  return (
    <AnimatePresence>
      <div className="space-y-2">
        {banners.map((banner, i) => {
          const Icon = banner.icon;
          return (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm ${severityStyles[banner.severity]}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium text-xs">{banner.message}</span>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}
