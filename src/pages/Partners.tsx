import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Truck, Ship, Warehouse, Shield } from "lucide-react";

const partners = [
  { name: "Global Freight Co.", type: "Freight Forwarder", icon: Ship, shipments: 8 },
  { name: "QuickHaul Transport", type: "Trucking Company", icon: Truck, shipments: 12 },
  { name: "Pacific Warehousing", type: "Warehouse", icon: Warehouse, shipments: 5 },
  { name: "ClearPort Customs", type: "Customs Broker", icon: Shield, shipments: 6 },
  { name: "Asian Shipping Lines", type: "Shipping Line", icon: Building2, shipments: 10 },
];

const Partners = () => (
  <DashboardLayout>
    <h1 className="text-2xl font-bold text-foreground mb-2">Partners</h1>
    <p className="text-sm text-muted-foreground mb-8">Your logistics network</p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {partners.map((p, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <p.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.type}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{p.shipments} active shipments</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </DashboardLayout>
);

export default Partners;
