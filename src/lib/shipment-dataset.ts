// Unified shipment dataset types and readiness engine

export interface PartyInfo {
  companyName: string;
  contactName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  taxId: string;
}

export const emptyParty = (): PartyInfo => ({
  companyName: "", contactName: "", address: "", city: "", state: "",
  postalCode: "", country: "", email: "", phone: "", taxId: "",
});

export interface CargoLine {
  id: string;
  commodity: string;
  hsCode: string;
  htsCode: string;
  scheduleBCode: string;
  marksAndNumbers: string;
  numPackages: string;
  packageType: string;
  grossWeight: string;
  netWeight: string;
  volume: string;
  dimensions: string;
  countryOfOrigin: string;
  dangerousGoods: boolean;
  specialInstructions: string;
}

export interface ContainerLine {
  id: string;
  containerNumber: string;
  containerType: string;
  containerSize: string;
  quantity: string;
  sealNumber: string;
  vgm: string;
  reeferTemp: string;
  oogDimensions: string;
}

export interface ChargeLine {
  id: string;
  description: string;
  chargeType: string;
  amount: string;
  currency: string;
  whoPays: string;
  notes: string;
}

export interface ShipmentDataset {
  // Section 1: Basics
  basics: {
    shipmentType: string;
    mode: string;
    originPort: string;
    destinationPort: string;
    placeOfReceipt: string;
    placeOfDelivery: string;
    incoterms: string;
    requestedShipDate: string;
    customerReference: string;
    quoteReference: string;
    companyId: string;
  };
  // Section 2: Parties
  parties: {
    shipper: PartyInfo;
    consignee: PartyInfo;
    notifyParty: PartyInfo;
    notifyPartySameAsConsignee: boolean;
    forwarder: PartyInfo;
    bookingParty: PartyInfo;
    bookingPartySameAsShipper: boolean;
    billingParty: PartyInfo;
    billingPartySameAsShipper: boolean;
    customsBroker: PartyInfo;
    truckingPartner: PartyInfo;
    warehousePartner: PartyInfo;
  };
  // Section 3: Routing
  routing: {
    portOfLoading: string;
    portOfDischarge: string;
    finalDestination: string;
    feederVessel: string;
    feederVoyage: string;
    motherVessel: string;
    motherVoyage: string;
    etd: string;
    eta: string;
    transshipmentPort1: string;
    transshipmentPort2: string;
    carrier: string;
    bookingRef: string;
    bookingTerms: string;
    freightTerms: string;
  };
  // Section 4: Cargo
  cargoLines: CargoLine[];
  containers: ContainerLine[];
  // Section 5: Commercial
  commercial: {
    invoiceNumber: string;
    invoiceDate: string;
    currency: string;
    totalShipmentValue: string;
    insuranceValue: string;
    declaredValue: string;
    paymentTerms: string;
  };
  charges: ChargeLine[];
  // Section 6: Execution
  execution: {
    pickupLocation: string;
    pickupDate: string;
    pickupTime: string;
    deliveryLocation: string;
    driverName: string;
    driverPhone: string;
    truckRef: string;
    chassisRef: string;
    dispatchNotes: string;
    warehouseLocation: string;
    cargoArrivalDate: string;
    warehouseReceiptNumber: string;
    destuffingRequired: boolean;
    storageNotes: string;
    handlingNotes: string;
  };
  // Section 7: Compliance
  compliance: {
    exporterName: string;
    exporterEin: string;
    aesType: string;
    itn: string;
    exportLicense: string;
    eccn: string;
    scheduleBCode: string;
    countryOfUltimateDestination: string;
    filingStatus: string;
    insuranceProvider: string;
    insurancePolicy: string;
    insuranceCoverage: string;
  };
}

export const emptyCargoLine = (): CargoLine => ({
  id: crypto.randomUUID(),
  commodity: "", hsCode: "", htsCode: "", scheduleBCode: "",
  marksAndNumbers: "", numPackages: "", packageType: "",
  grossWeight: "", netWeight: "", volume: "", dimensions: "",
  countryOfOrigin: "", dangerousGoods: false, specialInstructions: "",
});

