import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WizardShell } from "@/components/wizard/WizardShell";
import { OverviewStep, type OverviewData } from "@/components/wizard/steps/OverviewStep";
import { PartiesStep, type PartiesData, emptyParty } from "@/components/wizard/steps/PartiesStep";
import { CargoStep, type CargoData } from "@/components/wizard/steps/CargoStep";
import { ComplianceStep, type ComplianceData } from "@/components/wizard/steps/ComplianceStep";
import { ReviewStep } from "@/components/wizard/steps/ReviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, Ship, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

type CompanyOption = { id: string; company_name: string; status: string; fmc_license_expiry: string | null; cargo_insurance_expiry: string | null; general_liability_expiry: string | null };

interface CarrierRate {
  id: string; carrier: string; origin_port: string; destination_port: string;
  container_type: string; base_rate: number; currency: string; transit_days: number | null;
  valid_from: string; valid_until: string; surcharges: Json;
}

function parseSurchargeTotal(surcharges: Json): number {
  if (!Array.isArray(surcharges)) return 0;
  let total = 0;
  for (const s of surcharges) {
    if (typeof s === "object" && s !== null && "amount" in s) {
      total += Number((s as Record<string, unknown>).amount) || 0;
    }
  }
  return total;
}

function getTotalRate(rate: CarrierRate) { return rate.base_rate + parseSurchargeTotal(rate.surcharges); }

interface ComplianceIssue { field: string; message: string; severity: "error" | "warning"; }

function checkCompliance(company: CompanyOption | undefined): ComplianceIssue[] {
  if (!company) return [];
  const issues: ComplianceIssue[] = [];
  const now = new Date();
  if (company.status !== "active") {
    issues.push({ field: "Status", message: `Customer status is "${company.status}" — must be "active"`, severity: "error" });
  }
  const check = (label: string, d: string | null) => {
    if (!d) return;
    const exp = new Date(d);
    if (exp < now) issues.push({ field: label, message: `Expired on ${format(exp, "MMM d, yyyy")}`, severity: "error" });
    else if (exp < addDays(now, 60)) issues.push({ field: label, message: `Expires ${format(exp, "MMM d, yyyy")}`, severity: "warning" });
  };
  check("FMC License", company.fmc_license_expiry);
  check("Cargo Insurance", company.cargo_insurance_expiry);
  check("General Liability", company.general_liability_expiry);
  return issues;
}

const STEPS = ["Overview", "Trade Parties", "Cargo & Container", "Compliance", "Select Rate", "Set Margin", "Review & Send"];

