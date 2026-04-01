import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

interface BookingFormProps {
  shipmentId?: string;
  onSuccess?: (bookingId: string) => void;
}

interface EquipmentLine {
  isoCode: string;
  units: number;
  isShipperOwned: boolean;
  commodities: CommodityLine[];
}

interface CommodityLine {
  hsCode: string;
  description: string;
  weight: string;
  weightUnit: string;
  packages: string;
  packageCode: string;
}

interface PartyLine {
  role: string;
  name: string;
  address: string;
  city: string;
  country: string;
  contactName: string;
  email: string;
}

interface LocationLine {
  typeCode: string;
  unlocode: string;
  name: string;
}

export function BookingCreateForm({ shipmentId, onSuccess }: BookingFormProps) {
  const [carrierCode, setCarrierCode] = useState("");
  const [receiptType, setReceiptType] = useState("CY");
  const [deliveryType, setDeliveryType] = useState("CY");
  const [serviceContract, setServiceContract] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("PRE");
  const [tdType, setTdType] = useState("BOL");
  const [vesselName, setVesselName] = useState("");
  const [vesselImo, setVesselImo] = useState("");
  const [voyageNumber, setVoyageNumber] = useState("");
  const [expectedDeparture, setExpectedDeparture] = useState("");
  const [partialLoad, setPartialLoad] = useState(false);
  const [exportDecl, setExportDecl] = useState(false);
  const [equipSub, setEquipSub] = useState(false);

  const [locations, setLocations] = useState<LocationLine[]>([
    { typeCode: "PRE", unlocode: "", name: "" },
    { typeCode: "POL", unlocode: "", name: "" },
    { typeCode: "POD", unlocode: "", name: "" },
    { typeCode: "PDE", unlocode: "", name: "" },
  ]);

  const [parties, setParties] = useState<PartyLine[]>([
    { role: "shipper", name: "", address: "", city: "", country: "", contactName: "", email: "" },
    { role: "consignee", name: "", address: "", city: "", country: "", contactName: "", email: "" },
  ]);

  const [equipments, setEquipments] = useState<EquipmentLine[]>([
    { isoCode: "22G1", units: 1, isShipperOwned: false, commodities: [{ hsCode: "", description: "", weight: "", weightUnit: "KGM", packages: "", packageCode: "" }] },
  ]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!carrierCode) throw new Error("Carrier code is required");

      const payload: Record<string, any> = {
        receiptTypeAtOrigin: receiptType,
        deliveryTypeAtDestination: deliveryType,
        serviceContractReference: serviceContract || undefined,
        paymentTermCode: paymentTerm,
        transportDocumentTypeCode: tdType,
        vesselName: vesselName || undefined,
        vesselIMONumber: vesselImo || undefined,
        carrierExportVoyageNumber: voyageNumber || undefined,
        expectedDepartureDate: expectedDeparture || undefined,
        isPartialLoadAllowed: partialLoad,
        isExportDeclarationRequired: exportDecl,
        isEquipmentSubstitutionAllowed: equipSub,
      };

      // Locations
      payload.shipmentLocations = locations
        .filter((l) => l.unlocode || l.name)
        .map((l) => ({
          shipmentLocationTypeCode: l.typeCode,
          location: { UNLocationCode: l.unlocode || undefined, locationName: l.name || undefined },
        }));

      // Parties
      payload.documentParties = parties
        .filter((p) => p.name)
        .map((p) => ({
          partyFunction: p.role,
          partyName: p.name,
          addressLine1: p.address || undefined,
          city: p.city || undefined,
          countryCode: p.country || undefined,
          contactName: p.contactName || undefined,
          email: p.email || undefined,
        }));

      // Equipment + commodities
      payload.requestedEquipments = equipments.map((eq) => ({
        ISOEquipmentCode: eq.isoCode,
        units: eq.units,
        isShipperOwned: eq.isShipperOwned,
        commodities: eq.commodities
          .filter((c) => c.description || c.hsCode)
          .map((c) => ({
            hsCode: c.hsCode || undefined,
            descriptionOfGoods: c.description || undefined,
            cargoGrossWeight: c.weight ? parseFloat(c.weight) : undefined,
            cargoGrossWeightUnit: c.weightUnit,
            numberOfPackages: c.packages ? parseInt(c.packages) : undefined,
            packageCode: c.packageCode || undefined,
          })),
      }));

      const { data, error } = await supabase.functions.invoke("dcsa-booking", {
        body: { action: "create", carrier_code: carrierCode, shipment_id: shipmentId, payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Booking submitted to carrier");
      onSuccess?.(data.booking_id);
    },
    onError: (err: any) => toast.error(`Booking failed: ${err.message}`),
  });

  const addEquipment = () => setEquipments([...equipments, { isoCode: "22G1", units: 1, isShipperOwned: false, commodities: [{ hsCode: "", description: "", weight: "", weightUnit: "KGM", packages: "", packageCode: "" }] }]);
  const addParty = () => setParties([...parties, { role: "", name: "", address: "", city: "", country: "", contactName: "", email: "" }]);

  const updateEquipment = (idx: number, field: keyof EquipmentLine, value: any) => {
    const updated = [...equipments];
    (updated[idx] as any)[field] = value;
    setEquipments(updated);
  };

  const addCommodity = (eqIdx: number) => {
    const updated = [...equipments];
    updated[eqIdx].commodities.push({ hsCode: "", description: "", weight: "", weightUnit: "KGM", packages: "", packageCode: "" });
    setEquipments(updated);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Carrier & Service</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Carrier Code *</Label>
              <Input value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)} placeholder="e.g. EGLV" />
            </div>
            <div>
              <Label>Service Contract</Label>
              <Input value={serviceContract} onChange={(e) => setServiceContract(e.target.value)} />
            </div>
            <div>
              <Label>Payment Term</Label>
              <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRE">Prepaid</SelectItem>
                  <SelectItem value="COL">Collect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Receipt Type</Label>
              <Select value={receiptType} onValueChange={setReceiptType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CY">CY</SelectItem>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="CFS">CFS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Type</Label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CY">CY</SelectItem>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="CFS">CFS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>TD Type</Label>
              <Select value={tdType} onValueChange={setTdType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOL">Bill of Lading</SelectItem>
                  <SelectItem value="SWB">Sea Waybill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expected Departure</Label>
              <Input type="date" value={expectedDeparture} onChange={(e) => setExpectedDeparture(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Vessel Name</Label>
              <Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
            </div>
            <div>
              <Label>Vessel IMO</Label>
              <Input value={vesselImo} onChange={(e) => setVesselImo(e.target.value)} />
            </div>
            <div>
              <Label>Voyage Number</Label>
              <Input value={voyageNumber} onChange={(e) => setVoyageNumber(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={partialLoad} onCheckedChange={setPartialLoad} />
              <Label>Partial Load</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={exportDecl} onCheckedChange={setExportDecl} />
              <Label>Export Declaration</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={equipSub} onCheckedChange={setEquipSub} />
              <Label>Equipment Substitution</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Shipment Locations</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {locations.map((loc, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{loc.typeCode === "PRE" ? "Place of Receipt" : loc.typeCode === "POL" ? "Port of Loading" : loc.typeCode === "POD" ? "Port of Discharge" : "Place of Delivery"}</Label>
                </div>
                <Input placeholder="UN/LOCODE" value={loc.unlocode} onChange={(e) => { const u = [...locations]; u[i].unlocode = e.target.value; setLocations(u); }} />
                <Input placeholder="Location name" value={loc.name} onChange={(e) => { const u = [...locations]; u[i].name = e.target.value; setLocations(u); }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Document Parties</CardTitle>
          <Button size="sm" variant="outline" onClick={addParty}><Plus className="h-3 w-3 mr-1" /> Add Party</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {parties.map((p, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Role</Label>
                  <Input value={p.role} onChange={(e) => { const u = [...parties]; u[i].role = e.target.value; setParties(u); }} placeholder="e.g. shipper" />
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={p.name} onChange={(e) => { const u = [...parties]; u[i].name = e.target.value; setParties(u); }} />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={p.city} onChange={(e) => { const u = [...parties]; u[i].city = e.target.value; setParties(u); }} />
                </div>
                <div>
                  <Label className="text-xs">Country</Label>
                  <Input value={p.country} onChange={(e) => { const u = [...parties]; u[i].country = e.target.value; setParties(u); }} maxLength={2} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input value={p.address} onChange={(e) => { const u = [...parties]; u[i].address = e.target.value; setParties(u); }} placeholder="Address" />
                <Input value={p.contactName} onChange={(e) => { const u = [...parties]; u[i].contactName = e.target.value; setParties(u); }} placeholder="Contact name" />
                <Input value={p.email} onChange={(e) => { const u = [...parties]; u[i].email = e.target.value; setParties(u); }} placeholder="Email" />
              </div>
              {i >= 2 && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setParties(parties.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Equipment & Commodities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Equipment & Commodities</CardTitle>
          <Button size="sm" variant="outline" onClick={addEquipment}><Plus className="h-3 w-3 mr-1" /> Add Equipment</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipments.map((eq, eqIdx) => (
            <div key={eqIdx} className="border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">ISO Code</Label>
                  <Select value={eq.isoCode} onValueChange={(v) => updateEquipment(eqIdx, "isoCode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="22G1">20' Standard</SelectItem>
                      <SelectItem value="42G1">40' Standard</SelectItem>
                      <SelectItem value="45G1">40' HC</SelectItem>
                      <SelectItem value="22R1">20' Reefer</SelectItem>
                      <SelectItem value="42R1">40' Reefer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Units</Label>
                  <Input type="number" min={1} value={eq.units} onChange={(e) => updateEquipment(eqIdx, "units", parseInt(e.target.value) || 1)} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={eq.isShipperOwned} onCheckedChange={(v) => updateEquipment(eqIdx, "isShipperOwned", v)} />
                  <Label className="text-xs">SOC</Label>
                </div>
                <div className="flex items-end">
                  <Button size="sm" variant="outline" onClick={() => addCommodity(eqIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Commodity
                  </Button>
                </div>
              </div>
              {eq.commodities.map((c, cIdx) => (
                <div key={cIdx} className="pl-4 border-l-2 border-muted grid grid-cols-5 gap-2">
                  <Input placeholder="HS Code" value={c.hsCode} onChange={(e) => {
                    const u = [...equipments]; u[eqIdx].commodities[cIdx].hsCode = e.target.value; setEquipments(u);
                  }} />
                  <Input placeholder="Description" value={c.description} onChange={(e) => {
                    const u = [...equipments]; u[eqIdx].commodities[cIdx].description = e.target.value; setEquipments(u);
                  }} />
                  <Input placeholder="Weight" type="number" value={c.weight} onChange={(e) => {
                    const u = [...equipments]; u[eqIdx].commodities[cIdx].weight = e.target.value; setEquipments(u);
                  }} />
                  <Input placeholder="# Packages" type="number" value={c.packages} onChange={(e) => {
                    const u = [...equipments]; u[eqIdx].commodities[cIdx].packages = e.target.value; setEquipments(u);
                  }} />
                  <Input placeholder="Pkg Code" value={c.packageCode} onChange={(e) => {
                    const u = [...equipments]; u[eqIdx].commodities[cIdx].packageCode = e.target.value; setEquipments(u);
                  }} />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
        <Send className="h-4 w-4 mr-2" />
        {submitMutation.isPending ? "Submitting..." : "Submit Booking to Carrier"}
      </Button>
    </div>
  );
}
