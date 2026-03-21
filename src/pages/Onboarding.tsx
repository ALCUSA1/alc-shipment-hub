import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CountrySelector } from "@/components/shared/CountrySelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Building2, Package, Truck, Loader2, ArrowRight, SkipForward } from "lucide-react";
import alcLogo from "@/assets/alc-logo.png";

type OrgType = "shipper" | "service_provider";

const ORG_TYPES = [
  {
    value: "shipper" as OrgType,
    label: "Importer / Exporter",
    description: "I need logistics services to move my goods",
    icon: Package,
  },
  {
    value: "service_provider" as OrgType,
    label: "Service Provider",
    description: "I provide freight, trucking, or warehouse services",
    icon: Truck,
  },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("US");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [orgType, setOrgType] = useState<OrgType | "">("");
  const [saving, setSaving] = useState(false);

  const canSubmit = companyName.trim() && orgType;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);

    const companyType = orgType === "shipper" ? "customer" : "vendor";

    const { error } = await supabase.from("companies").insert({
      user_id: user.id,
      company_name: companyName.trim(),
      country,
      ein: registrationNumber.trim() || null,
      company_type: companyType,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Update profile company name
    await supabase.from("profiles").update({ company_name: companyName.trim() }).eq("user_id", user.id);

    // Store onboarding flag
    localStorage.setItem(`onboarding_complete_${user.id}`, "true");

    toast({ title: "Organization created", description: "Welcome aboard! Redirecting to your dashboard." });
    setSaving(false);
    navigate("/dashboard");
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
                    className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all hover:border-accent/50 ${
                      orgType === t.value
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    <t.icon className={`h-6 w-6 ${orgType === t.value ? "text-accent" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Company Name */}
            <div>
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Logistics Inc."
                className="mt-1.5"
              />
            </div>

            {/* Country */}
            <div>
              <Label className="mb-1.5 block">Country</Label>
              <CountrySelector value={country} onValueChange={setCountry} />
            </div>

            {/* Registration Number */}
            <div>
              <Label htmlFor="reg-number">Registration / Tax ID (optional)</Label>
              <Input
                id="reg-number"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="EIN, GST, VAT number…"
                className="mt-1.5"
              />
            </div>

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
