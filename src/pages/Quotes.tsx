import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

const quotes = [
  { id: "QT-001", shipment: "SHP-2024-001", forwarder: "Global Freight Co.", amount: "$4,250", status: "Pending" },
  { id: "QT-002", shipment: "SHP-2024-002", forwarder: "Ocean Express", amount: "$3,800", status: "Accepted" },
  { id: "QT-003", shipment: "SHP-2024-003", forwarder: "Swift Logistics", amount: "$5,100", status: "Pending" },
];

const statusColor: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Accepted: "bg-green-100 text-green-700",
  Declined: "bg-destructive/10 text-destructive",
};

const Quotes = () => (
  <DashboardLayout>
    <h1 className="text-2xl font-bold text-foreground mb-2">Quotes</h1>
    <p className="text-sm text-muted-foreground mb-8">Manage freight quote requests</p>
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left font-medium text-muted-foreground p-4">Quote ID</th>
            <th className="text-left font-medium text-muted-foreground p-4">Shipment</th>
            <th className="text-left font-medium text-muted-foreground p-4">Forwarder</th>
            <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
            <th className="text-left font-medium text-muted-foreground p-4">Status</th>
          </tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/50">
                <td className="p-4 font-mono font-medium">{q.id}</td>
                <td className="p-4 text-muted-foreground">{q.shipment}</td>
                <td className="p-4 text-muted-foreground">{q.forwarder}</td>
                <td className="p-4 font-medium">{q.amount}</td>
                <td className="p-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[q.status]}`}>{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </DashboardLayout>
);

export default Quotes;
