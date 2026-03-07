import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const docs = [
  { name: "Bill of Lading", shipment: "SHP-2024-001", date: "Mar 5, 2026", type: "B/L" },
  { name: "Commercial Invoice", shipment: "SHP-2024-001", date: "Mar 5, 2026", type: "Invoice" },
  { name: "Packing List", shipment: "SHP-2024-001", date: "Mar 5, 2026", type: "Packing" },
  { name: "Shipping Instructions", shipment: "SHP-2024-002", date: "Mar 4, 2026", type: "SI" },
  { name: "Delivery Order", shipment: "SHP-2024-004", date: "Mar 1, 2026", type: "DO" },
];

const Documents = () => (
  <DashboardLayout>
    <h1 className="text-2xl font-bold text-foreground mb-2">Documents</h1>
    <p className="text-sm text-muted-foreground mb-8">Auto-generated shipping documents</p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {docs.map((d, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">{d.type}</span>
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1">{d.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{d.shipment} · {d.date}</p>
            <Button variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-3 w-3" /> Download
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </DashboardLayout>
);

export default Documents;
