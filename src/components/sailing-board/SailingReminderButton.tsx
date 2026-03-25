import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useSailingReminders } from "@/hooks/useSailingReminders";
import type { ScoredSailing } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SailingReminderButtonProps {
  sailing: ScoredSailing;
}

export function SailingReminderButton({ sailing }: SailingReminderButtonProps) {
  const { hasReminder, findReminder, addReminder, removeReminder } = useSailingReminders();
  const [open, setOpen] = useState(false);
  const [remindDate, setRemindDate] = useState(() => {
    // Default: 1 day before ETD, or tomorrow
    if (sailing.etd) {
      const d = new Date(sailing.etd);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 16);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  });

  const isSet = hasReminder(sailing.carrier, sailing.origin_port, sailing.destination_port, sailing.etd);
  const existing = findReminder(sailing.carrier, sailing.origin_port, sailing.destination_port, sailing.etd);

  const handleToggle = () => {
    if (isSet && existing) {
      removeReminder.mutate(existing.id);
    } else {
      setOpen(true);
    }
  };

  const handleConfirm = () => {
    addReminder.mutate({
      carrier: sailing.carrier,
      origin_port: sailing.origin_port,
      destination_port: sailing.destination_port,
      container_type: sailing.container_type,
      etd: sailing.etd,
      remind_at: new Date(remindDate).toISOString(),
      sailing_data: {
        total_rate: sailing.total_rate,
        currency: sailing.currency,
        transit_days: sailing.transit_days,
        ai_label: sailing.ai_label,
        availability: sailing.availability,
        service_level: sailing.service_level,
      },
    });
    setOpen(false);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isSet ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 shrink-0 ${isSet ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
            onClick={handleToggle}
            disabled={addReminder.isPending || removeReminder.isPending}
          >
            {isSet ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isSet ? "Remove reminder" : "Set reminder for this sailing"}
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" />
              Set Sailing Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{sailing.carrier}</p>
              <p className="text-xs text-muted-foreground">
                {sailing.origin_port} → {sailing.destination_port}
              </p>
              {sailing.etd && (
                <p className="text-xs text-muted-foreground">
                  ETD: {new Date(sailing.etd).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm font-bold text-foreground">${sailing.total_rate.toLocaleString()} {sailing.currency}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remind-date" className="text-sm">Remind me on</Label>
              <Input
                id="remind-date"
                type="datetime-local"
                value={remindDate}
                onChange={(e) => setRemindDate(e.target.value)}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                You'll receive a notification at this time to check availability.
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={addReminder.isPending || !remindDate}
              className="w-full"
              variant="electric"
            >
              {addReminder.isPending ? "Setting…" : "Set Reminder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
