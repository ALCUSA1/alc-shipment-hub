import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type CompanyOption = { id: string; company_name: string };

const stepTitles = ["Shipment Overview", "Cargo Details", "Container Details", "Parties", "Quote Request"];

interface ShipmentData {
  shipmentType: string;
  originPort: string;
  destinationPort: string;
  pickupLocation: string;
  deliveryLocation: string;
  companyId: string;
}

interface CargoData {
  commodity: string;
  hsCode: string;
  numPackages: string;
  packageType: string;
  grossWeight: string;
  volume: string;
}

interface ContainerData {
  containerType: string;
  quantity: string;
}

interface PartiesData {
  shipper: string;
  consignee: string;
  notifyParty: string;
  forwarder: string;
  truckingCompany: string;
  warehouse: string;
}

const NewShipment = () => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [crmCompanies, setCrmCompanies] = useState<CompanyOption[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("companies").select("id, company_name").eq("user_id", user.id).order("company_name").then(({ data }) => {
      setCrmCompanies(data || []);
    });
  }, [user]);

  const [shipment, setShipment] = useState<ShipmentData>({
    shipmentType: "", originPort: "", destinationPort: "", pickupLocation: "", deliveryLocation: "", companyId: "",
  });
  const [cargo, setCargo] = useState<CargoData>({
    commodity: "", hsCode: "", numPackages: "", packageType: "", grossWeight: "", volume: "",
  });
  const [container, setContainer] = useState<ContainerData>({ containerType: "", quantity: "" });
  const [parties, setParties] = useState<PartiesData>({
    shipper: "", consignee: "", notifyParty: "", forwarder: "", truckingCompany: "", warehouse: "",
  });

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Create shipment
      const { data: shipmentRow, error: shipErr } = await supabase
        .from("shipments")
        .insert({
          user_id: user.id,
          shipment_ref: "PENDING", // trigger will overwrite
          shipment_type: shipment.shipmentType || "export",
          origin_port: shipment.originPort || null,
          destination_port: shipment.destinationPort || null,
          pickup_location: shipment.pickupLocation || null,
          delivery_location: shipment.deliveryLocation || null,
          company_id: shipment.companyId && shipment.companyId !== "none" ? shipment.companyId : null,
        })
        .select("id")
        .single();

      if (shipErr) throw shipErr;
      const shipmentId = shipmentRow.id;

      // 2. Create cargo (if any data provided)
      if (cargo.commodity || cargo.hsCode || cargo.numPackages) {
        const { error: cargoErr } = await supabase.from("cargo").insert({
          shipment_id: shipmentId,
          commodity: cargo.commodity || null,
          hs_code: cargo.hsCode || null,
          num_packages: cargo.numPackages ? parseInt(cargo.numPackages) : null,
          package_type: cargo.packageType || null,
          gross_weight: cargo.grossWeight ? parseFloat(cargo.grossWeight) : null,
          volume: cargo.volume ? parseFloat(cargo.volume) : null,
        });
        if (cargoErr) throw cargoErr;
      }

      // 3. Create container (if type selected)
      if (container.containerType) {
        const { error: contErr } = await supabase.from("containers").insert({
          shipment_id: shipmentId,
          container_type: container.containerType,
          quantity: container.quantity ? parseInt(container.quantity) : 1,
        });
        if (contErr) throw contErr;
      }

      // 4. Create parties
      const partyEntries: { role: string; company_name: string }[] = [];
      if (parties.shipper) partyEntries.push({ role: "shipper", company_name: parties.shipper });
      if (parties.consignee) partyEntries.push({ role: "consignee", company_name: parties.consignee });
      if (parties.notifyParty) partyEntries.push({ role: "notify_party", company_name: parties.notifyParty });
      if (parties.forwarder) partyEntries.push({ role: "forwarder", company_name: parties.forwarder });
      if (parties.truckingCompany) partyEntries.push({ role: "trucking", company_name: parties.truckingCompany });
      if (parties.warehouse) partyEntries.push({ role: "warehouse", company_name: parties.warehouse });

      if (partyEntries.length > 0) {
        const { error: partyErr } = await supabase.from("shipment_parties").insert(
          partyEntries.map((p) => ({ ...p, shipment_id: shipmentId }))
        );
        if (partyErr) throw partyErr;
      }

      // 5. Create a pending quote request
      const { error: quoteErr } = await supabase.from("quotes").insert({
        shipment_id: shipmentId,
        user_id: user.id,
        status: "pending",
      });
      if (quoteErr) throw quoteErr;

      toast({ title: "Shipment created", description: "Your shipment and quote request have been submitted." });
      navigate(`/dashboard/shipments/${shipmentId}`);
    } catch (err: any) {
      toast({ title: "Error creating shipment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };
  const prev = () => step > 0 && setStep(step - 1);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Create New Shipment</h1>
        <p className="text-sm text-muted-foreground mb-8">Complete the steps below to create your shipment.</p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-2 transition-colors ${
                i < step ? "bg-accent text-accent-foreground" :
                i === step ? "bg-accent text-accent-foreground" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs text-center hidden sm:block ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {title}
              </span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{stepTitles[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Shipment Type</Label>
                    <Select value={shipment.shipmentType} onValueChange={(v) => setShipment({ ...shipment, shipmentType: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="import">Import</SelectItem>
                        <SelectItem value="cross_trade">Cross Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Customer (CRM)</Label>
                    <Select value={shipment.companyId} onValueChange={(v) => setShipment({ ...shipment, companyId: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {crmCompanies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Origin Port</Label><Input placeholder="e.g. Shanghai" className="mt-1" value={shipment.originPort} onChange={(e) => setShipment({ ...shipment, originPort: e.target.value })} /></div>
                  <div><Label>Destination Port</Label><Input placeholder="e.g. Los Angeles" className="mt-1" value={shipment.destinationPort} onChange={(e) => setShipment({ ...shipment, destinationPort: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Pickup Location</Label><Input placeholder="Full address" className="mt-1" value={shipment.pickupLocation} onChange={(e) => setShipment({ ...shipment, pickupLocation: e.target.value })} /></div>
                  <div><Label>Delivery Location</Label><Input placeholder="Full address" className="mt-1" value={shipment.deliveryLocation} onChange={(e) => setShipment({ ...shipment, deliveryLocation: e.target.value })} /></div>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div><Label>Commodity Description</Label><Input placeholder="e.g. Consumer Electronics" className="mt-1" value={cargo.commodity} onChange={(e) => setCargo({ ...cargo, commodity: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>HS Code</Label><Input placeholder="e.g. 8471.30" className="mt-1" value={cargo.hsCode} onChange={(e) => setCargo({ ...cargo, hsCode: e.target.value })} /></div>
                  <div><Label>Number of Packages</Label><Input type="number" placeholder="e.g. 150" className="mt-1" value={cargo.numPackages} onChange={(e) => setCargo({ ...cargo, numPackages: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Package Type</Label>
                    <Select value={cargo.packageType} onValueChange={(v) => setCargo({ ...cargo, packageType: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="carton">Carton</SelectItem><SelectItem value="pallet">Pallet</SelectItem><SelectItem value="crate">Crate</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Gross Weight (kg)</Label><Input type="number" placeholder="e.g. 5000" className="mt-1" value={cargo.grossWeight} onChange={(e) => setCargo({ ...cargo, grossWeight: e.target.value })} /></div>
                  <div><Label>Volume (CBM)</Label><Input type="number" placeholder="e.g. 25" className="mt-1" value={cargo.volume} onChange={(e) => setCargo({ ...cargo, volume: e.target.value })} /></div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Container Type</Label>
                    <Select value={container.containerType} onValueChange={(v) => setContainer({ ...container, containerType: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent><SelectItem value="20gp">20' GP</SelectItem><SelectItem value="40gp">40' GP</SelectItem><SelectItem value="40hc">40' HC</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Container Quantity</Label><Input type="number" placeholder="e.g. 2" className="mt-1" value={container.quantity} onChange={(e) => setContainer({ ...container, quantity: e.target.value })} /></div>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Shipper</Label><Input placeholder="Company name" className="mt-1" value={parties.shipper} onChange={(e) => setParties({ ...parties, shipper: e.target.value })} /></div>
                  <div><Label>Consignee</Label><Input placeholder="Company name" className="mt-1" value={parties.consignee} onChange={(e) => setParties({ ...parties, consignee: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Notify Party</Label><Input placeholder="Company name" className="mt-1" value={parties.notifyParty} onChange={(e) => setParties({ ...parties, notifyParty: e.target.value })} /></div>
                  <div><Label>Forwarder</Label><Input placeholder="Company name" className="mt-1" value={parties.forwarder} onChange={(e) => setParties({ ...parties, forwarder: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Trucking Company</Label><Input placeholder="Company name" className="mt-1" value={parties.truckingCompany} onChange={(e) => setParties({ ...parties, truckingCompany: e.target.value })} /></div>
                  <div><Label>Warehouse</Label><Input placeholder="Warehouse name" className="mt-1" value={parties.warehouse} onChange={(e) => setParties({ ...parties, warehouse: e.target.value })} /></div>
                </div>
              </>
            )}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready to submit</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Review your shipment details and submit a quote request. Documents will be generated automatically once the shipment is approved.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button variant="electric" onClick={next} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 4 ? "Submit Shipment" : "Next"}
            {step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewShipment;
