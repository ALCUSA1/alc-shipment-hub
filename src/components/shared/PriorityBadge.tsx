import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CustomerPriority = "normal" | "attention_needed" | "urgent" | "critical";
export type InternalPriority = "low" | "medium" | "high" | "critical";

const CUSTOMER_PRIORITY_CONFIG: Record<CustomerPriority, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-muted text-muted-foreground border-border" },
  attention_needed: { label: "Attention Needed", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  urgent: { label: "Urgent", className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800" },
  critical: { label: "Critical Issue", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800" },
};

const INTERNAL_TO_CUSTOMER: Record<InternalPriority, CustomerPriority> = {
  low: "normal",
  medium: "attention_needed",
  high: "urgent",
  critical: "critical",
};

export function mapInternalToCustomer(internal: InternalPriority): CustomerPriority {
  return INTERNAL_TO_CUSTOMER[internal] || "normal";
}

export function getPriorityOrder(priority: CustomerPriority): number {
  const order: Record<CustomerPriority, number> = { critical: 0, urgent: 1, attention_needed: 2, normal: 3 };
  return order[priority] ?? 3;
}

interface PriorityBadgeProps {
  priority: CustomerPriority;
  className?: string;
  size?: "sm" | "default";
}

export function PriorityBadge({ priority, className, size = "default" }: PriorityBadgeProps) {
  const config = CUSTOMER_PRIORITY_CONFIG[priority] || CUSTOMER_PRIORITY_CONFIG.normal;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.className,
        size === "sm" && "text-[10px] px-1.5 py-0",
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
