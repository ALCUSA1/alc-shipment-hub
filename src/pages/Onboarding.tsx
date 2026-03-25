import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelector } from "@/components/shared/CountrySelector";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Building2, Package, Truck, Loader2, ArrowRight, SkipForward, Warehouse, Ship, Info } from "lucide-react";
import alcLogo from "@/assets/alc-logo.png";
import { cn } from "@/lib/utils";

type OrgType = "shipper" | "freight_forwarder" | "trucking_provider" | "warehouse_provider";

const ORG_TYPES = [
  {
    value: "shipper" as OrgType,
    label: "Importer / Exporter",
    description: "I need logistics services to move my goods",
    icon: Package,
    companyType: "customer",
    route: "/dashboard",
    roleBanner: "You will create and manage shipments, track cargo, and handle documents and financials end-to-end.",
  },
  {
    value: "freight_forwarder" as OrgType,
    label: "Freight Forwarder",
    description: "I manage freight forwarding operations",
    icon: Ship,
    companyType: "forwarder",
    route: "/forwarder",
    roleBanner: "You will coordinate shipments across carriers, manage pricing and customer quotes, and oversee logistics execution.",
  },
  {
    value: "trucking_provider" as OrgType,
    label: "Trucking Provider",
    description: "I provide pickup, delivery, and drayage services",
    icon: Truck,
    companyType: "trucking_company",
    route: "/trucking",
    roleBanner: "You will receive pickup and delivery orders tied to shipments, manage drivers, update status, and upload proof of delivery.",
  },
  {
    value: "warehouse_provider" as OrgType,
    label: "Warehouse Provider",
    description: "I operate warehouses and handle cargo storage",
    icon: Warehouse,
    companyType: "warehouse",
    route: "/warehouse",
    roleBanner: "You will receive inbound and outbound cargo orders and coordinate with trucking providers for pickup and delivery.",
  },
];

const EQUIPMENT_OPTIONS = ["Container Chassis", "Dry Van (53')", "Flatbed", "Reefer", "Tanker", "Box Truck"];
const WAREHOUSE_SERVICES = ["General Storage", "Cross-Dock", "Container Devanning", "Pick & Pack", "Temperature-Controlled", "Hazmat Handling"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("US");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [orgType, setOrgType] = useState<OrgType | "">("");
  const [saving, setSaving] = useState(false);

  // Trucking-specific
  const [serviceAreas, setServiceAreas] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState("");

  // Warehouse-specific
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [warehouseHours, setWarehouseHours] = useState("");

  const canSubmit = companyName.trim() && orgType;
  const selectedOrg = ORG_TYPES.find((t) => t.value === orgType);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit || !selectedOrg) return;
    setSaving(true);

    const { error } = await supabase.from("companies").insert({
      user_id: user.id,
      company_name: companyName.trim(),
      country,
      ein: registrationNumber.trim() || null,
      company_type: selectedOrg.companyType,
      service_area: orgType === "trucking_provider" ? serviceAreas || null : null,
      notes: orgType === "trucking_provider"
        ? `Equipment: ${selectedEquipment.join(", ") || "N/A"}. Hours: ${operatingHours || "N/A"}`
        : orgType === "warehouse_provider"
        ? `Services: ${selectedServices.join(", ") || "N/A"}. Hours: ${warehouseHours || "N/A"}`
        : null,
      address: orgType === "warehouse_provider" ? warehouseLocation || null : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    await supabase.from("profiles").update({ company_name: companyName.trim() }).eq("user_id", user.id);
    localStorage.setItem(`onboarding_complete_${user.id}`, "true");

    toast({ title: "Organization created", description: "Welcome aboard! Redirecting to your portal." });
    setSaving(false);
    navigate(selectedOrg.route);
  };

  const handleSkip = () => {
    if (user) localStorage.setItem(`onboarding_skipped_${user.id}`, "true");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={alcLogo} alt="ALC Logo" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Set up your organization</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell us about your company to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Details</CardTitle>
            <CardDescription>This helps us tailor the platform to your needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Organization Type */}
            <div>
              <Label className="mb-2 block">What describes you best?</Label>
              <div className="grid grid-cols-2 gap-3">
                {ORG_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setOrgType(t.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all hover:border-accent/50",
                      orgType === t.value ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card"
                    )}
                  >
                    <t.icon className={cn("h-6 w-6", orgType === t.value ? "text-accent" : "text-muted-foreground")} />
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Role explanation banner */}
            {selectedOrg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">{selectedOrg.roleBanner}</p>
              </div>
            )}

            {/* Company Name */}
            <div>
              <Label htmlFor="company-name">Company Name *</Label>
              <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Logistics Inc." className="mt-1.5" />
            </div>

            {/* Country */}
            <div>
              <Label className="mb-1.5 block">Country</Label>
              <CountrySelector value={country} onValueChange={setCountry} />
            </div>

            {/* Registration Number */}
            <div>
              <Label htmlFor="reg-number">Registration / Tax ID (optional)</Label>
              <Input id="reg-number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="EIN, GST, VAT, MC/DOT number…" className="mt-1.5" />
            </div>

            {/* === TRUCKING-SPECIFIC FIELDS === */}
            {orgType === "trucking_provider" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-semibold text-foreground">Trucking Details</p>
                <div>
                  <Label>Service Areas (ports, regions)</Label>
                  <Input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} placeholder="Port of LA, Port of Long Beach, Inland Empire…" className="mt-1.5" />
                </div>
                <div>
                  <Label className="mb-2 block">Equipment Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <label key={eq} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox checked={selectedEquipment.includes(eq)} onCheckedChange={() => toggleItem(selectedEquipment, setSelectedEquipment, eq)} />
                        {eq}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Operating Hours</Label>
                  <Input value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="Mon–Fri 6am–6pm" className="mt-1.5" />
                </div>
              </div>
            )}

            {/* === WAREHOUSE-SPECIFIC FIELDS === */}
            {orgType === "warehouse_provider" && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-semibold text-foreground">Warehouse Details</p>
                <div>
                  <Label>Warehouse Location / Address</Label>
                  <Input value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="123 Logistics Blvd, Carson, CA 90745" className="mt-1.5" />
                </div>
                <div>
                  <Label className="mb-2 block">Services Offered</Label>
                  <div className="flex flex-wrap gap-2">
                    {WAREHOUSE_SERVICES.map((svc) => (
                      <label key={svc} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox checked={selectedServices.includes(svc)} onCheckedChange={() => toggleItem(selectedServices, setSelectedServices, svc)} />
                        {svc}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Operating Hours</Label>
                  <Input value={warehouseHours} onChange={(e) => setWarehouseHours(e.target.value)} placeholder="Mon–Sat 7am–5pm" className="mt-1.5" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                <SkipForward className="h-4 w-4 mr-1" />
                Skip for now
              </Button>
              <Button variant="electric" onClick={handleSubmit} disabled={!canSubmit || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