const NewQuote = () => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Shared data steps
  const [overview, setOverview] = useState<OverviewData>({
    shipmentType: "export", originPort: "", destinationPort: "", pickupLocation: "", deliveryLocation: "", companyId: "", incoterms: "",
  });
  const [partiesData, setPartiesData] = useState<PartiesData>({
    shipper: emptyParty(), consignee: emptyParty(), notifyParty: emptyParty(),
    notifyPartySameAsConsignee: false, truckingCompany: "", pickupWarehouse: emptyParty(),
  });
  const [cargoData, setCargoData] = useState<CargoData>({
    commodity: "", hsCode: "", numPackages: "", packageType: "", grossWeight: "", volume: "",
    unitValue: "", totalValue: "", countryOfOrigin: "", containerType: "40hc", containerQuantity: "1",
  });
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    exporterEin: "", exporterName: "", aesType: "", exportLicense: "",
    insuranceProvider: "", insurancePolicy: "", insuranceCoverage: "",
  });

  // Quote-specific
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [marginType, setMarginType] = useState<"flat" | "percent">("flat");
  const [marginValue, setMarginValue] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [customerEmail, setCustomerEmail] = useState("");

  // Queries
  const { data: companies = [] } = useQuery({
    queryKey: ["quote-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("companies")
        .select("id, company_name, status, fmc_license_expiry, cargo_insurance_expiry, general_liability_expiry")
        .eq("user_id", user!.id).order("company_name");
      return (data || []) as CompanyOption[];
    },
    enabled: !!user,
  });

  const { data: ports = [] } = useQuery({
    queryKey: ["ports-list"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: carrierRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["quote-rates", overview.originPort, overview.destinationPort, cargoData.containerType],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("carrier_rates").select("*")
        .ilike("origin_port", overview.originPort)
        .ilike("destination_port", overview.destinationPort)
        .ilike("container_type", cargoData.containerType)
        .gte("valid_until", today).order("base_rate", { ascending: true });
      if (error) throw error;
      return data as CarrierRate[];
    },
    enabled: !!(overview.originPort && overview.destinationPort && cargoData.containerType),
  });

  const selectedRate = carrierRates.find((r) => r.id === selectedRateId) || null;
  const carrierCost = selectedRate ? getTotalRate(selectedRate) : 0;
  const marginAmount = marginType === "flat" ? parseFloat(marginValue) || 0 : carrierCost * ((parseFloat(marginValue) || 0) / 100);
  const customerPrice = carrierCost + marginAmount;

  const selectedCompany = companies.find((c) => c.id === overview.companyId);
  const complianceIssues = checkCompliance(selectedCompany);
  const hasBlockingIssues = complianceIssues.some((i) => i.severity === "error");

  const handleSubmit = async () => {
    if (!user || !selectedRate) return;
    setSubmitting(true);
    try {
      const customerName = partiesData.shipper.companyName || selectedCompany?.company_name || "";

      // Create shipment
      const { data: shipment, error: shipErr } = await supabase.from("shipments").insert({
        user_id: user.id, shipment_ref: "PENDING", shipment_type: overview.shipmentType || "export",
        origin_port: overview.originPort, destination_port: overview.destinationPort,
        pickup_location: overview.pickupLocation || null, delivery_location: overview.deliveryLocation || null,
        company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
        incoterms: overview.incoterms || null, status: "draft",
      }).select("id").single();
      if (shipErr) throw shipErr;

      // Create quote
      const { data: quote, error: quoteErr } = await supabase.from("quotes").insert({
        user_id: user.id, shipment_id: shipment.id,
        carrier_rate_id: selectedRate.id, carrier_cost: carrierCost,
        margin_type: marginType, margin_value: parseFloat(marginValue) || 0,
        customer_price: customerPrice, amount: customerPrice,
        currency: selectedRate.currency, origin_port: overview.originPort,
        destination_port: overview.destinationPort, container_type: cargoData.containerType,
        carrier: selectedRate.carrier, transit_days: selectedRate.transit_days,
        valid_until: format(addDays(new Date(), parseInt(validDays) || 7), "yyyy-MM-dd"),
        customer_email: customerEmail || partiesData.consignee.email || null,
        customer_name: customerName || null,
        company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
        status: "pending",
      }).select("id").single();
      if (quoteErr) throw quoteErr;

      // Create cargo
      if (cargoData.commodity || cargoData.hsCode) {
        await supabase.from("cargo").insert({
          shipment_id: shipment.id, commodity: cargoData.commodity || null,
          hs_code: cargoData.hsCode || null, num_packages: cargoData.numPackages ? parseInt(cargoData.numPackages) : null,
          package_type: cargoData.packageType || null, gross_weight: cargoData.grossWeight ? parseFloat(cargoData.grossWeight) : null,
          volume: cargoData.volume ? parseFloat(cargoData.volume) : null,
          unit_value: cargoData.unitValue ? parseFloat(cargoData.unitValue) : null,
          total_value: cargoData.totalValue ? parseFloat(cargoData.totalValue) : null,
          country_of_origin: cargoData.countryOfOrigin || null,
        });
      }

      // Create container
      if (cargoData.containerType) {
        await supabase.from("containers").insert({
          shipment_id: shipment.id, container_type: cargoData.containerType,
          quantity: cargoData.containerQuantity ? parseInt(cargoData.containerQuantity) : 1,
        });
      }

      // Create parties
      const partyEntries: { role: string; company_name: string; contact_name: string | null; address: string | null; email: string | null; phone: string | null; shipment_id: string }[] = [];
      const coreParties: { data: typeof partiesData.shipper; role: string }[] = [
        { data: partiesData.shipper, role: "shipper" },
        { data: partiesData.consignee, role: "consignee" },
        { data: partiesData.notifyPartySameAsConsignee ? partiesData.consignee : partiesData.notifyParty, role: "notify_party" },
        { data: partiesData.pickupWarehouse, role: "warehouse" },
      ];
      for (const { data: p, role } of coreParties) {
        if (p.companyName) {
          partyEntries.push({ role, company_name: p.companyName, contact_name: p.contactName || null,
            address: p.address || null, email: p.email || null, phone: p.phone || null, shipment_id: shipment.id });
        }
      }
      if (partiesData.truckingCompany) {
        partyEntries.push({ role: "trucking", company_name: partiesData.truckingCompany, contact_name: null,
          address: null, email: null, phone: null, shipment_id: shipment.id });
      }
      if (partyEntries.length > 0) await supabase.from("shipment_parties").insert(partyEntries);

      // Customs filing
      if (complianceData.exporterName || complianceData.exporterEin) {
        await supabase.from("customs_filings").insert({
          shipment_id: shipment.id, user_id: user.id,
          exporter_name: complianceData.exporterName || null, exporter_ein: complianceData.exporterEin || null,
          aes_citation: complianceData.aesType || null, consignee_name: partiesData.consignee.companyName || null,
          consignee_address: partiesData.consignee.address || null,
          port_of_export: overview.originPort || null, port_of_unlading: overview.destinationPort || null,
        });
      }

      // Document checklist
      const requiredDocs = [
        "bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction",
        "dock_receipt", "certificate_of_origin", "insurance_certificate", "aes_filing",
      ];
      await supabase.from("documents").insert(
        requiredDocs.map((docType) => ({ shipment_id: shipment.id, user_id: user.id, doc_type: docType, status: "pending" }))
      );

      toast({ title: "Quote Created", description: `Quote for $${customerPrice.toLocaleString()} created with full trade documentation.` });
      navigate("/dashboard/quotes");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAndPayLater = async () => {
    if (!user || !selectedRate) return;
    setSubmitting(true);
    try {
      const customerName = partiesData.shipper.companyName || selectedCompany?.company_name || "";

      const { data: shipment, error: shipErr } = await supabase.from("shipments").insert({
        user_id: user.id, shipment_ref: "PENDING", shipment_type: overview.shipmentType || "export",
        origin_port: overview.originPort, destination_port: overview.destinationPort,
        pickup_location: overview.pickupLocation || null, delivery_location: overview.deliveryLocation || null,
        company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
        incoterms: overview.incoterms || null, status: "booked",
      }).select("id").single();
      if (shipErr) throw shipErr;

      const { data: quote, error: quoteErr } = await supabase.from("quotes").insert({
        user_id: user.id, shipment_id: shipment.id,
        carrier_rate_id: selectedRate.id, carrier_cost: carrierCost,
        margin_type: marginType, margin_value: parseFloat(marginValue) || 0,
        customer_price: customerPrice, amount: customerPrice,
        currency: selectedRate.currency, origin_port: overview.originPort,
        destination_port: overview.destinationPort, container_type: cargoData.containerType,
        carrier: selectedRate.carrier, transit_days: selectedRate.transit_days,
        valid_until: format(addDays(new Date(), parseInt(validDays) || 7), "yyyy-MM-dd"),
        customer_email: customerEmail || partiesData.consignee.email || null,
        customer_name: customerName || null,
        company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
        status: "booked", payment_status: "unpaid",
      } as any).select("id").single();
      if (quoteErr) throw quoteErr;

      await supabase.from("shipments").update({ converted_from_quote_id: quote.id }).eq("id", shipment.id);

      // Container, cargo, parties, customs, docs, financials
      if (cargoData.containerType) {
        await supabase.from("containers").insert({ shipment_id: shipment.id, container_type: cargoData.containerType, quantity: cargoData.containerQuantity ? parseInt(cargoData.containerQuantity) : 1 });
      }
      if (cargoData.commodity || cargoData.hsCode) {
        await supabase.from("cargo").insert({
          shipment_id: shipment.id, commodity: cargoData.commodity || null, hs_code: cargoData.hsCode || null,
          num_packages: cargoData.numPackages ? parseInt(cargoData.numPackages) : null,
          package_type: cargoData.packageType || null, gross_weight: cargoData.grossWeight ? parseFloat(cargoData.grossWeight) : null,
          volume: cargoData.volume ? parseFloat(cargoData.volume) : null,
          unit_value: cargoData.unitValue ? parseFloat(cargoData.unitValue) : null,
          total_value: cargoData.totalValue ? parseFloat(cargoData.totalValue) : null,
          country_of_origin: cargoData.countryOfOrigin || null,
        });
      }

      const partyEntries2: { role: string; company_name: string; contact_name: string | null; address: string | null; email: string | null; phone: string | null; shipment_id: string }[] = [];
      const coreParties2: { data: typeof partiesData.shipper; role: string }[] = [
        { data: partiesData.shipper, role: "shipper" },
        { data: partiesData.consignee, role: "consignee" },
        { data: partiesData.notifyPartySameAsConsignee ? partiesData.consignee : partiesData.notifyParty, role: "notify_party" },
        { data: partiesData.pickupWarehouse, role: "warehouse" },
      ];
      for (const { data: p, role } of coreParties2) {
        if (p.companyName) {
          partyEntries2.push({ role, company_name: p.companyName, contact_name: p.contactName || null,
            address: p.address || null, email: p.email || null, phone: p.phone || null, shipment_id: shipment.id });
        }
      }
      if (partiesData.truckingCompany) {
        partyEntries2.push({ role: "trucking", company_name: partiesData.truckingCompany, contact_name: null,
          address: null, email: null, phone: null, shipment_id: shipment.id });
      }
      if (partyEntries2.length > 0) await supabase.from("shipment_parties").insert(partyEntries2);

      if (complianceData.exporterName || complianceData.exporterEin) {
        await supabase.from("customs_filings").insert({
          shipment_id: shipment.id, user_id: user.id,
          exporter_name: complianceData.exporterName || null, exporter_ein: complianceData.exporterEin || null,
          aes_citation: complianceData.aesType || null, consignee_name: partiesData.consignee.companyName || null,
          consignee_address: partiesData.consignee.address || null,
          port_of_export: overview.originPort || null, port_of_unlading: overview.destinationPort || null,
        });
      }

      if (customerPrice) {
        await supabase.from("shipment_financials").insert({
          shipment_id: shipment.id, user_id: user.id, description: `Freight revenue — ${selectedRate.carrier}`,
          entry_type: "revenue", category: "freight", amount: customerPrice, vendor: customerName || null,
        });
      }
      if (carrierCost) {
        await supabase.from("shipment_financials").insert({
          shipment_id: shipment.id, user_id: user.id, description: `Carrier cost — ${selectedRate.carrier}`,
          entry_type: "cost", category: "freight", amount: carrierCost, vendor: selectedRate.carrier || null,
        });
      }

      const requiredDocs = [
        "bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction",
        "dock_receipt", "certificate_of_origin", "insurance_certificate", "aes_filing",
      ];
      await supabase.from("documents").insert(
        requiredDocs.map((d) => ({ shipment_id: shipment.id, user_id: user.id, doc_type: d, status: "pending" }))
      );

      toast({ title: "Booking Created", description: `Shipment booked for $${customerPrice.toLocaleString()} with full documentation.` });
      navigate(`/dashboard/shipments/${shipment.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!(overview.originPort && overview.destinationPort);
    if (step === 4) return !!selectedRateId;
    if (step === 5) return parseFloat(marginValue) >= 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <>
          <OverviewStep data={overview} onChange={setOverview} ports={ports} companies={companies} />
          {/* Quote-specific fields */}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quote Valid For (days)</Label>
              <Input type="number" className="mt-1" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
            </div>
            <div>
              <Label>Customer Email (optional)</Label>
              <Input placeholder="customer@company.com" className="mt-1" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
          </div>
          {selectedCompany && complianceIssues.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-destructive">⚠️ Compliance Issues</h4>
              {complianceIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Badge variant={issue.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">
                    {issue.severity === "error" ? "BLOCK" : "WARN"}
                  </Badge>
                  <span className="font-medium text-foreground">{issue.field}:</span>
                  <span className="text-muted-foreground">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </>
      );
      case 1: return <PartiesStep data={partiesData} onChange={setPartiesData} />;
      case 2: return <CargoStep data={cargoData} onChange={setCargoData} />;
      case 3: return <ComplianceStep data={complianceData} onChange={setComplianceData} />;
      case 4: return (
        <>
          {ratesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary animate-pulse rounded-lg" />)}
            </div>
          ) : carrierRates.length === 0 ? (
            <div className="text-center py-8">
              <Ship className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No carrier rates found for {overview.originPort} → {overview.destinationPort}.</p>
              <p className="text-xs text-muted-foreground mt-1">Check port codes or add rates in Rate Trends.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrierRates.map((rate) => {
                const total = getTotalRate(rate);
                const isSelected = selectedRateId === rate.id;
                return (
                  <div key={rate.id} onClick={() => setSelectedRateId(rate.id)}
                    className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-accent bg-accent" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-foreground">{rate.carrier}</span>
                          {rate.transit_days && <span className="text-xs text-muted-foreground ml-2">{rate.transit_days} days transit</span>}
                          <p className="text-xs text-muted-foreground">Valid until {format(new Date(rate.valid_until), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">${total.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Your cost (all-in)</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
      case 5: return selectedRate ? (
        <>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Carrier Cost ({selectedRate.carrier})</span>
              <span className="font-mono font-semibold text-foreground">${carrierCost.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Margin Type</Label>
              <Select value={marginType} onValueChange={(v) => setMarginType(v as "flat" | "percent")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{marginType === "flat" ? "Markup Amount ($)" : "Markup Percentage (%)"}</Label>
              <Input type="number" className="mt-1" placeholder={marginType === "flat" ? "e.g. 500" : "e.g. 15"}
                value={marginValue} onChange={(e) => setMarginValue(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="rounded-lg border-2 border-accent bg-accent/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Cost</span>
              <span className="font-mono text-foreground">${carrierCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Margin</span>
              <span className="font-mono text-green-600">+${marginAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground">Customer Price</span>
              <span className="font-mono text-foreground">${customerPrice.toLocaleString()}</span>
            </div>
          </div>
        </>
      ) : null;
      case 6: return (
        <div className="space-y-4">
          <ReviewStep overview={overview} parties={partiesData} cargo={cargoData} compliance={complianceData} companies={companies} />
          {selectedRate && (
            <div className="rounded-lg border-2 border-accent bg-accent/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Pricing</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Carrier ({selectedRate.carrier})</span>
                <span className="font-mono text-foreground">${carrierCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-mono text-green-600">+${marginAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">Customer Price</span>
                <span className="font-mono text-foreground">${customerPrice.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <WizardShell
        title="Create Quote"
        subtitle="Build a comprehensive quote with full trade details, carrier rates, and your margin."
        steps={STEPS}
        currentStep={step}
        onNext={() => step < 6 ? setStep(step + 1) : handleSubmit()}
        onPrev={() => setStep(step - 1)}
        onCancel={() => navigate("/dashboard/quotes")}
        canProceed={canProceed() && !(step === 0 && hasBlockingIssues)}
        submitting={submitting}
        isLastStep={step === 6}
        submitLabel="Create Quote"
        extraButtons={step === 6 ? (
          <Button variant="outline" onClick={handleBookAndPayLater} disabled={submitting || hasBlockingIssues}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Ship className="mr-2 h-4 w-4" />
            Book & Pay Later
          </Button>
        ) : undefined}
      >
        {renderStep()}
      </WizardShell>
    </DashboardLayout>
  );
};

export default NewQuote;
