import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stepTitles = ["Shipment Overview", "Cargo Details", "Container Details", "Parties", "Quote Request"];

const NewShipment = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = () => step < 4 ? setStep(step + 1) : navigate("/dashboard/shipments");
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
                <div>
                  <Label>Shipment Type</Label>
                  <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent><SelectItem value="fcl">FCL</SelectItem><SelectItem value="lcl">LCL</SelectItem><SelectItem value="air">Air Freight</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Origin Port</Label><Input placeholder="e.g. Shanghai" className="mt-1" /></div>
                  <div><Label>Destination Port</Label><Input placeholder="e.g. Los Angeles" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Pickup Location</Label><Input placeholder="Full address" className="mt-1" /></div>
                  <div><Label>Delivery Location</Label><Input placeholder="Full address" className="mt-1" /></div>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div><Label>Commodity Description</Label><Input placeholder="e.g. Consumer Electronics" className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>HS Code</Label><Input placeholder="e.g. 8471.30" className="mt-1" /></div>
                  <div><Label>Number of Packages</Label><Input type="number" placeholder="e.g. 150" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Package Type</Label>
                    <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="carton">Carton</SelectItem><SelectItem value="pallet">Pallet</SelectItem><SelectItem value="crate">Crate</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Gross Weight (kg)</Label><Input type="number" placeholder="e.g. 5000" className="mt-1" /></div>
                  <div><Label>Volume (CBM)</Label><Input type="number" placeholder="e.g. 25" className="mt-1" /></div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Container Type</Label>
                    <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent><SelectItem value="20gp">20' GP</SelectItem><SelectItem value="40gp">40' GP</SelectItem><SelectItem value="40hc">40' HC</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Container Quantity</Label><Input type="number" placeholder="e.g. 2" className="mt-1" /></div>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Shipper</Label><Input placeholder="Company name" className="mt-1" /></div>
                  <div><Label>Consignee</Label><Input placeholder="Company name" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Notify Party</Label><Input placeholder="Company name" className="mt-1" /></div>
                  <div><Label>Forwarder</Label><Input placeholder="Company name" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Trucking Company</Label><Input placeholder="Company name" className="mt-1" /></div>
                  <div><Label>Warehouse</Label><Input placeholder="Warehouse name" className="mt-1" /></div>
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
          <Button variant="electric" onClick={next}>
            {step === 4 ? "Submit Shipment" : "Next"}
            {step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewShipment;
