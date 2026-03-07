import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Package, Ship, FileText, Users, Clock, Check, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const shipmentsData: Record<string, {
  id: string;
  origin: string;
  originPort: string;
  destination: string;
  destinationPort: string;
  status: string;
  commodity: string;
  containers: string;
  hsCode: string;
  grossWeight: string;
  volume: string;
  packages: string;
  packageType: string;
  shipper: string;
  consignee: string;
  forwarder: string;
  vessel: string;
  voyage: string;
  etd: string;
  eta: string;
  bookingRef: string;
  milestones: { label: string; date: string | null; location: string | null; completed: boolean }[];
  documents: { name: string; status: string }[];
  parties: { role: string; name: string; contact: string }[];
}> = {
  "SHP-2024-001": {
    id: "SHP-2024-001",
    origin: "Shanghai, China",
    originPort: "CNSHA",
    destination: "Los Angeles, USA",
    destinationPort: "USLAX",
    status: "In Transit",
    commodity: "Electronics",
    containers: "2x40HC",
    hsCode: "8471.30",
    grossWeight: "24,500 kg",
    volume: "65 CBM",
    packages: "480",
    packageType: "Cartons",
    shipper: "Shanghai Electronics Co.",
    consignee: "West Coast Imports LLC",
    forwarder: "Global Freight Solutions",
    vessel: "MSC ANNA",
    voyage: "FA425E",
    etd: "Mar 1, 2026",
    eta: "Mar 18, 2026",
    bookingRef: "MSCU7284561",
    milestones: [
      { label: "Booking Confirmed", date: "Feb 25, 2026", location: "Shanghai, China", completed: true },
      { label: "Cargo Received", date: "Feb 28, 2026", location: "Shanghai CFS", completed: true },
      { label: "Container Loaded", date: "Mar 1, 2026", location: "Shanghai Port", completed: true },
      { label: "Vessel Departed", date: "Mar 1, 2026", location: "Port of Shanghai", completed: true },
      { label: "In Transit", date: "Mar 5, 2026", location: "Pacific Ocean", completed: true },
      { label: "Port Arrival", date: null, location: null, completed: false },
      { label: "Customs Clearance", date: null, location: null, completed: false },
      { label: "Delivered", date: null, location: null, completed: false },
    ],
    documents: [
      { name: "Bill of Lading", status: "Generated" },
      { name: "Commercial Invoice", status: "Generated" },
      { name: "Packing List", status: "Generated" },
      { name: "Shipping Instructions", status: "Generated" },
      { name: "Delivery Order", status: "Pending" },
      { name: "Warehouse Instructions", status: "Pending" },
    ],
    parties: [
      { role: "Shipper", name: "Shanghai Electronics Co.", contact: "li.wei@shanghaielectronics.cn" },
      { role: "Consignee", name: "West Coast Imports LLC", contact: "mike@westcoastimports.com" },
      { role: "Freight Forwarder", name: "Global Freight Solutions", contact: "ops@globalfreight.com" },
      { role: "Trucking Company", name: "Pacific Haulers", contact: "dispatch@pacifichaulers.com" },
      { role: "Customs Broker", name: "LA Customs Services", contact: "clearance@lacustoms.com" },
    ],
  },
  "SHP-2024-002": {
    id: "SHP-2024-002",
    origin: "Rotterdam, Netherlands",
    originPort: "NLRTM",
    destination: "New York, USA",
    destinationPort: "USNYC",
    status: "Booking Confirmed",
    commodity: "Machinery",
    containers: "1x20GP",
    hsCode: "8462.10",
    grossWeight: "18,200 kg",
    volume: "28 CBM",
    packages: "12",
    packageType: "Crates",
    shipper: "Dutch Machinery BV",
    consignee: "Northeast Manufacturing Inc.",
    forwarder: "Euro Logistics",
    vessel: "TBD",
    voyage: "TBD",
    etd: "Mar 10, 2026",
    eta: "Mar 22, 2026",
    bookingRef: "EGLV2938471",
    milestones: [
      { label: "Booking Confirmed", date: "Mar 4, 2026", location: "Rotterdam, Netherlands", completed: true },
      { label: "Cargo Received", date: null, location: null, completed: false },
      { label: "Container Loaded", date: null, location: null, completed: false },
      { label: "Vessel Departed", date: null, location: null, completed: false },
      { label: "In Transit", date: null, location: null, completed: false },
      { label: "Port Arrival", date: null, location: null, completed: false },
      { label: "Customs Clearance", date: null, location: null, completed: false },
      { label: "Delivered", date: null, location: null, completed: false },
    ],
    documents: [
      { name: "Bill of Lading", status: "Pending" },
      { name: "Commercial Invoice", status: "Generated" },
      { name: "Packing List", status: "Generated" },
      { name: "Shipping Instructions", status: "Pending" },
    ],
    parties: [
      { role: "Shipper", name: "Dutch Machinery BV", contact: "jan@dutchmachinery.nl" },
      { role: "Consignee", name: "Northeast Manufacturing Inc.", contact: "procurement@nemfg.com" },
      { role: "Freight Forwarder", name: "Euro Logistics", contact: "bookings@eurologistics.eu" },
    ],
  },
  "SHP-2024-003": {
    id: "SHP-2024-003",
    origin: "Singapore",
    originPort: "SGSIN",
    destination: "Dubai, UAE",
    destinationPort: "AEJEA",
    status: "Cargo Received",
    commodity: "Textiles",
    containers: "3x40HC",
    hsCode: "6204.62",
    grossWeight: "32,100 kg",
    volume: "195 CBM",
    packages: "1,200",
    packageType: "Cartons",
    shipper: "SG Textiles Pte Ltd",
    consignee: "Gulf Trading FZE",
    forwarder: "Asia Pacific Shipping",
    vessel: "EVER GIVEN",
    voyage: "0325W",
    etd: "Mar 8, 2026",
    eta: "Mar 20, 2026",
    bookingRef: "EISU8374921",
    milestones: [
      { label: "Booking Confirmed", date: "Feb 28, 2026", location: "Singapore", completed: true },
      { label: "Cargo Received", date: "Mar 3, 2026", location: "Singapore CFS", completed: true },
      { label: "Container Loaded", date: null, location: null, completed: false },
      { label: "Vessel Departed", date: null, location: null, completed: false },
      { label: "In Transit", date: null, location: null, completed: false },
      { label: "Port Arrival", date: null, location: null, completed: false },
      { label: "Customs Clearance", date: null, location: null, completed: false },
      { label: "Delivered", date: null, location: null, completed: false },
    ],
    documents: [
      { name: "Bill of Lading", status: "Pending" },
      { name: "Commercial Invoice", status: "Generated" },
      { name: "Packing List", status: "Generated" },
      { name: "Shipping Instructions", status: "Generated" },
    ],
    parties: [
      { role: "Shipper", name: "SG Textiles Pte Ltd", contact: "export@sgtextiles.sg" },
      { role: "Consignee", name: "Gulf Trading FZE", contact: "import@gulftrading.ae" },
      { role: "Freight Forwarder", name: "Asia Pacific Shipping", contact: "ops@apshipping.com" },
    ],
  },
  "SHP-2024-004": {
    id: "SHP-2024-004",
    origin: "Hamburg, Germany",
    originPort: "DEHAM",
    destination: "Santos, Brazil",
    destinationPort: "BRSSZ",
    status: "Delivered",
    commodity: "Auto Parts",
    containers: "1x40HC",
    hsCode: "8708.99",
    grossWeight: "14,800 kg",
    volume: "58 CBM",
    packages: "340",
    packageType: "Pallets",
    shipper: "German Auto Parts GmbH",
    consignee: "Brasil Automotivo Ltda",
    forwarder: "TransAtlantic Freight",
    vessel: "HAMBURG EXPRESS",
    voyage: "025S",
    etd: "Feb 10, 2026",
    eta: "Mar 1, 2026",
    bookingRef: "HLCU5829371",
    milestones: [
      { label: "Booking Confirmed", date: "Feb 5, 2026", location: "Hamburg, Germany", completed: true },
      { label: "Cargo Received", date: "Feb 8, 2026", location: "Hamburg Warehouse", completed: true },
      { label: "Container Loaded", date: "Feb 10, 2026", location: "Port of Hamburg", completed: true },
      { label: "Vessel Departed", date: "Feb 10, 2026", location: "Port of Hamburg", completed: true },
      { label: "In Transit", date: "Feb 15, 2026", location: "Atlantic Ocean", completed: true },
      { label: "Port Arrival", date: "Feb 28, 2026", location: "Port of Santos", completed: true },
      { label: "Customs Clearance", date: "Mar 1, 2026", location: "Santos, Brazil", completed: true },
      { label: "Delivered", date: "Mar 1, 2026", location: "São Paulo, Brazil", completed: true },
    ],
    documents: [
      { name: "Bill of Lading", status: "Generated" },
      { name: "Commercial Invoice", status: "Generated" },
      { name: "Packing List", status: "Generated" },
      { name: "Shipping Instructions", status: "Generated" },
      { name: "Delivery Order", status: "Generated" },
      { name: "Warehouse Instructions", status: "Generated" },
    ],
    parties: [
      { role: "Shipper", name: "German Auto Parts GmbH", contact: "export@gaparts.de" },
      { role: "Consignee", name: "Brasil Automotivo Ltda", contact: "compras@brasilautomotivo.com.br" },
      { role: "Freight Forwarder", name: "TransAtlantic Freight", contact: "ops@transatlantic.com" },
      { role: "Customs Broker", name: "Santos Despachos", contact: "despacho@santosdespachos.com.br" },
    ],
  },
};

