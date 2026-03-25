import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const TruckingSettings = () => (
  <TruckingLayout>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">Configure your trucking portal preferences</p>
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
              <p className="text-sm font-medium text-foreground">New order assignments</p>
              <p className="text-xs text-muted-foreground">Get notified when a new order is assigned</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Schedule changes</p>
              <p className="text-xs text-muted-foreground">Alerts when pickup/delivery times change</p>
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
          <CardTitle className="text-base">Service Area</CardTitle>
          <CardDescription>Define your operating regions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Primary Service Area</Label>
            <Input placeholder="e.g., NY/NJ Metropolitan Area" className="mt-1.5" />
          </div>
          <div>
            <Label>Equipment Types</Label>
            <Input placeholder="e.g., 53ft Dry Van, Flatbed, Chassis" className="mt-1.5" />
          </div>
          <Button variant="electric" size="sm">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  </TruckingLayout>
);

export default TruckingSettings;
