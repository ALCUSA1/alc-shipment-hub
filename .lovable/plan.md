## Admin Console — Scope (anchored to your statement)

The Admin Console is the ALC management workspace to:
1. **See everything** — every account, every user, every shipment, every transaction
2. **Detect** — surface suspicious behavior (failed payments, duplicate accounts, abnormal volume, EDI errors, stuck shipments)
3. **Act** — block users, freeze companies, void shipments, refund payments, revoke API access

Everything else is secondary. Rebuild the IA around those three jobs, on a white shell.

---

## New top-level navigation (7 items, flat — no nested groups)

```text
1. Overview         /admin                  → KPIs, alerts, fraud signals
2. Accounts         /admin/accounts         → Companies + Users in one place
3. Shipments        /admin/shipments        → Every shipment platform-wide
4. Commercial       /admin/commercial       → Quotes, pricing, rate intel
5. Finance          /admin/finance          → Payments, payouts, disputes
6. Trust & Safety   /admin/trust            → NEW — fraud, blocks, compliance, alerts
7. System           /admin/system           → APIs, edge functions, activity log, settings
```

Each top-level page uses **horizontal tabs** for sub-sections. No nested sidebar groups, no orphan URLs.

---

## Sub-tab layout (every existing admin page reattached)

```text
Overview      → single page (current AdminDashboard, restyled)
                + Fraud Signals widget (new) + Alerts feed (existing AdminAlertsBell content)

Accounts      ├ Companies      (AdminCustomerLookup + AdminCompanyDetail)
              ├ Users          (AdminUsers)
              ├ Team           (AdminTeam — internal ALC staff)
              ├ CRM            (AdminCRM)
              └ Partners       (AdminPartners)

Shipments     ├ All            (AdminShipments + AdminShipmentDetail)
              ├ Trucking       (AdminTrucking)
              ├ Warehouses     (AdminWarehouses)
              └ Documents      (AdminDocuments)

Commercial    ├ Quotes         (AdminQuotes)
              ├ Pipeline       (AdminPipeline + AdminSalesPipeline merged)
              ├ Pricing Engine (AdminPricingEngine)
              ├ Customer Pricing (AdminCustomerPricing)
              ├ Lane Auto-Quote (AdminLaneAutoQuote)
              ├ Rate Intel     (AdminRateIntelligence + AdminRateTrends merged)
              └ Shipping Lines (AdminShippingLines)

Finance       ├ Accounting     (AdminAccounting)
              ├ Financials     (AdminFinancials)
              ├ Payments       (AdminPaymentSettings)
              ├ Profit Intel   (AdminProfitIntelligence)
              └ Disputes       NEW tab — Stripe disputes via existing list_disputes API

Trust & Safety (NEW SECTION)
              ├ Alerts         (admin_alerts table — already exists, surfaced from AdminAlertsBell)
              ├ Blocked Users  NEW — list user_roles with 'blocked' + UI to add/remove
              ├ Blocked Domains (blocked_email_domains table — already exists)
              ├ Compliance     (AdminCompliance)
              ├ Failed Payments NEW — payments WHERE status='failed' grouped by user
              ├ Stuck Shipments NEW — admin_alerts WHERE alert_type='stuck_shipment'
              └ Activity Log   (AdminActivity — audit_log table)

System        ├ API & Health   (AdminApiHealth + AdminSystem merged)
              ├ Market Ingestion (AdminMarketIngestion)
              ├ Commercial Cmd (AdminCommercialCommand)
              ├ Notifications  (AdminNotifications)
              └ Account        (AdminAccount — admin's own profile)
```

**Dropped from nav** (files stay, no routes — easy to re-add later):
`AdminSalesAnalytics`, `AdminCampaigns`, `AdminMaterials`, `AdminLearningInsights`, `AdminWeeklyReview`, `AdminDataExplorer`. These have no data wired and aren't part of monitor/detect/act. If you want any kept reachable via direct URL, say so.

---

## Trust & Safety section — what's new

This is the only **new functional code**. Everything else is just reorganization + restyling. It's the most important piece per your scope statement.

**Blocked Users page**
- Lists every user with `user_roles.role = 'blocked'` (new enum value — needs migration)
- Search by email, name, company
- "Block user" button on any user row anywhere in admin → inserts blocked role
- Blocking prevents login (AdminGate + ProtectedRoute check has_role(user, 'blocked'))
- "Unblock" reverses it
- Audit logged via existing audit_log

