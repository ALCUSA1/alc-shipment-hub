import { FileText, Receipt, Ship, Shield, Landmark, ClipboardList } from "lucide-react";

export const DOC_TYPE_LABELS: Record<string, string> = {
  bill_of_lading: "Bill of Lading",
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  certificate_of_origin: "Certificate of Origin",
  shipper_letter_of_instruction: "Shipper's Letter of Instruction",
  dock_receipt: "Dock Receipt",
  insurance_certificate: "Insurance Certificate",
  aes_filing: "AES Filing / ITN",
  seaway_bill: "Seaway Bill (SWB)",
  customs_declaration: "Customs Declaration",
  mawb: "Master Air Waybill (MAWB)",
  hawb: "House Air Waybill (HAWB)",
  known_shipper_declaration: "Known Shipper Declaration",
  dg_declaration_air: "Shipper's DG Declaration (IATA)",
  cargo_manifest: "Cargo Manifest",
};

export interface DocCategory {
  key: string;
  label: string;
  icon: typeof FileText;
  docTypes: string[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    key: "invoicing",
    label: "Invoicing",
    icon: Receipt,
    docTypes: ["commercial_invoice"],
  },
  {
    key: "bl_waybills",
    label: "BL & Waybills",
    icon: Ship,
    docTypes: ["bill_of_lading", "seaway_bill", "mawb", "hawb"],
  },
  {
    key: "insurance_company",
    label: "Insurance & Company",
    icon: Shield,
    docTypes: ["insurance_certificate", "known_shipper_declaration", "certificate_of_origin", "cargo_manifest"],
  },
  {
    key: "aes_customs",
    label: "AES / Customs",
    icon: Landmark,
    docTypes: ["customs_declaration", "aes_filing", "dg_declaration_air"],
  },
  {
    key: "instructions",
    label: "Shipping Instructions",
    icon: ClipboardList,
    docTypes: ["packing_list", "shipper_letter_of_instruction", "dock_receipt"],
  },
];

export function getDocLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] || docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCategoryForDocType(docType: string): DocCategory | undefined {
  return DOC_CATEGORIES.find((cat) => cat.docTypes.includes(docType));
}
