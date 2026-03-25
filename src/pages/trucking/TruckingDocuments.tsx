import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Eye } from "lucide-react";

const demoDocuments = [
  { id: "1", name: "POD — TRK-2026-001", type: "pod", status: "uploaded", date: "Mar 24, 2026", shipmentRef: "SHP-2026-015" },
  { id: "2", name: "Delivery Receipt — TRK-2026-002", type: "delivery_receipt", status: "uploaded", date: "Mar 23, 2026", shipmentRef: "SHP-2026-012" },
  { id: "3", name: "Pickup Confirmation — TRK-2026-003", type: "pickup_confirmation", status: "pending", date: "Mar 25, 2026", shipmentRef: "SHP-2026-018" },
  { id: "4", name: "BOL — TRK-2026-004", type: "bol", status: "pending", date: "Mar 26, 2026", shipmentRef: "SHP-2026-020" },
];

const statusStyle: Record<string, string> = {
  uploaded: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-destructive/10 text-destructive",
};

const TruckingDocuments = () => (
  <TruckingLayout>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">Manage PODs, delivery receipts, and trucking documents</p>
      </div>
      <Button variant="electric">
        <Upload className="h-4 w-4 mr-2" /> Upload Document
      </Button>
    </div>

    <div className="space-y-3">
      {demoDocuments.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.shipmentRef} · {doc.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusStyle[doc.status] || "bg-secondary"} variant="secondary">
                {doc.status}
              </Badge>
              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </TruckingLayout>
);

export default TruckingDocuments;
