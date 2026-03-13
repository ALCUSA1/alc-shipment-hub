import { useState } from "react";
import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Users, Mail, Building, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  invited: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-secondary text-muted-foreground",
};

const ForwarderCustomers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["forwarder-customers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forwarder_customers")
        .select("*")
        .eq("forwarder_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("forwarder_customers").insert({
        forwarder_user_id: user!.id,
        customer_name: customerName,
        customer_email: customerEmail,
        company_name: companyName || null,
        status: "invited",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwarder-customers"] });
      toast({ title: "Customer invited", description: `Invitation sent to ${customerEmail}` });
      setDialogOpen(false);
      setCustomerName("");
      setCustomerEmail("");
      setCompanyName("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" });
    },
  });

  return (
    <ForwarderLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your shipper customers and portal access
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="electric">
              <Plus className="h-4 w-4 mr-2" />
              Invite Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Customer</DialogTitle>
              <DialogDescription>
                Send a portal invitation to a shipper customer. They'll receive access to submit shipment requests through your branded portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Contact Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="electric"
                disabled={!customerName || !customerEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : customers && customers.length > 0 ? (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.customer_name}</TableCell>
                    <TableCell>{c.company_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.customer_email}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status] || "bg-secondary"} variant="secondary">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.invited_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No customers yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Invite your shipper customers to start receiving structured requests
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ForwarderLayout>
  );
};

export default ForwarderCustomers;
