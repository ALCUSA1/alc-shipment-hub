import { z } from "zod";

/* ── Step 1: Route & Basics ── */
export const overviewSchema = z.object({
  shipmentType: z.string().min(1, "Shipment type is required"),
  originPort: z.string().min(1, "Origin port is required"),
  destinationPort: z.string().min(1, "Destination port is required"),
  pickupLocation: z.string().optional(),
  deliveryLocation: z.string().optional(),
  companyId: z.string().optional(),
  incoterms: z.string().optional(),
});

/* ── Step 2: Cargo ── */
export const cargoSchema = z.object({
  containerType: z.string().min(1, "Container type is required"),
  containerQuantity: z.string().min(1, "Container quantity is required")
    .refine(v => !v || (Number(v) > 0 && Number.isInteger(Number(v))), "Must be a positive whole number"),
  commodity: z.string().min(1, "Commodity description is required"),
  hsCode: z.string().optional()
    .refine(v => !v || /^[0-9]{4}(\.[0-9]{1,4}){0,3}$/.test(v), "HS code format: e.g. 6309, 6309.00, 6309.00.00"),
  numPackages: z.string().optional()
    .refine(v => !v || Number(v) > 0, "Must be a positive number"),
  packageType: z.string().optional(),
  grossWeight: z.string().min(1, "Gross weight is required")
    .refine(v => !v || Number(v) > 0, "Must be a positive number"),
  volume: z.string().optional()
    .refine(v => !v || Number(v) > 0, "Must be a positive number"),
  unitValue: z.string().optional()
    .refine(v => !v || Number(v) >= 0, "Must be zero or positive"),
  totalValue: z.string().optional()
    .refine(v => !v || Number(v) >= 0, "Must be zero or positive"),
  countryOfOrigin: z.string().optional(),
});

/* ── Step 3: Compliance ── */
const einRegex = /^\d{2}-\d{7}$/;

export const complianceSchema = z.object({
  // USPPI — required for AES
  exporterName: z.string().min(1, "USPPI name is required"),
  exporterEin: z.string().min(1, "USPPI EIN is required")
    .refine(v => !v || einRegex.test(v), "EIN format: XX-XXXXXXX"),
  exporterAddress: z.string().min(1, "USPPI address is required"),
  exporterContactName: z.string().optional(),
  exporterPhone: z.string().optional(),
  exporterEmail: z.string().optional()
    .refine(v => !v || z.string().email().safeParse(v).success, "Invalid email format"),
  // Consignee — required
  consigneeName: z.string().min(1, "Consignee name is required"),
  consigneeAddress: z.string().min(1, "Consignee address is required"),
  consigneeType: z.string().min(1, "Consignee type is required"),
  // Agent — optional
  agentName: z.string().optional(),
  agentAddress: z.string().optional(),
  agentEin: z.string().optional()
    .refine(v => !v || einRegex.test(v), "EIN format: XX-XXXXXXX"),
  // Filing & Transport
  filingOption: z.string().min(1, "Filing option is required"),
  dateOfExportation: z.string().min(1, "Date of exportation is required"),
  transportRefNumber: z.string().optional(),
  shipmentRefNumber: z.string().optional(),
  methodOfTransportation: z.string().min(1, "Method of transportation is required"),
  exportingCarrier: z.string().min(1, "Exporting carrier is required"),
  carrierIdCode: z.string().optional(),
  portOfExport: z.string().min(1, "Port of export is required"),
  portOfUnlading: z.string().min(1, "Port of unlading is required"),
  stateOfOrigin: z.string().min(1, "State of origin is required"),
  countryOfDestination: z.string().min(1, "Country of destination is required"),
  containerized: z.string().optional(),
  hazardousMaterials: z.string().optional(),
  inBondCode: z.string().optional(),
  routedExport: z.string().optional(),
  relatedParties: z.string().optional(),
  entryNumber: z.string().optional(),
  eeiExemptionCitation: z.string().optional(),
  // Insurance
  insuranceProvider: z.string().optional(),
  insurancePolicy: z.string().optional(),
  insuranceCoverage: z.string().optional()
    .refine(v => !v || Number(v) >= 0, "Must be zero or positive"),
});

/* ── Helpers ── */

export type ValidationErrors = Record<string, string>;

export function validateStep<T extends z.ZodTypeAny>(
  schema: T,
  data: z.infer<T>
): { valid: boolean; errors: ValidationErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { valid: true, errors: {} };
  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}

/* ── Compliance Gating ── */
export interface CompanyCredentials {
  fmc_license_status?: string | null;
  fmc_license_expiry?: string | null;
  cargo_insurance_expiry?: string | null;
  sam_expiry?: string | null;
  general_liability_expiry?: string | null;
}

export interface GatingIssue {
  field: string;
  severity: "error" | "warning"; // error = blocks, warning = within 60 days
  message: string;
}

export function checkComplianceGating(company: CompanyCredentials | null): GatingIssue[] {
  if (!company) return [];
  const issues: GatingIssue[] = [];
  const now = new Date();
  const warnThreshold = new Date();
  warnThreshold.setDate(warnThreshold.getDate() + 60);

  const checkExpiry = (field: string, label: string, dateStr: string | null | undefined) => {
    if (!dateStr) return; // no date on file — not blocking
    const d = new Date(dateStr);
    if (d < now) {
      issues.push({ field, severity: "error", message: `${label} expired on ${d.toLocaleDateString()}` });
    } else if (d < warnThreshold) {
      issues.push({ field, severity: "warning", message: `${label} expires ${d.toLocaleDateString()} (within 60 days)` });
    }
  };

  // FMC license
  if (company.fmc_license_status === "revoked" || company.fmc_license_status === "suspended") {
    issues.push({ field: "fmc_license_status", severity: "error", message: `FMC License is ${company.fmc_license_status}` });
  }
  checkExpiry("fmc_license_expiry", "FMC License", company.fmc_license_expiry);
  checkExpiry("cargo_insurance_expiry", "Cargo Insurance", company.cargo_insurance_expiry);
  checkExpiry("sam_expiry", "SAM Registration", company.sam_expiry);
  checkExpiry("general_liability_expiry", "General Liability Insurance", company.general_liability_expiry);

  return issues;
}
