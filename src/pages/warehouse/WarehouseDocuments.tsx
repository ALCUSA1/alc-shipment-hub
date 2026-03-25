import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Eye } from "lucide-react";

const demoDocuments = [
  { id: "1", name: "Receiving Confirmation — WH-2026-001", type: "receiving", status: "uploaded", date: "Mar 24, 2026", ref: "SHP-2026-015" },
  { id: "2", name: "Release Order — WH-2026-002", type: "release", status: "uploaded", date: "Mar 23, 2026", ref: "SHP-2026-012" },
  { id: "3", name: "Handling Report — WH-2026-003", type: "handling", status: "pending", date: "Mar 25, 2026", ref: "SHP-2026-018" },
  { id: "4", name: "Cargo Release Confirmation — WH-2026-004", type: "release_confirmation", status: "pending", date: "Mar 26, 2026", ref: "SHP-2026-020" },
];

const statusStyle: Record<string, string> = {
  uploaded: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const WarehouseDocuments = () => (
  <WarehouseLayout>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">Manage receiving confirmations, release orders, and warehouse docs</p>
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
                <p className="text-xs text-muted-foreground">{doc.ref} · {doc.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusStyle[doc.status] || "bg-secondary"} variant="secondary">{doc.status}</Badge>
              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </WarehouseLayout>
);

export default WarehouseDocuments;