export const emptyContainerLine = (): ContainerLine => ({
  id: crypto.randomUUID(),
  containerNumber: "", containerType: "", containerSize: "",
  quantity: "1", sealNumber: "", vgm: "", reeferTemp: "", oogDimensions: "",
});

export const emptyChargeLine = (): ChargeLine => ({
  id: crypto.randomUUID(),
  description: "", chargeType: "freight", amount: "",
  currency: "USD", whoPays: "shipper", notes: "",
});

export function createEmptyDataset(): ShipmentDataset {
  return {
    basics: {
      shipmentType: "export", mode: "ocean", originPort: "", destinationPort: "",
      placeOfReceipt: "", placeOfDelivery: "", incoterms: "", requestedShipDate: "",
      customerReference: "", quoteReference: "", companyId: "",
    },
    parties: {
      shipper: emptyParty(), consignee: emptyParty(), notifyParty: emptyParty(),
      notifyPartySameAsConsignee: false, forwarder: emptyParty(),
      bookingParty: emptyParty(), bookingPartySameAsShipper: true,
      billingParty: emptyParty(), billingPartySameAsShipper: true,
      customsBroker: emptyParty(), truckingPartner: emptyParty(),
      warehousePartner: emptyParty(),
    },
    routing: {
      portOfLoading: "", portOfDischarge: "", finalDestination: "",
      feederVessel: "", feederVoyage: "", motherVessel: "", motherVoyage: "",
      etd: "", eta: "", transshipmentPort1: "", transshipmentPort2: "",
      carrier: "", bookingRef: "", bookingTerms: "", freightTerms: "prepaid",
    },
    cargoLines: [emptyCargoLine()],
    containers: [emptyContainerLine()],
    commercial: {
      invoiceNumber: "", invoiceDate: "", currency: "USD",
      totalShipmentValue: "", insuranceValue: "", declaredValue: "", paymentTerms: "",
    },
    charges: [],
    execution: {
      pickupLocation: "", pickupDate: "", pickupTime: "",
      deliveryLocation: "", driverName: "", driverPhone: "",
      truckRef: "", chassisRef: "", dispatchNotes: "",
      warehouseLocation: "", cargoArrivalDate: "", warehouseReceiptNumber: "",
      destuffingRequired: false, storageNotes: "", handlingNotes: "",
    },
    compliance: {
      exporterName: "", exporterEin: "", aesType: "", itn: "",
      exportLicense: "", eccn: "", scheduleBCode: "",
      countryOfUltimateDestination: "", filingStatus: "",
      insuranceProvider: "", insurancePolicy: "", insuranceCoverage: "",
    },
  };
}

// ── Readiness Engine ──

export interface DocReadiness {
  label: string;
  percent: number;
  missing: string[];
}

function checkFields(data: Record<string, any>, fields: { key: string; label: string }[]): { percent: number; missing: string[] } {
  const missing: string[] = [];
  for (const f of fields) {
    const val = f.key.split('.').reduce((o, k) => o?.[k], data);
    if (!val || (typeof val === 'string' && !val.trim())) missing.push(f.label);
  }
  const total = fields.length;
  const filled = total - missing.length;
  return { percent: total > 0 ? Math.round((filled / total) * 100) : 100, missing };
}

