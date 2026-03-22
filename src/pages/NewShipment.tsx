import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

import { SectionNav } from "@/components/workspace/SectionNav";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { BasicsSection } from "@/components/workspace/sections/BasicsSection";
import { PartiesSection } from "@/components/workspace/sections/PartiesSection";
import { RoutingSection } from "@/components/workspace/sections/RoutingSection";
import { CargoSection } from "@/components/workspace/sections/CargoSection";
import { CommercialSection } from "@/components/workspace/sections/CommercialSection";
import { ExecutionSection } from "@/components/workspace/sections/ExecutionSection";
import { ComplianceSection } from "@/components/workspace/sections/ComplianceSection";
import {
  createEmptyDataset, computeReadiness, type ShipmentDataset,
} from "@/lib/shipment-dataset";

const SECTION_IDS = ["basics", "parties", "routing", "cargo", "commercial", "execution", "compliance"];

const NewShipment = () => {
  const [ds, setDs] = useState<ShipmentDataset>(createEmptyDataset);
  const [activeSection, setActiveSection] = useState("basics");
  const [submitting, setSubmitting] = useState(false);
  const [autoFilledShipper, setAutoFilledShipper] = useState(false);
  const [autoFilledCompliance, setAutoFilledCompliance] = useState(false);
  const [customerAutoFilled, setCustomerAutoFilled] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const { user } = useAuth();
  const { toast } = useToast();

  // Queries
  const { data: companies = [] } = useQuery({
    queryKey: ["wizard-companies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, company_name, company_type, address, city, state, country, email, phone, ein, zip, cargo_insurance_provider, cargo_insurance_policy")
        .eq("user_id", user!.id)
        .order("company_name");
      return data || [];
    },
    enabled: !!user,
  });

  const customerCompanies = companies.filter(c => c.company_type === "customer" || !c.company_type);

  const { data: ports = [] } = useQuery({
    queryKey: ["ports"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const { data: profileCompany } = useQuery({
    queryKey: ["wizard-profile", user?.id],
    queryFn: async () => {
      const [profileRes, companyRes] = await Promise.all([
        supabase.from("profiles").select("full_name, company_name").eq("user_id", user!.id).maybeSingle(),
        supabase.from("companies").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      return { profile: profileRes.data, company: companyRes.data };
    },
    enabled: !!user,
  });

  // Auto-fill shipper + compliance from profile
  useEffect(() => {
    if (!profileCompany?.company) return;
    const c = profileCompany.company;
    const p = profileCompany.profile;
    if (!ds.parties.shipper.companyName) {
      setDs(prev => ({
        ...prev,
        parties: {
          ...prev.parties,
          shipper: {
            companyName: c.company_name || p?.company_name || "",
            contactName: p?.full_name || "",
            address: c.address || "", city: c.city || "", state: c.state || "",
            postalCode: c.zip || "", country: c.country || "",
            email: c.email || "", phone: c.phone || "", taxId: c.ein || "",
          },
        },
        compliance: {
          ...prev.compliance,
          exporterName: c.company_name || "",
          exporterEin: c.ein || "",
          insuranceProvider: c.cargo_insurance_provider || "",
          insurancePolicy: c.cargo_insurance_policy || "",
        },
      }));
      setAutoFilledShipper(true);
      setAutoFilledCompliance(true);
    }
  }, [profileCompany]);

  // Clone shipment data
  useEffect(() => {
    if (!cloneId || !user) return;
    const fetchClone = async () => {
      const [shipRes, cargoRes, containerRes, partiesRes] = await Promise.all([
        supabase.from("shipments").select("*").eq("id", cloneId).single(),
        supabase.from("cargo").select("*").eq("shipment_id", cloneId),
        supabase.from("containers").select("*").eq("shipment_id", cloneId),
        supabase.from("shipment_parties").select("*").eq("shipment_id", cloneId),
      ]);
      if (!shipRes.data) return;
      const s = shipRes.data;
      setDs(prev => ({
        ...prev,
        basics: {
          ...prev.basics,
          shipmentType: s.shipment_type || "export",
          originPort: s.origin_port || "",
          destinationPort: s.destination_port || "",
          placeOfReceipt: s.place_of_receipt || "",
          placeOfDelivery: s.place_of_delivery || "",
          incoterms: s.incoterms || "",
          companyId: s.company_id || "",
          customerReference: "",
          requestedShipDate: "",
        },
        routing: {
          ...prev.routing,
          portOfLoading: s.origin_port || "",
          portOfDischarge: s.destination_port || "",
          carrier: s.carrier || "",
          freightTerms: s.freight_terms || "",
        },
        cargoLines: (cargoRes.data || []).map(c => ({
          id: crypto.randomUUID(),
          commodity: c.commodity || "", hsCode: c.hs_code || "",
          htsCode: c.hts_code || "", scheduleBCode: c.schedule_b || "",
          marksAndNumbers: c.marks_and_numbers || "",
          numPackages: c.num_packages?.toString() || "",
          packageType: c.package_type || "",
          grossWeight: c.gross_weight?.toString() || "",
          netWeight: c.net_weight?.toString() || "",
          volume: c.volume?.toString() || "",
          dimensions: c.dimensions || "",
          countryOfOrigin: c.country_of_origin || "",
          dangerousGoods: c.dangerous_goods,
          specialInstructions: c.special_instructions || "",
          pieces: (c as any).pieces?.toString() || "",
          chargeableWeight: (c as any).chargeable_weight?.toString() || "",
          rateClass: (c as any).rate_class || "",
          containerId: "",
        })),
        containers: (containerRes.data || []).map(c => ({
          id: crypto.randomUUID(),
          containerNumber: "", containerType: c.container_type || "",
          containerSize: c.container_size || "",
          quantity: c.quantity?.toString() || "1",
          sealNumber: "", vgm: "", reeferTemp: c.reefer_temp || "",
          oogDimensions: c.oog_dimensions || "",
        })),
      }));

      // Map parties
      const pMap = new Map((partiesRes.data || []).map(p => [p.role, p]));
      const mapParty = (role: string) => {
        const p = pMap.get(role);
        if (!p) return undefined;
        return {
          companyName: p.company_name || "", contactName: p.contact_name || "",
          address: p.address || "", city: p.city || "", state: p.state || "",
          postalCode: p.postal_code || "", country: p.country || "",
          email: p.email || "", phone: p.phone || "", taxId: p.tax_id || "",
        };
      };
      const consignee = mapParty("consignee");
      if (consignee) {
        setDs(prev => ({
          ...prev,
          parties: {
            ...prev.parties,
            consignee,
            notifyParty: mapParty("notify_party") || prev.parties.notifyParty,
          },
        }));
      }
      toast({ title: "Shipment cloned", description: "Data pre-filled from previous shipment. Review and adjust as needed." });
    };
    fetchClone();
  }, [cloneId, user]);

  // Auto-fill consignee when customer selected
  const handleCustomerSelected = useCallback((company: any) => {
    if (!company || customerAutoFilled) return;
    setCustomerAutoFilled(true);
    const primaryContact = company.company_contacts?.find((c: any) => c.is_primary) || company.company_contacts?.[0];
    setDs(prev => ({
      ...prev,
      parties: {
        ...prev.parties,
        consignee: {
          companyName: company.company_name || "",
          contactName: primaryContact?.full_name || "",
          address: company.address || "",
          city: company.city || "",
          state: company.state || "",
          postalCode: company.zip || "",
          country: company.country || "",
          email: primaryContact?.email || company.email || "",
          phone: primaryContact?.phone || company.phone || "",
          taxId: company.ein || "",
        },
      },
    }));
  }, [customerAutoFilled]);

  // Readiness
  const readiness = useMemo(() => computeReadiness(ds), [ds]);

  // Section filled indicators for nav
  const sectionFilled = useMemo(() => ({
    basics: !!(ds.basics.originPort && ds.basics.destinationPort),
    parties: !!(ds.parties.shipper.companyName && ds.parties.consignee.companyName),
    routing: !!(ds.routing.portOfLoading || ds.routing.motherVessel),
    cargo: !!(ds.cargoLines[0]?.commodity || ds.containers[0]?.containerType),
    commercial: !!(ds.commercial.invoiceNumber || ds.commercial.totalShipmentValue),
    execution: !!(ds.execution.pickupLocation || ds.execution.warehouseLocation),
    compliance: !!(ds.compliance.exporterName || ds.compliance.insuranceProvider),
  }), [ds]);

  // Section navigation
  const handleNavigate = useCallback((id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTION_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Sync basics ports → routing
  const updateBasics = useCallback((b: ShipmentDataset["basics"]) => {
    setDs(prev => ({
      ...prev,
      basics: b,
      routing: {
        ...prev.routing,
        portOfLoading: b.originPort || prev.routing.portOfLoading,
        portOfDischarge: b.destinationPort || prev.routing.portOfDischarge,
      },
    }));
  }, []);

  const isExport = ds.basics.shipmentType === "export" || ds.basics.shipmentType === "cross_trade";

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const b = ds.basics;
      const r = ds.routing;
      const com = ds.commercial;
      const ex = ds.execution;
      const comp = ds.compliance;

      const isAirMode = b.mode === "air";
      const { data: row, error: err } = await supabase.from("shipments").insert({
        user_id: user.id,
        shipment_ref: "PENDING",
        shipment_type: b.shipmentType || "export",
        mode: b.mode || "ocean",
        origin_port: isAirMode ? (r.airportOfDeparture || b.originPort || null) : (r.portOfLoading || b.originPort || null),
        destination_port: isAirMode ? (r.airportOfDestination || b.destinationPort || null) : (r.portOfDischarge || b.destinationPort || null),
        place_of_receipt: b.placeOfReceipt || null,
        place_of_delivery: b.placeOfDelivery || null,
        incoterms: b.incoterms || null,
        requested_ship_date: b.requestedShipDate || null,
        customer_reference: b.customerReference || null,
        quote_reference: b.quoteReference || null,
        company_id: b.companyId || null,
        vessel: r.motherVessel || null,
        voyage: r.motherVoyage || null,
        feeder_vessel: r.feederVessel || null,
        feeder_voyage: r.feederVoyage || null,
        etd: r.etd || null,
        eta: r.eta || null,
        transshipment_port_1: r.transshipmentPort1 || null,
        transshipment_port_2: r.transshipmentPort2 || null,
        carrier: r.carrier || null,
        booking_ref: r.bookingRef || null,
        booking_terms: r.bookingTerms || null,
        freight_terms: r.freightTerms || null,
        final_destination: r.finalDestination || null,
        invoice_number: com.invoiceNumber || null,
        invoice_date: com.invoiceDate || null,
        invoice_currency: com.currency || "USD",
        total_shipment_value: com.totalShipmentValue ? parseFloat(com.totalShipmentValue) : null,
        insurance_value: com.insuranceValue ? parseFloat(com.insuranceValue) : null,
        declared_value: com.declaredValue ? parseFloat(com.declaredValue) : null,
        payment_terms: com.paymentTerms || null,
        pickup_location: ex.pickupLocation || null,
        pickup_city: ex.pickupCity || null,
        pickup_state: ex.pickupState || null,
        pickup_postal_code: ex.pickupPostalCode || null,
        pickup_country: ex.pickupCountry || null,
        pickup_contact_name: ex.pickupContactName || null,
        pickup_contact_phone: ex.pickupContactPhone || null,
        pickup_instructions: ex.pickupInstructions || null,
        pickup_validated: ex.pickupValidated,
        delivery_location: ex.deliveryLocation || null,
        delivery_city: ex.deliveryCity || null,
        delivery_state: ex.deliveryState || null,
        delivery_postal_code: ex.deliveryPostalCode || null,
        delivery_country: ex.deliveryCountry || null,
        delivery_contact_name: ex.deliveryContactName || null,
        delivery_contact_phone: ex.deliveryContactPhone || null,
        delivery_instructions: ex.deliveryInstructions || null,
        delivery_validated: ex.deliveryValidated,
        warehouse_location: ex.warehouseLocation || null,
        cargo_arrival_date: ex.cargoArrivalDate || null,
        warehouse_receipt_number: ex.warehouseReceiptNumber || null,
        destuffing_required: ex.destuffingRequired,
        storage_notes: ex.storageNotes || null,
        handling_notes: ex.handlingNotes || null,
        // Air-specific fields
        ...(isAirMode ? {
          airline: r.airline || null,
          flight_number: r.flightNumber || null,
          mawb_number: r.mawbNumber || null,
          hawb_number: r.hawbNumber || null,
          airport_of_departure: r.airportOfDeparture || b.originPort || null,
          airport_of_destination: r.airportOfDestination || b.destinationPort || null,
          aircraft_type: r.aircraftType || null,
          routing_and_destination: r.routingAndDestination || null,
          handling_information: r.handlingInformation || null,
          accounting_information: r.accountingInformation || null,
          sci: r.sci || null,
          declared_value_for_carriage: r.declaredValueForCarriage ? parseFloat(r.declaredValueForCarriage) : null,
          declared_value_for_customs: r.declaredValueForCustoms ? parseFloat(r.declaredValueForCustoms) : null,
        } : {}),
      }).select("id").single();

      if (err) throw err;
      const shipmentId = row.id;

      const cargoInserts = ds.cargoLines.filter(c => c.commodity || c.hsCode).map(c => ({
        shipment_id: shipmentId,
        commodity: c.commodity || null, hs_code: c.hsCode || null,
        hts_code: c.htsCode || null, schedule_b: c.scheduleBCode || null,
        marks_and_numbers: c.marksAndNumbers || null,
        num_packages: c.numPackages ? parseInt(c.numPackages) : null,
        package_type: c.packageType || null,
        gross_weight: c.grossWeight ? parseFloat(c.grossWeight) : null,
        net_weight: c.netWeight ? parseFloat(c.netWeight) : null,
        volume: c.volume ? parseFloat(c.volume) : null,
        dimensions: c.dimensions || null,
        country_of_origin: c.countryOfOrigin || null,
        dangerous_goods: c.dangerousGoods,
        special_instructions: c.specialInstructions || null,
      }));

      const containerInserts = ds.containers.filter(c => c.containerType).map(c => ({
        shipment_id: shipmentId, container_type: c.containerType,
        container_number: c.containerNumber || null,
        quantity: c.quantity ? parseInt(c.quantity) : 1,
        seal_number: c.sealNumber || null,
        vgm: c.vgm ? parseFloat(c.vgm) : null,
        reefer_temp: c.reeferTemp || null,
        oog_dimensions: c.oogDimensions || null,
      }));

      const notifyData = ds.parties.notifyPartySameAsConsignee ? ds.parties.consignee : ds.parties.notifyParty;
      const bookingData = ds.parties.bookingPartySameAsShipper ? ds.parties.shipper : ds.parties.bookingParty;
      const billingData = ds.parties.billingPartySameAsShipper ? ds.parties.shipper : ds.parties.billingParty;

      const partyMap = [
        { party: ds.parties.shipper, role: "shipper" },
        { party: ds.parties.consignee, role: "consignee" },
        { party: notifyData, role: "notify_party" },
        { party: bookingData, role: "booking_party" },
        { party: billingData, role: "billing_party" },
        { party: ds.parties.forwarder, role: "forwarder" },
        { party: ds.parties.customsBroker, role: "customs_broker" },
        { party: ds.parties.truckingPartner, role: "trucking" },
        { party: ds.parties.warehousePartner, role: "warehouse" },
      ];

      const partyInserts = partyMap
        .filter(({ party }) => party?.companyName)
        .map(({ party, role }) => ({
          shipment_id: shipmentId, role, company_name: party.companyName,
          contact_name: party.contactName || null, address: party.address || null,
          city: party.city || null, state: party.state || null,
          postal_code: party.postalCode || null, country: party.country || null,
          email: party.email || null, phone: party.phone || null,
          tax_id: party.taxId || null,
        }));

      const chargeInserts = ds.charges.filter(c => c.description && c.amount).map(c => ({
        shipment_id: shipmentId, description: c.description,
        charge_type: c.chargeType, amount: parseFloat(c.amount),
        currency: c.currency, who_pays: c.whoPays, notes: c.notes || null,
      }));

      const inserts: PromiseLike<any>[] = [];
      if (cargoInserts.length) inserts.push(supabase.from("cargo").insert(cargoInserts).then());
      if (partyInserts.length) inserts.push(supabase.from("shipment_parties").insert(partyInserts).then());
      if (chargeInserts.length) inserts.push(supabase.from("shipment_charges").insert(chargeInserts).then());

      // Insert containers and get back IDs for commodity mapping
      let containerIdMap: Record<string, string> = {};
      if (containerInserts.length) {
        const { data: insertedContainers } = await supabase
          .from("containers")
          .insert(containerInserts)
          .select("id, container_type, container_number");
        if (insertedContainers) {
          // Map local container IDs to DB IDs by matching order
          ds.containers.filter(c => c.containerType).forEach((localContainer, idx) => {
            if (insertedContainers[idx]) {
              containerIdMap[localContainer.id] = insertedContainers[idx].id;
            }
          });
        }
      }

      // Persist container_commodities linkage
      const commodityInserts = ds.cargoLines
        .filter(c => c.containerId && containerIdMap[c.containerId] && (c.commodity || c.hsCode))
        .map((c, idx) => ({
          container_id: containerIdMap[c.containerId],
          shipment_id: shipmentId,
          line_sequence: idx + 1,
          commodity_description: c.commodity || null,
          hs_code: c.hsCode || null,
          hts_code: c.htsCode || null,
          schedule_b_number: c.scheduleBCode || null,
          gross_weight_kg: c.grossWeight ? parseFloat(c.grossWeight) : null,
          net_weight_kg: c.netWeight ? parseFloat(c.netWeight) : null,
          value_usd: null,
          quantity: c.numPackages ? parseFloat(c.numPackages) : null,
          unit_of_measure: c.packageType || null,
          country_of_manufacture: c.countryOfOrigin || null,
          hazardous: c.dangerousGoods,
        }));
      if (commodityInserts.length) {
        inserts.push(supabase.from("container_commodities").insert(commodityInserts).then());
      }

      if (comp.exporterName || comp.exporterEin) {
        inserts.push(supabase.from("customs_filings").insert({
          shipment_id: shipmentId, user_id: user.id,
          exporter_name: comp.exporterName || null, exporter_ein: comp.exporterEin || null,
          aes_citation: comp.aesType || null, itn: comp.itn || null,
          consignee_name: ds.parties.consignee.companyName || null,
          consignee_address: ds.parties.consignee.address || null,
          country_of_destination: comp.countryOfUltimateDestination || null,
          port_of_export: r.portOfLoading || null, port_of_unlading: r.portOfDischarge || null,
        }).then());
      }

      const requiredDocs = isAirMode
        ? ["mawb", "hawb", "commercial_invoice", "packing_list", "shipper_letter_of_instruction", "known_shipper_declaration", "aes_filing"]
        : ["bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction", "dock_receipt", "certificate_of_origin", "insurance_certificate", "aes_filing"];
      inserts.push(supabase.from("documents").insert(
        requiredDocs.map(docType => ({ shipment_id: shipmentId, user_id: user.id, doc_type: docType, status: "pending" }))
      ).then());

      inserts.push(supabase.from("quotes").insert({
        shipment_id: shipmentId, user_id: user.id, status: "pending",
        origin_port: r.portOfLoading || b.originPort || null,
        destination_port: r.portOfDischarge || b.destinationPort || null,
        container_type: ds.containers[0]?.containerType || null,
        company_id: b.companyId || null,
      }).then());

      await Promise.all(inserts);
      toast({ title: "Shipment created", description: "All trade documents and records initialized." });
      navigate(`/dashboard/shipments/${shipmentId}`);
    } catch (err: any) {
      toast({ title: "Error creating shipment", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto px-1">
        {/* Sticky header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">New Shipment</h1>
              <p className="text-[11px] text-muted-foreground">Enter once — generates all documents automatically.</p>
            </div>
          </div>
          <Button variant="electric" size="sm" onClick={handleSubmit} disabled={submitting} className="rounded-lg px-5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Create Shipment
          </Button>
        </div>

        {/* 3-column */}
        <div className="flex gap-8">
          <SectionNav activeSection={activeSection} onNavigate={handleNavigate} sectionFilled={sectionFilled} />

          <main className="flex-1 min-w-0 space-y-12 pb-24">
            <BasicsSection data={ds.basics} onChange={updateBasics} ports={ports} companies={customerCompanies} onCustomerSelected={handleCustomerSelected} />
            <PartiesSection
              data={ds.parties}
              onChange={(p) => setDs(prev => ({ ...prev, parties: p }))}
              autoFilledShipper={autoFilledShipper}
              companies={companies}
              onSaveToCrm={async (party, type) => {
                if (!user || !party.companyName) return;
                try {
                  await supabase.from("companies").insert({
                    user_id: user.id,
                    company_name: party.companyName,
                    company_type: type === "truckingPartner" ? "trucking" : "consignee",
                    address: party.address || null,
                    city: party.city || null,
                    state: party.state || null,
                    zip: party.postalCode || null,
                    country: party.country || null,
                    email: party.email || null,
                    phone: party.phone || null,
                    ein: party.taxId || null,
                  });
                  toast({ title: "Saved to CRM", description: `${party.companyName} added as ${type === "truckingPartner" ? "trucking partner" : "consignee"}.` });
                } catch (err: any) {
                  toast({ title: "Save failed", description: err.message, variant: "destructive" });
                }
              }}
            />
            <RoutingSection data={ds.routing} onChange={(r) => setDs(prev => ({ ...prev, routing: r }))} ports={ports} mode={ds.basics.mode} />
            <CargoSection
              cargoLines={ds.cargoLines} containers={ds.containers}
              onCargoChange={(c) => setDs(prev => ({ ...prev, cargoLines: c }))}
              onContainerChange={(c) => setDs(prev => ({ ...prev, containers: c }))}
              mode={ds.basics.mode}
            />
            <CommercialSection
              data={ds.commercial} charges={ds.charges}
              onChange={(c) => setDs(prev => ({ ...prev, commercial: c }))}
              onChargesChange={(c) => setDs(prev => ({ ...prev, charges: c }))}
            />
            <ExecutionSection data={ds.execution} onChange={(e) => setDs(prev => ({ ...prev, execution: e }))} />
            <ComplianceSection data={ds.compliance} onChange={(c) => setDs(prev => ({ ...prev, compliance: c }))} autoFilled={autoFilledCompliance} isExport={isExport} />
          </main>

          <div className="w-64 shrink-0 hidden xl:block">
            <ReadinessPanel items={readiness} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewShipment;
