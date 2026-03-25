import type { CompanyRole } from "@/hooks/useCompanyRole";

/**
 * Company-level permission definitions for the customer portal.
 * Maps capabilities to the roles that can access them.
 */

export type PortalCapability =
  | "view_dashboard"
  | "view_financials"
  | "view_shipments"
  | "create_shipment"
  | "edit_shipment"
  | "approve_quote"
  | "view_documents"
  | "upload_documents"
  | "download_invoices"
  | "view_spark"
  | "post_spark"
  | "manage_team"
  | "view_messages"
  | "view_settings"
  | "view_analytics"
  | "view_rate_trends";

const CAPABILITY_ROLES: Record<PortalCapability, CompanyRole[]> = {
  view_dashboard:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  view_financials:   ["admin", "finance_user"],
  view_shipments:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user", "finance_user", "viewer"],
  create_shipment:   ["admin", "operations_manager", "sales_manager", "customer_user"],
  edit_shipment:     ["admin", "operations_manager", "sales_manager", "pricing_manager"],
  approve_quote:     ["admin"],
  view_documents:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  upload_documents:  ["admin", "operations_manager", "sales_manager", "customer_user"],
  download_invoices: ["admin", "finance_user"],
  view_spark:        ["admin", "operations_manager", "sales_manager", "customer_user"],
  post_spark:        ["admin", "operations_manager", "sales_manager", "customer_user"],
  manage_team:       ["admin"],
  view_messages:     ["admin", "operations_manager", "sales_manager", "customer_user"],
  view_settings:     ["admin"],
  view_analytics:    ["admin", "sales_manager", "pricing_manager"],
  view_rate_trends:  ["admin", "sales_manager", "pricing_manager"],
};

export function hasCapability(role: CompanyRole | null, capability: PortalCapability): boolean {
  if (!role) return true; // No role assigned yet — allow (legacy users)
  return CAPABILITY_ROLES[capability].includes(role);
}

/**
 * Navigation items visible to each role.
 */
export type NavItemKey = "dashboard" | "shipments" | "quotes" | "crm" | "partners" | "accounting" | "team" | "messages" | "spark" | "analytics" | "rate-trends" | "account" | "support" | "ideas" | "alerts";

const NAV_ROLES: Record<NavItemKey, CompanyRole[]> = {
  dashboard:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  shipments:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user", "finance_user", "viewer"],
  quotes:       ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user"],
  crm:          ["admin", "sales_manager"],
  partners:     ["admin", "operations_manager", "sales_manager"],
  accounting:   ["admin", "finance_user"],
  team:         ["admin"],
  messages:     ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  spark:        ["admin", "operations_manager", "sales_manager", "customer_user"],
  analytics:    ["admin", "sales_manager", "pricing_manager"],
  "rate-trends": ["admin", "sales_manager", "pricing_manager"],
  support:      ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  ideas:        ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  account:      ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  alerts:       ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
};

export function canSeeNavItem(role: CompanyRole | null, item: NavItemKey): boolean {
  if (!role) return true; // Legacy — show all
  return NAV_ROLES[item].includes(role);
}

/**
 * Shipment workspace tabs visible to each role.
 */
export type WorkspaceTab = "overview" | "tracking" | "booking" | "compliance" | "trucking" | "documents" | "financials" | "messages" | "activity";

const TAB_ROLES: Record<WorkspaceTab, CompanyRole[]> = {
  overview:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  tracking:    ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user", "viewer"],
  booking:     ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user"],
  compliance:  ["admin", "operations_manager", "sales_manager", "pricing_manager"],
  trucking:    ["admin", "operations_manager"],
  documents:   ["admin", "operations_manager", "sales_manager", "pricing_manager", "finance_user", "customer_user", "viewer"],
  financials:  ["admin", "finance_user"],
  messages:    ["admin", "operations_manager", "sales_manager", "customer_user"],
  activity:    ["admin", "operations_manager", "sales_manager", "pricing_manager"],
};

export function canSeeTab(role: CompanyRole | null, tab: WorkspaceTab): boolean {
  if (!role) return true;
  return TAB_ROLES[tab].includes(role);
}

/**
 * Dashboard section visibility per role.
 */
export function canSeeDashboardSection(role: CompanyRole | null, section: "financials" | "pipeline" | "alerts" | "recent" | "cta"): boolean {
  if (!role) return true;
  switch (section) {
    case "financials": return ["admin", "finance_user"].includes(role);
    case "pipeline":   return ["admin", "operations_manager", "sales_manager", "pricing_manager", "customer_user"].includes(role);
    case "alerts":     return role !== "viewer";
    case "recent":     return true;
    case "cta":        return ["admin", "operations_manager", "sales_manager", "customer_user"].includes(role);
    default: return true;
  }
}
