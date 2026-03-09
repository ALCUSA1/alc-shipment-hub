import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WizardShell } from "@/components/wizard/WizardShell";
import { OverviewStep, type OverviewData } from "@/components/wizard/steps/OverviewStep";
import { PartiesStep, type PartiesData, emptyParty } from "@/components/wizard/steps/PartiesStep";
import { CargoStep, type CargoData } from "@/components/wizard/steps/CargoStep";
import { ComplianceStep, type ComplianceData } from "@/components/wizard/steps/ComplianceStep";
import { ReviewStep } from "@/components/wizard/steps/ReviewStep";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const STEPS = ["Overview", "Trade Parties", "Cargo & Container", "Compliance & Insurance", "Review & Submit"];

const NewShipment = () => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: companies = [] } = useQuery({
    queryKey: ["wizard-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, company_name").eq("user_id", user!.id).order("company_name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ports = [] } = useQuery({
    queryKey: ["ports"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const [overview, setOverview] = useState<OverviewData>({
    shipmentType: "", originPort: "", destinationPort: "", pickupLocation: "", deliveryLocation: "", companyId: "", incoterms: "",
  });

  const [parties, setParties] = useState<PartiesData>({
    shipper: emptyParty(), consignee: emptyParty(), notifyParty: emptyParty(),
    notifyPartySameAsConsignee: false, truckingCompany: "", pickupWarehouse: emptyParty(),
  });

  const [cargo, setCargo] = useState<CargoData>({
    commodity: "", hsCode: "", numPackages: "", packageType: "", grossWeight: "", volume: "",
    unitValue: "", totalValue: "", countryOfOrigin: "", containerType: "", containerQuantity: "",
  });

  const [compliance, setCompliance] = useState<ComplianceData>({
    exporterEin: "", exporterName: "", aesType: "", exportLicense: "",
    insuranceProvider: "", insurancePolicy: "", insuranceCoverage: "",
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
          shipment_ref: "PENDING",
          shipment_type: overview.shipmentType || "export",
          origin_port: overview.originPort || null,
          destination_port: overview.destinationPort || null,
          pickup_location: overview.pickupLocation || null,
          delivery_location: overview.deliveryLocation || null,
          company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
          incoterms: overview.incoterms || null,
        })
        .select("id")
        .single();

      if (shipErr) throw shipErr;
      const shipmentId = shipmentRow.id;

      // 2. Create cargo
      if (cargo.commodity || cargo.hsCode || cargo.numPackages) {
        await supabase.from("cargo").insert({
          shipment_id: shipmentId,
          commodity: cargo.commodity || null,
          hs_code: cargo.hsCode || null,
          num_packages: cargo.numPackages ? parseInt(cargo.numPackages) : null,
          package_type: cargo.packageType || null,
          gross_weight: cargo.grossWeight ? parseFloat(cargo.grossWeight) : null,
          volume: cargo.volume ? parseFloat(cargo.volume) : null,
          unit_value: cargo.unitValue ? parseFloat(cargo.unitValue) : null,
          total_value: cargo.totalValue ? parseFloat(cargo.totalValue) : null,
          country_of_origin: cargo.countryOfOrigin || null,
        });
      }

      // 3. Create container
      if (cargo.containerType) {
        await supabase.from("containers").insert({
          shipment_id: shipmentId,
          container_type: cargo.containerType,
          quantity: cargo.containerQuantity ? parseInt(cargo.containerQuantity) : 1,
        });
      }

      // 4. Create parties (with full details)
      const partyEntries: { role: string; company_name: string; contact_name: string | null; address: string | null; email: string | null; phone: string | null; shipment_id: string }[] = [];
      
      // Core parties
      const coreParties: { data: typeof parties.shipper; role: string }[] = [
        { data: parties.shipper, role: "shipper" },
        { data: parties.consignee, role: "consignee" },
        { data: parties.notifyPartySameAsConsignee ? parties.consignee : parties.notifyParty, role: "notify_party" },
        { data: parties.pickupWarehouse, role: "warehouse" },
      ];

      for (const { data: p, role } of coreParties) {
        if (p.companyName) {
          partyEntries.push({
            role, company_name: p.companyName, contact_name: p.contactName || null,
            address: p.address || null, email: p.email || null, phone: p.phone || null,
            shipment_id: shipmentId,
          });
        }
      }

      // Trucking company (simplified - just name)
      if (parties.truckingCompany) {
        partyEntries.push({
          role: "trucking", company_name: parties.truckingCompany, contact_name: null,
          address: null, email: null, phone: null, shipment_id: shipmentId,
        });
      }

      if (partyEntries.length > 0) {
        await supabase.from("shipment_parties").insert(partyEntries);
      }

      // 5. Create customs filing (if compliance data provided)
      if (compliance.exporterName || compliance.exporterEin) {
        await supabase.from("customs_filings").insert({
          shipment_id: shipmentId,
          user_id: user.id,
          exporter_name: compliance.exporterName || null,
          exporter_ein: compliance.exporterEin || null,
          aes_citation: compliance.aesType || null,
          consignee_name: parties.consignee.companyName || null,
          consignee_address: parties.consignee.address || null,
          country_of_destination: overview.destinationPort || null,
          port_of_export: overview.originPort || null,
          port_of_unlading: overview.destinationPort || null,
        });
      }

      // 6. Auto-generate document checklist
      const requiredDocs = [
        "bill_of_lading", "commercial_invoice", "packing_list",
        "shipper_letter_of_instruction", "dock_receipt",
        "certificate_of_origin", "insurance_certificate", "aes_filing",
      ];
      await supabase.from("documents").insert(
        requiredDocs.map((docType) => ({
          shipment_id: shipmentId,
          user_id: user.id,
          doc_type: docType,
          status: "pending",
        }))
      );

      // 7. Create a pending quote linked to shipment
      await supabase.from("quotes").insert({
        shipment_id: shipmentId,
        user_id: user.id,
        status: "pending",
        origin_port: overview.originPort || null,
        destination_port: overview.destinationPort || null,
        container_type: cargo.containerType || null,
        company_id: overview.companyId && overview.companyId !== "none" ? overview.companyId : null,
      });

      toast({ title: "Shipment created", description: "Your shipment has been created with all trade documents initialized." });
      navigate(`/dashboard/shipments/${shipmentId}`);
    } catch (err: any) {
      toast({ title: "Error creating shipment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <OverviewStep data={overview} onChange={setOverview} ports={ports} companies={companies} />;
      case 1: return <PartiesStep data={parties} onChange={setParties} />;
      case 2: return <CargoStep data={cargo} onChange={setCargo} />;
      case 3: return <ComplianceStep data={compliance} onChange={setCompliance} />;
      case 4: return <ReviewStep overview={overview} parties={parties} cargo={cargo} compliance={compliance} companies={companies} />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <WizardShell
        title="Create New Shipment"
        subtitle="Provide comprehensive details to auto-generate all 8 trade documents."
        steps={STEPS}
        currentStep={step}
        onNext={() => step < 4 ? setStep(step + 1) : handleSubmit()}
        onPrev={() => setStep(step - 1)}
        onCancel={() => navigate("/dashboard/shipments")}
        canProceed={true}
        submitting={submitting}
        isLastStep={step === 4}
        submitLabel="Create Shipment"
      >
        {renderStep()}
      </WizardShell>
    </DashboardLayout>
  );
};

export default NewShipment;
