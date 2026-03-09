import { useState } from "react";
import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, Calendar, DollarSign, Truck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { AssignDriverDialog } from "@/components/trucking/AssignDriverDialog";

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const TruckingQuotes = () => {
  const { user } = useAuth();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["my-trucking-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucking_quotes")
        .select(`
          *,
          shipments:shipment_id (shipment_ref, origin_port, destination_port, pickup_location, delivery_location)
        `)
        .eq("trucker_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Quotes</h1>
        <p className="text-sm text-muted-foreground">Track your submitted quotes and their status</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Quote History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : quotes?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No quotes submitted yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browse{" "}
                <Link to="/trucking/orders" className="text-accent hover:underline">
                  available orders
                </Link>{" "}
                to submit your first quote.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes?.map((quote) => (
                <Link
                  key={quote.id}
                  to={`/trucking/orders/${quote.shipment_id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {(quote.shipments as any)?.shipment_ref || "N/A"}
                      </span>
                      <Badge className={statusStyles[quote.status] || "bg-secondary"} variant="secondary">
                        {quote.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {(quote.shipments as any)?.pickup_location ||
                          (quote.shipments as any)?.origin_port ||
                          "TBD"}{" "}
                        →{" "}
                        {(quote.shipments as any)?.delivery_location ||
                          (quote.shipments as any)?.destination_port ||
                          "TBD"}
                      </span>
                      {quote.pickup_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(quote.pickup_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {quote.equipment_type && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {quote.equipment_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {Number(quote.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(quote.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TruckingLayout>
  );
};

export default TruckingQuotes;
