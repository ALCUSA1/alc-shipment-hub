import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WizardShell } from "@/components/wizard/WizardShell";
import { OverviewStep, type OverviewData } from "@/components/wizard/steps/OverviewStep";
import { CargoStep, type CargoData } from "@/components/wizard/steps/CargoStep";
import { ComplianceStep, type ComplianceData, type AutoFillSource, EMPTY_COMPLIANCE } from "@/components/wizard/steps/ComplianceStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BackButton } from "@/components/shared/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Ship, Check, Clock, ChevronDown, ChevronUp, FileText,
  CheckCircle2, Bookmark, ArrowRight, Loader2, Package,
  MapPin, AlertCircle, Shield, AlertTriangle, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";
import {
  overviewSchema, cargoSchema, complianceSchema,
  validateStep, checkComplianceGating,
  type ValidationErrors, type GatingIssue, type CompanyCredentials,
} from "@/lib/wizard-validation";

/* ── Wizard Steps ── */
const STEPS = ["Route & Basics", "Cargo", "Select Rate", "Customs & Compliance", "Review & Confirm", "Booking Created"];

/* ── Rate helpers ── */
interface Surcharge { code: string; description: string; amount: number; }
interface CarrierRate {
  id: string; carrier: string; origin_port: string; destination_port: string;
  container_type: string; base_rate: number; currency: string;
  transit_days: number | null; valid_from: string; valid_until: string;
  surcharges: Json; notes: string | null;
}

function parseSurcharges(surcharges: Json): Surcharge[] {
  if (!Array.isArray(surcharges)) return [];
  return surcharges
    .filter((s) => typeof s === "object" && s !== null && "code" in s && "amount" in s)
    .map((s) => {
      const obj = s as Record<string, Json>;
      return { code: String(obj.code ?? ""), description: String(obj.description ?? ""), amount: Number(obj.amount ?? 0) };
    });
}
function getTotalRate(rate: CarrierRate) {
  return rate.base_rate + parseSurcharges(rate.surcharges).reduce((sum, s) => sum + s.amount, 0);
}

/* ── Review Row ── */
function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