**Failed Payments page**
- Queries `payments WHERE status='failed'` grouped by user
- Shows count, total $, most recent attempt
- Click → opens user's full payment history + quick-block action
- Powered by existing `alert_on_payment_failure` trigger

**Stuck Shipments page**
- Queries `admin_alerts WHERE alert_type='stuck_shipment'`
- Already populated by existing trigger
- Surface + actionable "contact user" / "force status update" buttons

**Fraud Signals widget** (Overview page)
- Quick counters: new accounts last 24h, failed payments last 7d, blocked users this month, EDI errors last 24h
- Each links into the relevant Trust & Safety page

---

## Light theme — implementation specifics

Convert `AdminLayout` + `AdminSidebar` from hardcoded HSL dark values to semantic tokens already defined in `index.css`:

| Old (dark hardcoded) | New (semantic) |
|---|---|
| `bg-[hsl(220,20%,7%)]` | `bg-background` |
| `text-white` | `text-foreground` |
| `bg-[hsl(220,18%,9%)]` (sidebar) | `bg-card border-r border-border` |
| `text-[hsl(220,10%,50%)]` | `text-muted-foreground` |
| `bg-[hsl(220,15%,15%)]` (active) | `bg-accent/10 text-accent` |
| Red ADMIN chip on red/10 bg | Red text on `bg-secondary` |
| Dotted grid overlay | Removed (was dark-only) |
| Framer-motion page fade | Removed (causes white-flash on light) |

Sidebar uses shadcn `<Sidebar collapsible="icon">` pattern so it collapses to a 56px icon strip — trigger lives in the topbar so it stays visible.

---

## Routing changes

**New nested routes**:
```
/admin                       → Overview (current AdminDashboard restyled)
/admin/accounts/:tab         → AdminAccountsHub
/admin/shipments/:tab        → AdminShipmentsHub
/admin/commercial/:tab       → AdminCommercialHub
/admin/finance/:tab          → AdminFinanceHub
/admin/trust/:tab            → AdminTrustHub  ← NEW
/admin/system/:tab           → AdminSystemHub
```

**Backwards-compat redirects** for every existing URL so bookmarks don't 404:
```
/admin/users      → /admin/accounts/users
/admin/shipments  → /admin/shipments/all
/admin/quotes     → /admin/commercial/quotes
/admin/accounting → /admin/finance/accounting
/admin/compliance → /admin/trust/compliance
... (one Navigate per old URL)
```

---

## Files

**Edit**
- `src/components/admin/AdminLayout.tsx` — light theme, semantic tokens, remove grid + page-fade
- `src/components/admin/AdminSidebar.tsx` — 7-item flat nav, light theme, collapsible icon strip
- `src/App.tsx` — nested routes + redirects, drop 6 unused routes

**Create**
- `src/pages/admin/AdminAccountsHub.tsx` (tab shell)
- `src/pages/admin/AdminShipmentsHub.tsx`
- `src/pages/admin/AdminCommercialHub.tsx`
- `src/pages/admin/AdminFinanceHub.tsx`
- `src/pages/admin/AdminSystemHub.tsx`
- `src/pages/admin/AdminTrustHub.tsx` (tab shell)
- `src/pages/admin/trust/BlockedUsers.tsx` (NEW page)
- `src/pages/admin/trust/FailedPayments.tsx` (NEW page)
- `src/pages/admin/trust/StuckShipments.tsx` (NEW page)
- `src/components/admin/FraudSignalsWidget.tsx` (NEW, on Overview)

**Backend migration** (one only)
- Add `'blocked'` value to `app_role` enum
- `AdminGate` and `ProtectedRoute` start checking `has_role(uid, 'blocked')` → redirect to a "Account suspended" page

**No changes to**
- Individual admin pages (AdminShipments, AdminQuotes, etc.) — only their wrappers change
- Edge functions, RLS, other portals (customer/forwarder/trucking/warehouse/driver)
- Impersonation system (stays as-is, lives in sidebar footer)

---

## Open questions

1. **`'blocked'` role enforcement** — should a blocked user (a) be unable to log in at all, or (b) be able to log in but see only a "suspended" screen? Option (a) is harder to undo for the user (they can't even see why). I default to **(b)**.
2. **The 6 dropped pages** (sales-analytics, campaigns, materials, learning-insights, weekly-review, data) — confirm OK to remove from routes, or keep reachable by URL only?
3. **Design directions** — the design-directions tool refused my screenshot ref twice. I can either (a) build straight to the spec above (Linear/Stripe-admin look, white shell, flat nav) or (b) try one more time with a different screenshot capture. Default: **(a) build directly** so we don't lose more cycles.
