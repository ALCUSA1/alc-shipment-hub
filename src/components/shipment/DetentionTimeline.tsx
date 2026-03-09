import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2, Container } from "lucide-react";
import { differenceInDays, format, addDays, isPast, isBefore } from "date-fns";

interface DetentionTimelineProps {
  eta?: string | null;
  dischargeDate?: string | null;
  containerPickupDate?: string | null;
  emptyReturnDate?: string | null;
  terminalFreeDays?: number;
  streetFreeDays?: number;
  chassisFreeDays?: number;
  returnLocation?: string | null;
}

interface TimelineItem {
  label: string;
  date: Date | null;
  icon: "clock" | "alert" | "check" | "container";
  status: "completed" | "upcoming" | "overdue" | "safe";
  detail?: string;
}

export function DetentionTimeline({
  eta,
  dischargeDate,
  containerPickupDate,
  emptyReturnDate,
  terminalFreeDays = 4,
  streetFreeDays = 4,
  chassisFreeDays = 4,
  returnLocation,
}: DetentionTimelineProps) {
  const discharge = dischargeDate ? new Date(dischargeDate) : eta ? addDays(new Date(eta), 1) : null;
  const pickup = containerPickupDate ? new Date(containerPickupDate) : null;
  const returned = emptyReturnDate ? new Date(emptyReturnDate) : null;

  if (!discharge) return null;

  const terminalLastFreeDay = addDays(discharge, terminalFreeDays);
  const streetLastFreeDay = pickup ? addDays(pickup, streetFreeDays) : null;
  const chassisDeadline = pickup ? addDays(pickup, chassisFreeDays) : null;
  const now = new Date();

  const getDateStatus = (d: Date | null, completedDate: Date | null): "completed" | "upcoming" | "overdue" | "safe" => {
    if (completedDate) return "completed";
    if (!d) return "safe";
    if (isPast(d)) return "overdue";
    if (differenceInDays(d, now) <= 2) return "upcoming";
    return "safe";
  };

  const items: TimelineItem[] = [
    {
      label: "Vessel Discharge",
      date: discharge,
      icon: "container",
      status: discharge && isPast(discharge) ? "completed" : "safe",
      detail: "Container available at terminal",
    },
    {
      label: "Terminal Last Free Day",
      date: terminalLastFreeDay,
      icon: "clock",
      status: getDateStatus(terminalLastFreeDay, pickup),
      detail: `${terminalFreeDays} free days from discharge`,
    },
    {
      label: "Container Pickup",
      date: pickup,
      icon: pickup ? "check" : "clock",
      status: pickup ? "completed" : (isPast(terminalLastFreeDay) ? "overdue" : "safe"),
      detail: pickup ? "Picked up from terminal" : "Schedule pickup before free time expires",
    },
    ...(streetLastFreeDay ? [{
      label: "Street Last Free Day",
      date: streetLastFreeDay,
      icon: "clock" as const,
      status: getDateStatus(streetLastFreeDay, returned),
      detail: `${streetFreeDays} free days outside terminal`,
    }] : []),
    {
      label: "Empty Return",
      date: returned || (chassisDeadline || null),
      icon: returned ? "check" : "alert",
      status: returned ? "completed" : (chassisDeadline && isPast(chassisDeadline) ? "overdue" : "safe"),
      detail: returned ? `Returned${returnLocation ? ` to ${returnLocation}` : ""}` : (returnLocation ? `Return to: ${returnLocation}` : "Return empty container"),
    },
  ];

  const statusColor = {
    completed: "text-green-600",
    upcoming: "text-yellow-600",
    overdue: "text-destructive",
    safe: "text-muted-foreground",
  };

  const dotColor = {
    completed: "bg-green-500",
    upcoming: "bg-yellow-500",
    overdue: "bg-destructive",
    safe: "bg-muted-foreground/30",
  };

  const Icon = ({ type, className }: { type: string; className?: string }) => {
    switch (type) {
      case "alert": return <AlertTriangle className={className} />;
      case "check": return <CheckCircle2 className={className} />;
      case "container": return <Container className={className} />;
      default: return <Clock className={className} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          Detention Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

          {items.map((item, i) => (
            <div key={i} className="relative flex items-start gap-3">
              {/* Dot */}
              <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 border-background flex items-center justify-center ${dotColor[item.status]}`}>
                {item.status === "completed" && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${statusColor[item.status]}`}>{item.label}</span>
                  {item.status === "overdue" && (
                    <Badge variant="destructive" className="text-[9px] py-0 h-4">Overdue</Badge>
                  )}
                  {item.status === "upcoming" && (
                    <Badge className="text-[9px] py-0 h-4 bg-yellow-100 text-yellow-700">Soon</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.date && (
                    <span className="text-[11px] text-foreground">{format(item.date, "MMM d, yyyy")}</span>
                  )}
                  {item.detail && (
                    <span className="text-[10px] text-muted-foreground">· {item.detail}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
