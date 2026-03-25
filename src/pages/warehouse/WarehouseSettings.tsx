import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const WarehouseSettings = () => (
  <WarehouseLayout>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">Configure your warehouse portal preferences</p>
    </div>

    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New inbound orders</p>
              <p className="text-xs text-muted-foreground">Get notified when cargo is scheduled for receiving</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Release approvals</p>
              <p className="text-xs text-muted-foreground">Alerts when a release order is approved</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Document reminders</p>
              <p className="text-xs text-muted-foreground">Reminders for pending document uploads</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility Details</CardTitle>
          <CardDescription>Update your warehouse information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Operating Hours</Label>
            <Input placeholder="e.g., Mon-Fri 7:00 AM – 5:00 PM" className="mt-1.5" />
          </div>
          <div>
            <Label>Capabilities</Label>
            <Input placeholder="e.g., Cold Storage, Hazmat, Cross-dock" className="mt-1.5" />
          </div>
          <Button variant="electric" size="sm">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  </WarehouseLayout>
);

export default WarehouseSettings;
