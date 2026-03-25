import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/shared/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship, Check, ArrowRight, ArrowLeft, Loader2, Package, MapPin,
  FileText, Upload, Shield, CheckCircle2, Plus, Plane, Truck as TruckIcon,
} from "lucide-react";
import { PortSelector } from "@/components/shipment/PortSelector";
import { HsCodeAutocomplete } from "@/components/shared/HsCodeAutocomplete";

const STEPS = [
  "Shipment Info",
  "Cargo Details",
  "Services Required",
  "Documents",
  "Review & Submit",
];

const NewShipmentWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Basic Shipment Info
  const [shipmentType, setShipmentType] = useState(searchParams.get("type") || "fcl");
  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [tradeLane, setTradeLane] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [incoterms, setIncoterms] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [companyId, setCompanyId] = useState("");

  // Step 2: Cargo Details
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [numPackages, setNumPackages] = useState("");
  const [containerType, setContainerType] = useState(searchParams.get("container") || "40hc");
  const [containerQty, setContainerQty] = useState("1");
  const [dangerousGoods, setDangerousGoods] = useState(false);
  const [hsCode, setHsCode] = useState("");

  // Step 3: Services
  const [needsCustoms, setNeedsCustoms] = useState(false);
  const [needsTrucking, setNeedsTrucking] = useState(false);
  const [needsWarehouse, setNeedsWarehouse] = useState(false);
  const [needsInsurance, setNeedsInsurance] = useState(false);
  const [specialHandling, setSpecialHandling] = useState(false);
  const [specialNotes, setSpecialNotes] = useState("");

  // Step 4: Documents (optional uploads tracked by reference)
  const [invoiceUploaded, setInvoiceUploaded] = useState(false);
  const [packingListUploaded, setPackingListUploaded] = useState(false);

  // Queries
  const { data: companies = [] } = useQuery({
    queryKey: ["wizard-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("user_id", user!.id)
        .order("company_name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ports = [] } = useQuery({
    queryKey: ["ports-wizard"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return !!origin && !!destination && !!shipmentType;
      case 1: return !!commodity || !!weight;
      case 2: return true; // services are optional
      case 3: return true; // documents are optional
      case 4: return true; // review
      default: return true;
    }
  }, [step, origin, destination, shipmentType, commodity, weight]);

  const handleNext = () => {
    if (step === 4) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
    else navigate("/dashboard");
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const mode = shipmentType === "air" ? "air" : "ocean";
      const { data: row, error } = await supabase.from("shipments").insert({
        user_id: user.id,
        shipment_ref: "PENDING",
        shipment_type: "export",
        origin_port: origin || null,
        destination_port: destination || null,
        incoterms: incoterms || null,
        company_id: companyId || null,
        mode,
        status: "draft",
        pickup_location: null,
        delivery_location: null,
        etd: pickupDate || null,
        eta: deliveryDate || null,
      }).select("id, shipment_ref").single();
      if (error) throw error;

      const shipmentId = row.id;

      // Insert cargo
      if (commodity || weight || hsCode) {
        await supabase.from("cargo").insert({
          shipment_id: shipmentId,
          commodity: commodity || null,
          hs_code: hsCode || null,
          num_packages: numPackages ? parseInt(numPackages) : null,
          gross_weight: weight ? parseFloat(weight) : null,
          volume: volume ? parseFloat(volume) : null,
          dangerous_goods: dangerousGoods,
        });
      }

      // Insert container
      if (containerType && (shipmentType === "fcl" || shipmentType === "lcl")) {
        await supabase.from("containers").insert({
          shipment_id: shipmentId,
          container_type: containerType,
          quantity: containerQty ? parseInt(containerQty) : 1,
        });
      }

      // Create document checklist
      const requiredDocs = ["bill_of_lading", "commercial_invoice", "packing_list"];
      if (needsCustoms) requiredDocs.push("customs_declaration", "aes_filing");
      if (needsInsurance) requiredDocs.push("insurance_certificate");
      requiredDocs.push("shipper_letter_of_instruction", "dock_receipt", "certificate_of_origin");

      await supabase.from("documents").insert(
        requiredDocs.map(docType => ({ shipment_id: shipmentId, user_id: user.id, doc_type: docType, status: "pending" }))
      );

      toast({ title: "Shipment request created", description: `${row.shipment_ref} — Pending Pricing` });
      navigate(`/dashboard/shipments/${shipmentId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const shipmentTypes = [
    { value: "fcl", label: "FCL", icon: Ship },
    { value: "lcl", label: "LCL", icon: Package },
    { value: "air", label: "Air", icon: Plane },
    { value: "trucking", label: "Trucking", icon: TruckIcon },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">New Shipment</h1>
              <p className="text-[11px] text-muted-foreground">Create a shipment request and submit for pricing.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
            onClick={() => {
              const params = new URLSearchParams();
              if (origin) params.set("origin", origin);
              if (destination) params.set("destination", destination);
              navigate(`/book${params.toString() ? `?${params}` : ""}`);
            }}
          >
            <Ship className="h-3.5 w-3.5" />
            Search & Book Instantly
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-2 transition-colors ${
                i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] text-center hidden sm:block ${
                i <= step ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>{s}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Basic Shipment Info */}
            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ship className="h-4 w-4 text-accent" />
                    Shipment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Shipment Type */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Shipment Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {shipmentTypes.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setShipmentType(t.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                            shipmentType === t.value
                              ? "border-accent bg-accent/5 text-accent"
                              : "border-border bg-card text-muted-foreground hover:border-accent/30"
                          }`}
                        >
                          <t.icon className="h-5 w-5" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {shipmentType === "air" ? "Origin Airport" : "Origin Port"}
                      </Label>
                      <div className="mt-1">
                        <PortSelector
                          ports={ports}
                          value={origin}
                          onValueChange={setOrigin}
                          placeholder={shipmentType === "air" ? "Select origin airport..." : "Select origin port..."}
                          mode={shipmentType === "air" ? "air" : "ocean"}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {shipmentType === "air" ? "Destination Airport" : "Destination Port"}
                      </Label>
                      <div className="mt-1">
                        <PortSelector
                          ports={ports}
                          value={destination}
                          onValueChange={setDestination}
                          placeholder={shipmentType === "air" ? "Select destination airport..." : "Select destination port..."}
                          mode={shipmentType === "air" ? "air" : "ocean"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Incoterms (optional)</Label>
                      <Select value={incoterms} onValueChange={setIncoterms}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["FOB", "CIF", "EXW", "DAP", "DDP", "FCA", "CFR"].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer</Label>
                      <Select value={companyId} onValueChange={setCompanyId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>
                          {companies.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Pickup Date (optional)</Label>
                      <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery Date (optional)</Label>
                      <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Cargo Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    Cargo Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Commodity</Label>
                      <Input placeholder="e.g. Electronics, Furniture" value={commodity} onChange={(e) => setCommodity(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">HS Code</Label>
                      <div className="mt-1">
                        <HsCodeAutocomplete
                          value={hsCode}
                          commodity={commodity}
                          onChange={setHsCode}
                          placeholder="e.g. 8471.30.01.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                      <Input type="number" placeholder="e.g. 18000" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Volume (CBM)</Label>
                      <Input type="number" placeholder="e.g. 33" value={volume} onChange={(e) => setVolume(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">No. of Packages</Label>
                      <Input type="number" placeholder="e.g. 50" value={numPackages} onChange={(e) => setNumPackages(e.target.value)} className="mt-1" />
                    </div>
                  </div>

                  {(shipmentType === "fcl" || shipmentType === "lcl") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Container Type</Label>
                        <Select value={containerType} onValueChange={setContainerType}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["20gp", "40gp", "40hc", "45hc", "20rf", "40rf", "20ot", "40ot", "20fr", "40fr"].map(t => (
                              <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input type="number" min="1" value={containerQty} onChange={(e) => setContainerQty(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Switch checked={dangerousGoods} onCheckedChange={setDangerousGoods} />
                    <Label className="text-sm">Dangerous Goods (DG/Hazmat)</Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Services Required */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    Services Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Customs Clearance", checked: needsCustoms, onChange: setNeedsCustoms, desc: "Export/import customs filing and clearance" },
                    { label: "Trucking / Drayage", checked: needsTrucking, onChange: setNeedsTrucking, desc: "Pickup or delivery trucking service" },
                    { label: "Warehousing", checked: needsWarehouse, onChange: setNeedsWarehouse, desc: "Storage at origin or destination" },
                    { label: "Cargo Insurance", checked: needsInsurance, onChange: setNeedsInsurance, desc: "Coverage for cargo in transit" },
                    { label: "Special Handling", checked: specialHandling, onChange: setSpecialHandling, desc: "Temperature control, oversized, etc." },
                  ].map((svc) => (
                    <div key={svc.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{svc.label}</p>
                        <p className="text-xs text-muted-foreground">{svc.desc}</p>
                      </div>
                      <Switch checked={svc.checked} onCheckedChange={svc.onChange} />
                    </div>
                  ))}
                  {specialHandling && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Special Handling Notes</Label>
                      <Textarea
                        placeholder="Describe special requirements..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Documents */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Documents (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload supporting documents now or add them later inside the Shipment Workspace.
                  </p>
                  {[
                    { label: "Commercial Invoice", uploaded: invoiceUploaded },
                    { label: "Packing List", uploaded: packingListUploaded },
                  ].map((doc) => (
                    <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{doc.label}</span>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground italic">
                    Full document management is available in the Shipment Workspace after submission.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review & Submit */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Review & Submit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1">{shipmentType.toUpperCase()}</span></div>
                      <div><span className="text-muted-foreground">Route:</span> <span className="font-medium ml-1">{origin} → {destination}</span></div>
                      {incoterms && <div><span className="text-muted-foreground">Incoterms:</span> <span className="font-medium ml-1">{incoterms}</span></div>}
                      {pickupDate && <div><span className="text-muted-foreground">Pickup:</span> <span className="font-medium ml-1">{pickupDate}</span></div>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {commodity && <div><span className="text-muted-foreground">Commodity:</span> <span className="font-medium ml-1">{commodity}</span></div>}
                      {weight && <div><span className="text-muted-foreground">Weight:</span> <span className="font-medium ml-1">{weight} kg</span></div>}
                      {volume && <div><span className="text-muted-foreground">Volume:</span> <span className="font-medium ml-1">{volume} CBM</span></div>}
                      {containerType && <div><span className="text-muted-foreground">Container:</span> <span className="font-medium ml-1">{containerQty}× {containerType.toUpperCase()}</span></div>}
                      {dangerousGoods && <div><Badge variant="destructive" className="text-[10px]">Dangerous Goods</Badge></div>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {needsCustoms && <Badge variant="secondary">Customs Clearance</Badge>}
                      {needsTrucking && <Badge variant="secondary">Trucking</Badge>}
                      {needsWarehouse && <Badge variant="secondary">Warehousing</Badge>}
                      {needsInsurance && <Badge variant="secondary">Insurance</Badge>}
                      {specialHandling && <Badge variant="secondary">Special Handling</Badge>}
                      {!needsCustoms && !needsTrucking && !needsWarehouse && !needsInsurance && !specialHandling && (
                        <span className="text-sm text-muted-foreground">No additional services selected</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
                    <p className="text-sm font-medium text-foreground">After submission:</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your shipment will be created with status <Badge variant="secondary" className="text-[10px] mx-1">Pending Pricing</Badge>
                      and you'll be taken directly to the Shipment Workspace where you can manage pricing, documents, tracking, and more — all in one place.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 mb-12">
          <Button variant="outline" onClick={handlePrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button variant="electric" onClick={handleNext} disabled={!canProceed || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 4 ? "Request Pricing" : "Next"}
            {step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewShipmentWizard;