export function computeReadiness(ds: ShipmentDataset): DocReadiness[] {
  const flat: Record<string, any> = {
    ...ds.basics, ...ds.routing, ...ds.commercial, ...ds.compliance, ...ds.execution,
    shipperName: ds.parties.shipper.companyName,
    shipperAddress: ds.parties.shipper.address,
    consigneeName: ds.parties.consignee.companyName,
    consigneeAddress: ds.parties.consignee.address,
    notifyPartyName: ds.parties.notifyPartySameAsConsignee ? ds.parties.consignee.companyName : ds.parties.notifyParty.companyName,
    hasCargo: ds.cargoLines.some(c => c.commodity),
    hasContainer: ds.containers.some(c => c.containerType),
    commodity: ds.cargoLines[0]?.commodity,
    hsCode: ds.cargoLines[0]?.hsCode,
    grossWeight: ds.cargoLines[0]?.grossWeight,
    numPackages: ds.cargoLines[0]?.numPackages,
    countryOfOrigin: ds.cargoLines[0]?.countryOfOrigin,
    marksAndNumbers: ds.cargoLines[0]?.marksAndNumbers,
    containerType: ds.containers[0]?.containerType,
  };

  return [
    {
      label: "Draft B/L",
      ...checkFields(flat, [
        { key: "shipperName", label: "Shipper name" },
        { key: "shipperAddress", label: "Shipper address" },
        { key: "consigneeName", label: "Consignee name" },
        { key: "consigneeAddress", label: "Consignee address" },
        { key: "notifyPartyName", label: "Notify party" },
        { key: "portOfLoading", label: "Port of loading" },
        { key: "portOfDischarge", label: "Port of discharge" },
        { key: "motherVessel", label: "Vessel name" },
        { key: "motherVoyage", label: "Voyage number" },
        { key: "commodity", label: "Commodity description" },
        { key: "grossWeight", label: "Gross weight" },
        { key: "numPackages", label: "Number of packages" },
        { key: "marksAndNumbers", label: "Marks & numbers" },
        { key: "containerType", label: "Container type" },
        { key: "freightTerms", label: "Freight terms" },
      ]),
    },
    {
      label: "Shipping Instructions",
      ...checkFields(flat, [
        { key: "shipperName", label: "Shipper name" },
        { key: "consigneeName", label: "Consignee name" },
        { key: "portOfLoading", label: "Port of loading" },
        { key: "portOfDischarge", label: "Port of discharge" },
        { key: "commodity", label: "Commodity" },
        { key: "containerType", label: "Container type" },
        { key: "grossWeight", label: "Gross weight" },
        { key: "carrier", label: "Carrier / shipping line" },
        { key: "bookingRef", label: "Booking reference" },
      ]),
    },
    {
      label: "Commercial Invoice",
      ...checkFields(flat, [
        { key: "shipperName", label: "Shipper / seller" },
        { key: "consigneeName", label: "Consignee / buyer" },
        { key: "invoiceNumber", label: "Invoice number" },
        { key: "invoiceDate", label: "Invoice date" },
        { key: "commodity", label: "Commodity" },
        { key: "totalShipmentValue", label: "Total value" },
        { key: "currency", label: "Currency" },
        { key: "incoterms", label: "Incoterms" },
        { key: "countryOfOrigin", label: "Country of origin" },
      ]),
    },
    {
      label: "Packing List",
      ...checkFields(flat, [
        { key: "shipperName", label: "Shipper" },
        { key: "consigneeName", label: "Consignee" },
        { key: "commodity", label: "Commodity" },
        { key: "numPackages", label: "Package count" },
        { key: "grossWeight", label: "Gross weight" },
        { key: "containerType", label: "Container type" },
        { key: "marksAndNumbers", label: "Marks & numbers" },
      ]),
    },
    {
      label: "AES / ITN",
      ...checkFields(flat, [
        { key: "exporterName", label: "USPPI name" },
        { key: "exporterEin", label: "USPPI EIN" },
        { key: "consigneeName", label: "Ultimate consignee" },
        { key: "hsCode", label: "HS / Schedule B code" },
        { key: "countryOfOrigin", label: "Country of origin" },
        { key: "totalShipmentValue", label: "Value" },
        { key: "portOfLoading", label: "Port of export" },
        { key: "portOfDischarge", label: "Port of unlading" },
      ]),
    },
    {
      label: "Trucking",
      ...checkFields(flat, [
        { key: "pickupLocation", label: "Pickup location" },
        { key: "pickupDate", label: "Pickup date" },
        { key: "deliveryLocation", label: "Delivery location" },
        { key: "containerType", label: "Container type" },
      ]),
    },
    {
      label: "Warehouse",
      ...checkFields(flat, [
        { key: "warehouseLocation", label: "Warehouse location" },
        { key: "cargoArrivalDate", label: "Cargo arrival date" },
        { key: "commodity", label: "Commodity" },
      ]),
    },
  ];
}
