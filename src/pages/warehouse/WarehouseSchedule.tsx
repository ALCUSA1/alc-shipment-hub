import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, PackageOpen, PackageCheck } from "lucide-react";
import { format, addDays } from "date-fns";

const demoSchedule = [
  { id: "1", type: "Receiving", cargo: "Electronics — 40 pallets", time: "09:00 AM", date: new Date(), status: "confirmed", ref: "WH-2026-001" },
  { id: "2", type: "Release", cargo: "Textiles — 12 pallets", time: "02:00 PM", date: new Date(), status: "pending", ref: "WH-2026-002" },
  { id: "3", type: "Receiving", cargo: "Auto Parts — 25 pallets", time: "10:00 AM", date: addDays(new Date(), 1), status: "scheduled", ref: "WH-2026-003" },
  { id: "4", type: "Release", cargo: "Consumer Goods — 8 pallets", time: "03:00 PM", date: addDays(new Date(), 2), status: "scheduled", ref: "WH-2026-004" },
];

const statusStyle: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const WarehouseSchedule = () => {
  const grouped = demoSchedule.reduce<Record<string, typeof demoSchedule>>((acc, item) => {
    const key = format(item.date, "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming appointments and cargo movements</p>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([dateKey, items]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{format(new Date(dateKey), "EEEE, MMM d, yyyy")}</h2>
              <Badge variant="secondary" className="text-xs">{items.length} appointments</Badge>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${item.type === "Receiving" ? "bg-blue-500/10" : "bg-orange-500/10"}`}>
                          {item.type === "Receiving" ? (
                            <PackageOpen className={`h-4 w-4 text-blue-500`} />
                          ) : (
                            <PackageCheck className={`h-4 w-4 text-orange-500`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.type}</span>
                            <span className="text-xs text-muted-foreground">· {item.ref}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{item.cargo}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={statusStyle[item.status] || "bg-secondary"} variant="secondary">
                        {item.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseSchedule;