const statusColor: Record<string, string> = {
  "In Transit": "bg-accent/10 text-accent",
  "Booking Confirmed": "bg-yellow-100 text-yellow-700",
  "Cargo Received": "bg-blue-100 text-blue-700",
  "Delivered": "bg-green-100 text-green-700",
  "Pending": "bg-secondary text-muted-foreground",
};

const docStatusStyle: Record<string, string> = {
  Generated: "text-green-600",
  Pending: "text-muted-foreground",
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const shipment = shipmentsData[id || ""];

  if (!shipment) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-foreground mb-2">Shipment not found</h2>
          <p className="text-muted-foreground mb-6">The shipment you're looking for doesn't exist.</p>
          <Button variant="electric" asChild>
            <Link to="/dashboard/shipments">Back to Shipments</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentMilestoneIndex = (() => {
    let last = -1;
    shipment.milestones.forEach((m, i) => { if (m.completed) last = i; });
    return last;
  })();

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link to="/dashboard/shipments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{shipment.id}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[shipment.status]}`}>
                {shipment.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {shipment.origin} → {shipment.destination}
            </p>
          </div>
          <Button variant="electric" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Generate Documents
          </Button>
        </div>
      </div>

      {/* Milestone Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-border hidden md:block" />
              <div className="absolute top-4 left-4 h-0.5 bg-accent hidden md:block" style={{
                width: currentMilestoneIndex >= 0
                  ? `${(currentMilestoneIndex / (shipment.milestones.length - 1)) * 100}%`
                  : '0%',
                maxWidth: 'calc(100% - 2rem)',
              }} />

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {shipment.milestones.map((milestone, i) => {
                  const isActive = i === currentMilestoneIndex;
                  const isCompleted = milestone.completed;

                  return (
                    <motion.div
                      key={milestone.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="flex flex-col items-center text-center relative"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 mb-3 transition-all ${
                          isCompleted
                            ? isActive
                              ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                              : "bg-accent text-accent-foreground"
                            : "bg-secondary border-2 border-border text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                      <p className={`text-xs font-medium leading-tight mb-1 ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {milestone.label}
                      </p>
                      {milestone.date && (
                        <p className="text-[10px] text-muted-foreground">{milestone.date}</p>
                      )}
                      {milestone.location && (
                        <p className="text-[10px] text-muted-foreground/60">{milestone.location}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Shipment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow label="Origin" value={shipment.origin} />
                <InfoRow label="Destination" value={shipment.destination} />
                <InfoRow label="Origin Port" value={shipment.originPort} />
                <InfoRow label="Destination Port" value={shipment.destinationPort} />
                <InfoRow label="Vessel" value={shipment.vessel} />
                <InfoRow label="Voyage" value={shipment.voyage} />
                <InfoRow label="ETD" value={shipment.etd} />
                <InfoRow label="ETA" value={shipment.eta} />
                <InfoRow label="Booking Ref" value={shipment.bookingRef} />
                <InfoRow label="Containers" value={shipment.containers} />
              </div>
              <Separator className="my-5" />
              <h4 className="text-sm font-semibold text-foreground mb-3">Cargo Information</h4>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow label="Commodity" value={shipment.commodity} />
                <InfoRow label="HS Code" value={shipment.hsCode} />
                <InfoRow label="Gross Weight" value={shipment.grossWeight} />
                <InfoRow label="Volume" value={shipment.volume} />
                <InfoRow label="Packages" value={`${shipment.packages} ${shipment.packageType}`} />
              </div>
            </CardContent>
          </Card>

          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipment.parties.map((party) => (
                  <div key={party.role} className="flex items-start justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{party.role}</p>
                      <p className="text-sm font-medium text-foreground">{party.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{party.contact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shipment.documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <p className="text-sm text-foreground">{doc.name}</p>
                    <span className={`text-xs font-medium ${docStatusStyle[doc.status]}`}>{doc.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default ShipmentDetail;
