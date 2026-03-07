import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, Loader2, DollarSign, Ship, TrendingUp, Copy, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

type CompanyOption = { id: string; company_name: string; status: string; fmc_license_expiry: string | null; cargo_insurance_expiry: string | null; general_liability_expiry: string | null };

interface CarrierRate {
  id: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string;
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: Json;
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

function getTotalRate(rate: CarrierRate) {
  return rate.base_rate + parseSurchargeTotal(rate.surcharges);
}

const STEPS = ["Route & Customer", "Select Carrier Rate", "Set Your Margin", "Review & Send"];

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" },
  { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" },
];

interface ComplianceIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

function checkCompliance(company: CompanyOption | undefined): ComplianceIssue[] {
  if (!company) return [];
  const issues: ComplianceIssue[] = [];
  const now = new Date();
  const warningDays = 60;

  if (company.status !== "active") {
    issues.push({ field: "Status", message: `Customer status is "${company.status}" — must be "active"`, severity: "error" });
  }

  const checkExpiry = (label: string, dateStr: string | null) => {
    if (!dateStr) return;
    const expiry = new Date(dateStr);
    if (expiry < now) {
      issues.push({ field: label, message: `Expired on ${format(expiry, "MMM d, yyyy")}`, severity: "error" });
    } else if (expiry < addDays(now, warningDays)) {
      issues.push({ field: label, message: `Expires ${format(expiry, "MMM d, yyyy")}`, severity: "warning" });
    }
  };

  checkExpiry("FMC License", company.fmc_license_expiry);
  checkExpiry("Cargo Insurance", company.cargo_insurance_expiry);
  checkExpiry("General Liability", company.general_liability_expiry);

  return issues;
}

const NewQuote = () => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1: Route & Customer
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [containerType, setContainerType] = useState("40hc");
  const [companyId, setCompanyId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [validDays, setValidDays] = useState("7");

  // Step 2: Selected rate
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // Step 3: Margin
  const [marginType, setMarginType] = useState<"flat" | "percent">("flat");
  const [marginValue, setMarginValue] = useState("");

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["quote-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, company_name, status, fmc_license_expiry, cargo_insurance_expiry, general_liability_expiry")
        .eq("user_id", user!.id)
        .order("company_name");
      return (data || []) as CompanyOption[];
    },
    enabled: !!user,
  });

  // Fetch carrier rates for route
  const { data: carrierRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["quote-rates", originPort, destinationPort, containerType],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("carrier_rates")
        .select("*")
        .eq("origin_port", originPort)
        .eq("destination_port", destinationPort)
        .eq("container_type", containerType)
        .gte("valid_until", today)
        .order("base_rate", { ascending: true });
      if (error) throw error;
      return data as CarrierRate[];
    },
    enabled: !!(originPort && destinationPort && containerType && step >= 1),
  });

  const selectedRate = carrierRates.find((r) => r.id === selectedRateId) || null;
  const carrierCost = selectedRate ? getTotalRate(selectedRate) : 0;
  const marginAmount = marginType === "flat"
    ? parseFloat(marginValue) || 0
    : carrierCost * ((parseFloat(marginValue) || 0) / 100);
  const customerPrice = carrierCost + marginAmount;

  const selectedCompany = companies.find((c) => c.id === companyId);
  const complianceIssues = checkCompliance(selectedCompany);
  const hasBlockingIssues = complianceIssues.some((i) => i.severity === "error");

  // Auto-fill customer name from selected company
  useEffect(() => {
    if (selectedCompany && !customerName) {
      setCustomerName(selectedCompany.company_name);
    }
  }, [selectedCompany]);

  const handleSubmit = async () => {
    if (!user || !selectedRate) return;
    setSubmitting(true);

    try {
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          shipment_id: null as any, // Will be linked when converted
          status: "pending",
          carrier_rate_id: selectedRate.id,
          carrier_cost: carrierCost,
          margin_type: marginType,
          margin_value: parseFloat(marginValue) || 0,
          customer_price: customerPrice,
          amount: customerPrice,
          currency: selectedRate.currency,
          origin_port: originPort,
          destination_port: destinationPort,
          container_type: containerType,
          carrier: selectedRate.carrier,
          transit_days: selectedRate.transit_days,
          valid_until: format(addDays(new Date(), parseInt(validDays) || 7), "yyyy-MM-dd"),
          customer_email: customerEmail || null,
          customer_name: customerName || null,
          company_id: companyId && companyId !== "none" ? companyId : null,
        })
        .select("id, approval_token")
        .single();

      if (error) throw error;

      toast({
        title: "Quote Created",
        description: `Quote for $${customerPrice.toLocaleString()} sent. Margin: $${marginAmount.toLocaleString()}.`,
      });

      navigate("/dashboard/quotes");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return originPort && destinationPort && containerType;
    if (step === 1) return !!selectedRateId;
    if (step === 2) return parseFloat(marginValue) >= 0;
    return true;
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Create Quote</h1>
        <p className="text-sm text-muted-foreground mb-8">Build a customer quote with carrier rates and your margin.</p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((title, i) => (
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
            <CardTitle>{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Origin Port Code</Label>
                    <Input placeholder="e.g. CNSHA" className="mt-1" value={originPort}
                      onChange={(e) => setOriginPort(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <Label>Destination Port Code</Label>
                    <Input placeholder="e.g. USLAX" className="mt-1" value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Container Type</Label>
                    <Select value={containerType} onValueChange={setContainerType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTAINER_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quote Valid For (days)</Label>
                    <Input type="number" className="mt-1" value={validDays}
                      onChange={(e) => setValidDays(e.target.value)} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer (CRM)</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Walk-in —</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Customer Email (optional)</Label>
                    <Input placeholder="customer@company.com" className="mt-1" value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <Input placeholder="Company or contact name" className="mt-1" value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)} />
                </div>

                {/* Compliance Gate */}
                {selectedCompany && complianceIssues.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      ⚠️ Compliance Issues
                    </h4>
                    {complianceIssues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant={issue.severity === "error" ? "destructive" : "secondary"} className="text-[10px]">
                          {issue.severity === "error" ? "BLOCK" : "WARN"}
                        </Badge>
                        <span className="font-medium text-foreground">{issue.field}:</span>
                        <span className="text-muted-foreground">{issue.message}</span>
                      </div>
                    ))}
                    {hasBlockingIssues && (
                      <p className="text-xs text-destructive font-medium mt-2">
                        Resolve blocking issues before proceeding. Update the customer's compliance data in CRM.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                {ratesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-secondary animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : carrierRates.length === 0 ? (
                  <div className="text-center py-8">
                    <Ship className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No carrier rates found for {originPort} → {destinationPort}.</p>
                    <p className="text-xs text-muted-foreground mt-1">Check port codes or add rates in Rate Trends.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carrierRates.map((rate) => {
                      const total = getTotalRate(rate);
                      const isSelected = selectedRateId === rate.id;
                      return (
                        <div
                          key={rate.id}
                          onClick={() => setSelectedRateId(rate.id)}
                          className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-accent bg-accent" : "border-muted-foreground/30"
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-foreground">{rate.carrier}</span>
                                {rate.transit_days && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {rate.transit_days} days transit
                                  </span>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Valid until {format(new Date(rate.valid_until), "MMM d, yyyy")}
                                </p>
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
            )}

            {step === 2 && selectedRate && (
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
                  <p className="text-[10px] text-muted-foreground">
                    The customer will only see the all-in price of ${customerPrice.toLocaleString()}.
                    Your margin of ${marginAmount.toLocaleString()} ({((marginAmount / carrierCost) * 100).toFixed(1)}%) stays private.
                  </p>
                </div>
              </>
            )}

            {step === 3 && selectedRate && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Quote Summary</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route</span>
                      <span className="text-foreground font-medium">{originPort} → {destinationPort}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Container</span>
                      <span className="text-foreground font-medium">{containerType.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carrier</span>
                      <span className="text-foreground font-medium">{selectedRate.carrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transit</span>
                      <span className="text-foreground font-medium">{selectedRate.transit_days || "—"} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="text-foreground font-medium">{customerName || "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Until</span>
                      <span className="text-foreground font-medium">
                        {format(addDays(new Date(), parseInt(validDays) || 7), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-foreground">Customer Price</span>
                    <span className="font-mono text-foreground">${customerPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Your margin</span>
                    <span className="text-green-600 font-medium">+${marginAmount.toLocaleString()} ({((marginAmount / carrierCost) * 100).toFixed(1)}%)</span>
                  </div>
                </div>

                {hasBlockingIssues && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ This customer has compliance issues that must be resolved before converting to a shipment.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate("/dashboard/quotes")} >
            <ArrowLeft className="mr-2 h-4 w-4" /> {step === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button variant="electric" onClick={next}
            disabled={!canProceed() || submitting || (step === 0 && hasBlockingIssues)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 3 ? "Create Quote" : "Next"}
            {step < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewQuote;
