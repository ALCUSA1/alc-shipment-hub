import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Account = () => (
  <DashboardLayout>
    <h1 className="text-2xl font-bold text-foreground mb-2">Account</h1>
    <p className="text-sm text-muted-foreground mb-8">Manage your account settings</p>
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Full Name</Label><Input defaultValue="John Smith" className="mt-1" /></div>
          <div><Label>Email</Label><Input defaultValue="john@company.com" className="mt-1" /></div>
          <div><Label>Company</Label><Input defaultValue="ALC Shipping Corp" className="mt-1" /></div>
          <Button variant="electric">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default Account;
