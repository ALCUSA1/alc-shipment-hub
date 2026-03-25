import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users } from "lucide-react";

const demoTeam = [
  { id: "1", name: "Mike Rodriguez", role: "Driver", status: "active", email: "mike@example.com" },
  { id: "2", name: "James Kim", role: "Driver", status: "active", email: "james@example.com" },
  { id: "3", name: "Sarah Chen", role: "Dispatcher", status: "active", email: "sarah@example.com" },
  { id: "4", name: "Tom Wilson", role: "Viewer", status: "invited", email: "tom@example.com" },
];

const roleStyle: Record<string, string> = {
  Owner: "bg-accent/10 text-accent",
  Dispatcher: "bg-blue-100 text-blue-700",
  Driver: "bg-green-100 text-green-700",
  Viewer: "bg-secondary text-muted-foreground",
};

const TruckingTeam = () => (
  <TruckingLayout>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground">Manage your trucking team members and roles</p>
      </div>
      <Button variant="electric">
        <UserPlus className="h-4 w-4 mr-2" /> Invite Member
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Team Members ({demoTeam.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {demoTeam.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={roleStyle[member.role] || "bg-secondary"} variant="secondary">{member.role}</Badge>
                {member.status === "invited" && (
                  <Badge variant="outline" className="text-xs">Invited</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </TruckingLayout>
);

export default TruckingTeam;
