import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingCreateForm } from "@/components/booking/BookingCreateForm";
import { BookingDetailPanel } from "@/components/booking/BookingDetailPanel";
import { Anchor, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING_UPDATE: "bg-yellow-100 text-yellow-800",
  PENDING_AMENDMENT: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function DcsaBookings() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["dcsa-bookings-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, carrier_booking_request_reference, carrier_booking_number, booking_status, booking_status_internal, vessel_name, carrier_export_voyage_number, expected_departure_date, created_at, updated_datetime")
        .not("dcsa_version", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  if (selectedBookingId) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" onClick={() => setSelectedBookingId(null)}>← Back to Bookings</Button>
          <BookingDetailPanel bookingId={selectedBookingId} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Anchor className="h-6 w-6 text-primary" />
              DCSA Bookings
            </h1>
            <p className="text-muted-foreground text-sm">Manage carrier booking requests via DCSA Booking API</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Booking
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading bookings...</p>
        ) : !bookings?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No DCSA bookings yet. Create your first booking request.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {bookings.map((bk) => (
              <Card key={bk.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBookingId(bk.id)}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {bk.carrier_booking_number || bk.carrier_booking_request_reference || bk.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bk.vessel_name && `${bk.vessel_name} `}
                      {bk.carrier_export_voyage_number && `· Voy ${bk.carrier_export_voyage_number} `}
                      {bk.expected_departure_date && `· ETD ${bk.expected_departure_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[bk.booking_status] || "bg-muted text-muted-foreground"}>
                      {bk.booking_status || "N/A"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(bk.created_at), "PP")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create DCSA Booking</DialogTitle>
            </DialogHeader>
            <BookingCreateForm onSuccess={(id) => { setShowCreate(false); setSelectedBookingId(id); refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
