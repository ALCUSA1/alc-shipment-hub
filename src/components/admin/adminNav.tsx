import {
  LayoutDashboard, Users, Package, DollarSign, ShieldAlert, Server, Building2,
} from "lucide-react";

export type AdminNavItem = { title: string; url: string };
export type AdminSection = {
  key: string;
  label: string;
  icon: any;
  url: string;       // landing url (first sub-page)
  match: string[];   // route prefixes that activate this section
  tabs: AdminNavItem[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    url: "/admin",
    match: ["/admin"],
    tabs: [],
  },
  {
    key: "accounts",
    label: "Accounts",
    icon: Building2,
    url: "/admin/customers",
    match: ["/admin/customers", "/admin/users", "/admin/crm", "/admin/team", "/admin/partners"],
    tabs: [
      { title: "Companies", url: "/admin/customers" },
      { title: "Users", url: "/admin/users" },
      { title: "Team", url: "/admin/team" },
      { title: "CRM", url: "/admin/crm" },
      { title: "Partners", url: "/admin/partners" },
    ],
  },
  {
    key: "shipments",
    label: "Shipments",
    icon: Package,
    url: "/admin/shipments",
    match: ["/admin/shipments", "/admin/trucking", "/admin/warehouses", "/admin/documents"],
    tabs: [
      { title: "All Shipments", url: "/admin/shipments" },
      { title: "Trucking", url: "/admin/trucking" },
      { title: "Warehouses", url: "/admin/warehouses" },
      { title: "Documents", url: "/admin/documents" },
    ],
  },
  {
    key: "commercial",
    label: "Commercial",
    icon: Users,
    url: "/admin/quotes",
    match: [
      "/admin/quotes", "/admin/pipeline", "/admin/sales-pipeline",
      "/admin/pricing-engine", "/admin/customer-pricing", "/admin/lane-auto-quote",
      "/admin/rate-intelligence", "/admin/rate-trends", "/admin/shipping-lines",
      "/admin/commercial",
    ],
    tabs: [
      { title: "Quotes", url: "/admin/quotes" },
      { title: "Pipeline", url: "/admin/pipeline" },
      { title: "Pricing Engine", url: "/admin/pricing-engine" },
      { title: "Customer Pricing", url: "/admin/customer-pricing" },
      { title: "Lane Auto-Quote", url: "/admin/lane-auto-quote" },
      { title: "Rate Intel", url: "/admin/rate-intelligence" },
      { title: "Shipping Lines", url: "/admin/shipping-lines" },
      { title: "Commercial Command", url: "/admin/commercial" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: DollarSign,
    url: "/admin/accounting",
    match: ["/admin/accounting", "/admin/financials", "/admin/payment-settings", "/admin/profit"],
    tabs: [
      { title: "Accounting", url: "/admin/accounting" },
      { title: "Financials", url: "/admin/financials" },
      { title: "Payments", url: "/admin/payment-settings" },
      { title: "Profit Intelligence", url: "/admin/profit" },
    ],
  },
  {
    key: "trust",
    label: "Trust & Safety",
    icon: ShieldAlert,
    url: "/admin/trust/alerts",
    match: ["/admin/trust", "/admin/compliance", "/admin/activity"],
    tabs: [
      { title: "Alerts", url: "/admin/trust/alerts" },
      { title: "Blocked Users", url: "/admin/trust/blocked" },
      { title: "Failed Payments", url: "/admin/trust/failed-payments" },
      { title: "Stuck Shipments", url: "/admin/trust/stuck-shipments" },
      { title: "Compliance", url: "/admin/compliance" },
      { title: "Activity Log", url: "/admin/activity" },
    ],
  },
  {
    key: "system",
    label: "System",
    icon: Server,
    url: "/admin/system",
    match: [
      "/admin/system", "/admin/api-health", "/admin/market-ingestion",
      "/admin/notifications", "/admin/account",
    ],
    tabs: [
      { title: "System Health", url: "/admin/system" },
      { title: "API & Integrations", url: "/admin/api-health" },
      { title: "Market Ingestion", url: "/admin/market-ingestion" },
      { title: "Notifications", url: "/admin/notifications" },
      { title: "Account", url: "/admin/account" },
    ],
  },
];

export function getActiveSection(pathname: string): AdminSection {
  // exact match for /admin first
  if (pathname === "/admin") return ADMIN_SECTIONS[0];
  // longest-prefix match across non-overview sections
  let best: AdminSection | null = null;
  let bestLen = 0;
  for (const s of ADMIN_SECTIONS) {
    if (s.key === "overview") continue;
    for (const m of s.match) {
      if (m === "/admin") continue;
      if (pathname === m || pathname.startsWith(m + "/")) {
        if (m.length > bestLen) {
          best = s;
          bestLen = m.length;
        }
      }
    }
  }
  return best ?? ADMIN_SECTIONS[0];
}
