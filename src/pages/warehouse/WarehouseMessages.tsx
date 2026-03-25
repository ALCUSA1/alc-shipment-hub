import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const WarehouseMessages = () => (
  <WarehouseLayout>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Messages</h1>
      <p className="text-sm text-muted-foreground">Communication about warehouse operations</p>
    </div>

    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-accent/10 mb-4">
          <MessageSquare className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No messages yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Messages related to your warehouse orders will appear here. You'll be notified when there's a new message.
        </p>
      </CardContent>
    </Card>
  </WarehouseLayout>
);

export default WarehouseMessages;
