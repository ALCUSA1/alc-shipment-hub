import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Truck } from "lucide-react";
import { format, addDays } from "date-fns";

const demoSchedule = [
  { id: "1", type: "Pickup", location: "Port Newark, NJ", time: "08:00 AM", date: new Date(), status: "confirmed", ref: "TRK-2026-001", driver: "Mike R." },
  { id: "2", type: "Delivery", location: "Edison, NJ", time: "11:30 AM", date: new Date(), status: "in_transit", ref: "TRK-2026-002", driver: "Mike R." },
  { id: "3", type: "Pickup", location: "Port Elizabeth, NJ", time: "09:00 AM", date: addDays(new Date(), 1), status: "scheduled", ref: "TRK-2026-003", driver: "James K." },
  { id: "4", type: "Delivery", location: "Brooklyn, NY", time: "02:00 PM", date: addDays(new Date(), 1), status: "scheduled", ref: "TRK-2026-004", driver: "James K." },
  { id: "5", type: "Pickup", location: "JFK Airport, NY", time: "07:00 AM", date: addDays(new Date(), 2), status: "scheduled", ref: "TRK-2026-005", driver: "Unassigned" },
];

const statusStyle: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  completed: "bg-accent/10 text-accent",
};

const TruckingSchedule = () => {
  const grouped = demoSchedule.reduce<Record<string, typeof demoSchedule>>((acc, item) => {
    const key = format(item.date, "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming pickups and deliveries</p>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([dateKey, items]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{format(new Date(dateKey), "EEEE, MMM d, yyyy")}</h2>
              <Badge variant="secondary" className="text-xs">{items.length} jobs</Badge>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${item.type === "Pickup" ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                          <Truck className={`h-4 w-4 ${item.type === "Pickup" ? "text-blue-500" : "text-green-500"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.type}</span>
                            <span className="text-xs text-muted-foreground">· {item.ref}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{item.driver}</span>
                        <Badge className={statusStyle[item.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TruckingLayout>
  );
};

export default TruckingSchedule;
