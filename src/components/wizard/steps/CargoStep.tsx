import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export interface CargoData {
  commodity: string;
  hsCode: string;
  numPackages: string;
  packageType: string;
  grossWeight: string;
  volume: string;
  unitValue: string;
  totalValue: string;
  countryOfOrigin: string;
  containerType: string;
  containerQuantity: string;
}

interface CargoStepProps {
  data: CargoData;
  onChange: (data: CargoData) => void;
}

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" },
  { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" },
  { value: "45hc", label: "45' HC" },
  { value: "20rf", label: "20' Reefer" },
  { value: "40rf", label: "40' Reefer" },
];

export function CargoStep({ data, onChange }: CargoStepProps) {
  const set = (field: keyof CargoData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Cargo and container details feed into your Commercial Invoice, Packing List, Certificate of Origin, and customs filings.
      </p>

      {/* Container */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Container Type</Label>
          <Select value={data.containerType} onValueChange={(v) => set("containerType", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {CONTAINER_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Container Quantity</Label>
          <Input type="number" placeholder="e.g. 2" className="mt-1" value={data.containerQuantity} onChange={(e) => set("containerQuantity", e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* Commodity */}
      <div>
        <Label>Commodity Description</Label>
        <Input placeholder="e.g. Consumer Electronics — Laptops and Tablets" className="mt-1" value={data.commodity} onChange={(e) => set("commodity", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>HS Code</Label>
          <Input placeholder="e.g. 8471.30" className="mt-1" value={data.hsCode} onChange={(e) => set("hsCode", e.target.value)} />
        </div>
        <div>
          <Label>Country of Origin</Label>
          <Input placeholder="e.g. China" className="mt-1" value={data.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
        </div>
        <div>
          <Label>Package Type</Label>
          <Select value={data.packageType} onValueChange={(v) => set("packageType", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="carton">Carton</SelectItem>
              <SelectItem value="pallet">Pallet</SelectItem>
              <SelectItem value="crate">Crate</SelectItem>
              <SelectItem value="drum">Drum</SelectItem>
              <SelectItem value="bag">Bag</SelectItem>
              <SelectItem value="bundle">Bundle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Number of Packages</Label>
          <Input type="number" placeholder="e.g. 150" className="mt-1" value={data.numPackages} onChange={(e) => set("numPackages", e.target.value)} />
        </div>
        <div>
          <Label>Gross Weight (kg)</Label>
          <Input type="number" placeholder="e.g. 5000" className="mt-1" value={data.grossWeight} onChange={(e) => set("grossWeight", e.target.value)} />
        </div>
        <div>
          <Label>Volume (CBM)</Label>
          <Input type="number" placeholder="e.g. 25" className="mt-1" value={data.volume} onChange={(e) => set("volume", e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* Value */}
      <p className="text-xs text-muted-foreground font-medium">Cargo Value — for Commercial Invoice &amp; Insurance</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Unit Value (USD)</Label>
          <Input type="number" placeholder="e.g. 250.00" className="mt-1" value={data.unitValue} onChange={(e) => set("unitValue", e.target.value)} />
        </div>
        <div>
          <Label>Total Declared Value (USD)</Label>
          <Input type="number" placeholder="e.g. 37,500.00" className="mt-1" value={data.totalValue} onChange={(e) => set("totalValue", e.target.value)} />
        </div>
      </div>
    </>
  );
}