/* ── Main Component ── */
const NewShipmentWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from rate search URL params
  const prefillOrigin = searchParams.get("origin") || "";
  const prefillDest = searchParams.get("destination") || "";

  // Step 1: Overview
  const [overview, setOverview] = useState<OverviewData>({
    shipmentType: "export",
    originPort: prefillOrigin,
    destinationPort: prefillDest,
    pickupLocation: "",
    deliveryLocation: "",
    companyId: "",
    incoterms: "",
  });

  // Step 2: Cargo
  const [cargo, setCargo] = useState<CargoData>({
    commodity: "", hsCode: "", numPackages: "", packageType: "",
    grossWeight: "", volume: "", unitValue: "", totalValue: "",
    countryOfOrigin: "", containerType: "40hc", containerQuantity: "1",
  });

  // Step 3: Compliance
  const [compliance, setCompliance] = useState<ComplianceData>({
    ...EMPTY_COMPLIANCE,
  });

  // Step 4: Rate selection
  const [selectedRate, setSelectedRate] = useState<CarrierRate | null>(null);
  const [expandedRateId, setExpandedRateId] = useState<string | null>(null);

  // Queries
  const { data: ports = [] } = useQuery({
    queryKey: ["ports"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["wizard-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, company_name, ein, address, city, state, zip, country, email, phone, company_contact_name, cargo_insurance_provider, cargo_insurance_policy")
        .eq("user_id", user!.id)
        .order("company_name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["wizard-rates", overview.originPort, overview.destinationPort, cargo.containerType],
    queryFn: async () => {
      let query = supabase.from("carrier_rates").select("*").order("base_rate");
      if (overview.originPort) query = query.eq("origin_port", overview.originPort);
      if (overview.destinationPort) query = query.eq("destination_port", overview.destinationPort);
      if (cargo.containerType) query = query.eq("container_type", cargo.containerType);
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("valid_until", today);
      const { data } = await query;
      return (data as CarrierRate[]) || [];
    },
    enabled: !!(overview.originPort && overview.destinationPort) && step >= 2,
  });

  const bestRateId = rates.length > 0
    ? rates.reduce((best, r) => getTotalRate(r) < getTotalRate(best) ? r : best, rates[0]).id
    : null;

  // Step validation
  const canProceed = (() => {
    if (step === 0) return !!(overview.originPort && overview.destinationPort);
    if (step === 1) return !!(cargo.containerType);
    if (step === 2) return !!selectedRate; // Select Rate
    if (step === 3) return true; // Compliance is optional but encouraged
    if (step === 4) return true;
    return false;
  })();

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    if (step === 4) handleSubmit();
  };
  const handlePrev = () => { if (step > 0) setStep(step - 1); };

  // Save as quote — create draft shipment first (quotes require shipment_id)
  const handleSaveAsQuote = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Create draft shipment as anchor for the quote
      const { data: shipRow, error: shipErr } = await supabase.from("shipments").insert({
        user_id: user.id,
        shipment_ref: "PENDING",
        shipment_type: overview.shipmentType || "export",
        origin_port: overview.originPort || null,
        destination_port: overview.destinationPort || null,
        incoterms: overview.incoterms || null,
        company_id: overview.companyId || null,
        status: "draft",
      }).select("id").single();
      if (shipErr) throw shipErr;

      const { error } = await supabase.from("quotes").insert({
        shipment_id: shipRow.id,
        user_id: user.id,
        origin_port: overview.originPort || null,
        destination_port: overview.destinationPort || null,
        container_type: cargo.containerType || null,
        company_id: overview.companyId || null,
        status: "pending",
        amount: selectedRate ? getTotalRate(selectedRate) : null,
        carrier: selectedRate?.carrier || null,
      });
      if (error) throw error;
      toast({ title: "Quote saved", description: "Redirecting to Quotes page for margin & approval." });
      navigate("/dashboard/quotes");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Book shipment
  const handleSubmit = async () => {
    if (!user || !selectedRate) return;
    setSubmitting(true);
    try {
      const { data: row, error } = await supabase.from("shipments").insert({
        user_id: user.id,
        shipment_ref: "PENDING",
        shipment_type: overview.shipmentType || "export",
        origin_port: overview.originPort || null,
        destination_port: overview.destinationPort || null,
        place_of_receipt: overview.pickupLocation || null,
        place_of_delivery: overview.deliveryLocation || null,
        incoterms: overview.incoterms || null,
        company_id: overview.companyId || null,
        carrier: selectedRate.carrier || null,
        status: "booked",
      }).select("id, shipment_ref").single();
      if (error) throw error;
      const shipmentId = row.id;

      // Insert cargo
      if (cargo.commodity || cargo.hsCode) {
        await supabase.from("cargo").insert({
          shipment_id: shipmentId,
          commodity: cargo.commodity || null,
          hs_code: cargo.hsCode || null,
          num_packages: cargo.numPackages ? parseInt(cargo.numPackages) : null,
          package_type: cargo.packageType || null,
          gross_weight: cargo.grossWeight ? parseFloat(cargo.grossWeight) : null,
          volume: cargo.volume ? parseFloat(cargo.volume) : null,
          country_of_origin: cargo.countryOfOrigin || null,
          total_value: cargo.totalValue ? parseFloat(cargo.totalValue) : null,
          unit_value: cargo.unitValue ? parseFloat(cargo.unitValue) : null,
        });
      }

      // Insert container
      if (cargo.containerType) {
        await supabase.from("containers").insert({
          shipment_id: shipmentId,
          container_type: cargo.containerType,
          quantity: cargo.containerQuantity ? parseInt(cargo.containerQuantity) : 1,
        });
      }

      // Insert documents
      const requiredDocs = ["bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction", "dock_receipt", "certificate_of_origin", "insurance_certificate", "aes_filing"];
      await supabase.from("documents").insert(
        requiredDocs.map(docType => ({ shipment_id: shipmentId, user_id: user.id, doc_type: docType, status: "pending" }))
      );

      // Insert customs filing if compliance data provided
      if (compliance.exporterName || compliance.exporterEin || compliance.eeiExemptionCitation) {
        await supabase.from("customs_filings").insert({
          shipment_id: shipmentId,
          user_id: user.id,
          exporter_name: compliance.exporterName || null,
          exporter_ein: compliance.exporterEin || null,
          aes_citation: compliance.eeiExemptionCitation || null,
          consignee_name: compliance.consigneeName || null,
          consignee_address: compliance.consigneeAddress || null,
          port_of_export: compliance.portOfExport || overview.originPort || null,
          port_of_unlading: compliance.portOfUnlading || overview.destinationPort || null,
          country_of_destination: compliance.countryOfDestination || null,
          mode_of_transport: compliance.methodOfTransportation || null,
          status: "draft",
        });
      }

      // Submit compliance review for admin approval
      if (compliance.exporterName || compliance.exporterEin || compliance.eeiExemptionCitation || compliance.insuranceProvider) {
        await supabase.from("compliance_reviews").insert({
          shipment_id: shipmentId,
          user_id: user.id,
          exporter_name: compliance.exporterName || null,
          exporter_ein: compliance.exporterEin || null,
          aes_type: compliance.eeiExemptionCitation || null,
          export_license: compliance.eeiExemptionCitation || null,
          insurance_provider: compliance.insuranceProvider || null,
          insurance_policy: compliance.insurancePolicy || null,
          insurance_coverage: compliance.insuranceCoverage || null,
          status: "pending_review",
        });
      }

      toast({ title: "Shipment booked!", description: `${row.shipment_ref} created with ${selectedRate.carrier}.` });
      setStep(5); // Go to success step
    } catch (err: any) {
      toast({ title: "Error creating shipment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Get the created shipment ID for the success screen
  const getLatestShipmentLink = () => {
    // We'll use a simple approach - navigate to shipments list
    return "/dashboard/shipments";
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-1">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">New Shipment</h1>
            <p className="text-[11px] text-muted-foreground">Book a shipment or save as a quote.</p>
          </div>
        </div>

        {/* Stepper */}
        {step < 5 && (
          <div className="flex items-center gap-1 mb-8">
            {STEPS.slice(0, 5).map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-2 transition-colors ${
                  i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs text-center hidden sm:block ${
                  i <= step ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 0: Route & Basics ── */}
        {step === 0 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <OverviewStep data={overview} onChange={setOverview} ports={ports} companies={companies} />
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Cargo ── */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <CargoStep data={cargo} onChange={setCargo} />
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Select Rate ── */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Ship className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-foreground">Available Rates</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {overview.originPort} → {overview.destinationPort} · {cargo.containerType?.toUpperCase()} × {cargo.containerQuantity || 1}
              </p>

              {ratesLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading rates…
                </div>
              ) : rates.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No rates found for this route & container type.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">You can still proceed — rate details can be added later in the workspace.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rates.map((rate) => {
                    const surcharges = parseSurcharges(rate.surcharges);
                    const totalRate = getTotalRate(rate);
                    const isSelected = selectedRate?.id === rate.id;
                    const isBest = rate.id === bestRateId;
                    const isExpanded = expandedRateId === rate.id;

                    return (
                      <div
                        key={rate.id}
                        className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                          isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                        }`}
                        onClick={() => setSelectedRate(rate)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                              isSelected ? "border-accent bg-accent" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{rate.carrier}</span>
                                {isBest && <Badge variant="default" className="text-[10px] bg-accent text-accent-foreground">Best Rate</Badge>}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                {rate.transit_days && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {rate.transit_days} days
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Valid until {format(new Date(rate.valid_until), "MMM d")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">${totalRate.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{rate.currency} all-in</p>
                          </div>
                        </div>

                        {surcharges.length > 0 && (
                          <div className="mt-2">
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => { e.stopPropagation(); setExpandedRateId(isExpanded ? null : rate.id); }}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              Rate breakdown
                            </button>
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Base rate</span>
                                  <span className="font-mono text-foreground">${rate.base_rate.toLocaleString()}</span>
                                </div>
                                {surcharges.map((s, i) => (
                                  <div key={i} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{s.code} — {s.description}</span>
                                    <span className="font-mono text-foreground">${s.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                                <Separator className="my-1" />
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-foreground">Total</span>
                                  <span className="font-mono text-foreground">${totalRate.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Customs & Compliance ── */}
        {step === 3 && (() => {
          const selectedCompany = companies.find((c: any) => c.id === overview.companyId);
          const autoFill: AutoFillSource = {
            originPort: overview.originPort,
            destinationPort: overview.destinationPort,
            carrier: selectedRate?.carrier,
            containerType: cargo.containerType,
            shipmentType: overview.shipmentType,
            companyName: selectedCompany?.company_name,
            companyEin: selectedCompany?.ein,
            companyAddress: selectedCompany ? [selectedCompany.address, selectedCompany.city, selectedCompany.state, selectedCompany.zip, selectedCompany.country].filter(Boolean).join(", ") : undefined,
            companyContactName: selectedCompany?.company_contact_name,
            companyPhone: selectedCompany?.phone,
            companyEmail: selectedCompany?.email,
            insuranceProvider: selectedCompany?.cargo_insurance_provider,
            insurancePolicy: selectedCompany?.cargo_insurance_policy,
          };
          return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <ComplianceStep data={compliance} onChange={setCompliance} autoFillSource={autoFill} />
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                <p className="text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 inline mr-1 text-accent" />
                  Compliance details will be sent to our team for validation. You can proceed with your booking — we'll review in the background and notify you of any issues.
                </p>
              </div>
            </CardContent>
          </Card>
          );
        })()}

        {/* ── Step 4: Review & Confirm ── */}
        {step === 4 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" /> Route
                </h4>
                <Row label="Type" value={overview.shipmentType} />
                <Row label="Route" value={`${overview.originPort} → ${overview.destinationPort}`} />
                <Row label="Incoterms" value={overview.incoterms} />
                <Row label="Pickup" value={overview.pickupLocation} />
                <Row label="Delivery" value={overview.deliveryLocation} />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" /> Cargo
                </h4>
                <Row label="Container" value={cargo.containerType ? `${cargo.containerType.toUpperCase()} × ${cargo.containerQuantity || 1}` : undefined} />
                <Row label="Commodity" value={cargo.commodity} />
                <Row label="HS Code" value={cargo.hsCode} />
                <Row label="Weight" value={cargo.grossWeight ? `${cargo.grossWeight} kg` : undefined} />
                <Row label="Volume" value={cargo.volume ? `${cargo.volume} CBM` : undefined} />
                <Row label="Value" value={cargo.totalValue ? `$${Number(cargo.totalValue).toLocaleString()}` : undefined} />
              </div>

              {(compliance.exporterName || compliance.eeiExemptionCitation || compliance.insuranceProvider) && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" /> Customs & Compliance
                  </h4>
                  <Row label="Exporter (USPPI)" value={compliance.exporterName} />
                  <Row label="EIN" value={compliance.exporterEin} />
                  <Row label="Consignee" value={compliance.consigneeName} />
                  <Row label="Port of Export" value={compliance.portOfExport} />
                  <Row label="Port of Unlading" value={compliance.portOfUnlading} />
                  <Row label="Method of Transport" value={compliance.methodOfTransportation} />
                  <Row label="Exporting Carrier" value={compliance.exportingCarrier} />
                  <Row label="EEI Citation" value={compliance.eeiExemptionCitation} />
                  <Row label="Insurance" value={compliance.insuranceProvider} />
                  <Row label="Policy #" value={compliance.insurancePolicy} />
                  <Row label="Coverage" value={compliance.insuranceCoverage ? `$${Number(compliance.insuranceCoverage).toLocaleString()}` : undefined} />
                </div>
              )}

              {selectedRate && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Ship className="h-4 w-4 text-accent" /> Selected Rate
                  </h4>
                  <Row label="Carrier" value={selectedRate.carrier} />
                  <Row label="Transit" value={selectedRate.transit_days ? `${selectedRate.transit_days} days` : undefined} />
                  <Row label="Total Cost" value={`$${getTotalRate(selectedRate).toLocaleString()} ${selectedRate.currency}`} />
                </div>
              )}

              <Separator />

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-accent" />
                  <h4 className="text-sm font-semibold text-foreground">Documents to Generate</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Bill of Lading", "Commercial Invoice", "Packing List", "Certificate of Origin",
                    "Shipper's Letter of Instruction", "Dock Receipt", "Insurance Certificate", "AES Filing"].map((doc) => (
                    <div key={doc} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                      <span className="text-foreground">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Success ── */}
        {step === 5 && (
          <Card className="border-accent/20">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Shipment Booked!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your shipment with <strong>{selectedRate?.carrier}</strong> has been created. 
                Head to the workspace to upload documents, assign trucking, and track progress.
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate("/dashboard/shipments")}>
                  View All Shipments
                </Button>
                <Button variant="electric" onClick={() => {
                  navigate("/dashboard/shipments");
                }}>
                  Open Workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Navigation Buttons ── */}
        {step < 5 && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={step === 0 ? () => navigate(-1) : handlePrev}>
              {step === 0 ? "Cancel" : "Previous"}
            </Button>
            <div className="flex gap-2">
              {/* Save as Quote fork at step 2 (rate selection) */}
              {step === 2 && selectedRate && (
                <Button variant="outline" onClick={handleSaveAsQuote} disabled={submitting}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save as Quote
                </Button>
              )}
              {step === 2 && rates.length === 0 && (
                <Button variant="outline" onClick={() => setStep(step + 1)}>
                  Skip — Add Rate Later
                </Button>
              )}
              <Button
                variant="electric"
                onClick={handleNext}
                disabled={(!canProceed && !(step === 2 && rates.length === 0)) || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 4 ? "Confirm Booking" : "Next"}
                {step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NewShipmentWizard;
