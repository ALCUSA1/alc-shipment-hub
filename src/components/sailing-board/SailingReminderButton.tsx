import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellRing, DollarSign, CalendarRange } from "lucide-react";
import { useSailingReminders } from "@/hooks/useSailingReminders";
import type { ScoredSailing } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface SailingReminderButtonProps {
  sailing: ScoredSailing;
}

export function SailingReminderButton({ sailing }: SailingReminderButtonProps) {
  const { hasReminder, findReminder, addReminder, removeReminder } = useSailingReminders();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDateFrom = sailing.etd ? sailing.etd.slice(0, 10) : today;
  const defaultDateTo = sailing.etd
    ? new Date(new Date(sailing.etd).getTime() + 14 * 86400000).toISOString().slice(0, 10)
    : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState(String(Math.round(sailing.total_rate * 1.1)));
  const [remindDate, setRemindDate] = useState(() => {
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
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      price_min: priceMin ? Number(priceMin) : undefined,
      price_max: priceMax ? Number(priceMax) : undefined,
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
          {isSet ? "Remove reminder" : "Set rate alert for this sailing"}
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" />
              Set Sailing Rate Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Sailing summary */}
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
              <p className="text-sm font-bold text-foreground">
                Current: ${sailing.total_rate.toLocaleString()} {sailing.currency}
              </p>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5 text-accent" />
                Sailing Date Range
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Alert me when rates are available for sailings within this date window.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Price range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-accent" />
                Target Price Range ({sailing.currency})
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Notify me when rates fall within this price range.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Min Price</Label>
                  <Input
                    type="number"
                    placeholder="No minimum"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Max Price</Label>
                  <Input
                    type="number"
                    placeholder="No maximum"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Reminder time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Check & Remind On</Label>
              <Input
                type="datetime-local"
                value={remindDate}
                onChange={(e) => setRemindDate(e.target.value)}
                className="text-sm h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                You'll receive both an in-app notification and an email at this time.
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={addReminder.isPending || !remindDate}
              className="w-full"
              variant="electric"
            >
              {addReminder.isPending ? "Setting…" : "Set Rate Alert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
