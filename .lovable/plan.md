

## Enhancement Plan: Carrier Cutoff Sync, Amendment Payments & Charge Notifications

### Current State

1. **Cutoffs** — `CutoffTracker` allows manual entry or "Quick Set" (ETD minus offset days). The `check-cutoffs` edge function sends notifications when deadlines approach. But cutoff dates are **never pulled from the shipping line** — they're always manually entered.

2. **Amendments** — `AmendmentPanel` lets users request post-sailing corrections with carrier fee fields (amount, payment-required-before-change). But there's **no "Pay Now" button** on amendments — the fee is displayed as text only, with no payment trigger.

3. **Charges** — `shipment_charges` table exists but isn't surfaced on the shipper portal with payment triggers. No notifications are created when new charges appear.

---

### What We'll Build

#### 1. Auto-Sync Cutoffs from Carrier API
Update the `carrier-booking` edge function to parse cutoff dates from carrier booking confirmation responses and write them directly to the shipment's `cy_cutoff`, `si_cutoff`, `vgm_cutoff`, `doc_cutoff` fields. Add a "Sync from Carrier" button to `CutoffTracker` that calls a new `sync-cutoffs` edge function to pull the latest cutoff dates from the carrier API for a given booking.

**Files:** New `supabase/functions/sync-cutoffs/index.ts`, update `CutoffTracker.tsx` (add Sync button), update `supabase/config.toml`.

#### 2. Amendment Fee Payment Flow
Add a "Pay Amendment Fee" button on each amendment that has `carrier_fee_required = true` and `payment_status = 'unpaid'`. This button invokes the existing `create-payment` edge function with the amendment fee amount. On payment completion, update the amendment's `payment_status` to `paid` and its `status` from `pending_payment` to `requested`.

**Files:** Update `AmendmentPanel.tsx` (add Pay button per amendment), update `verify-payment` edge function (handle amendment payments via metadata).

#### 3. Shipment Charges Panel with Payment Triggers
Create a new `ShipmentChargesPanel` component that displays all `shipment_charges` for the shipment (freight, D&D penalties, amendment fees, terminal charges, etc.) with inline "Pay" buttons for unpaid charges. Add a notification trigger so that when a new charge is inserted into `shipment_charges`, a notification is created for the user.

**Database:** New trigger `notify_on_new_charge` on `shipment_charges` INSERT that creates a notification.

**Files:** New `src/components/shipment/ShipmentChargesPanel.tsx`, update `ShipmentDetail.tsx` (add panel to sidebar), new DB migration for trigger.

#### 4. Dashboard Charge Alert Banner
Update `DashboardActionBanners.tsx` to query for unpaid `shipment_charges` and `pending_payment` amendments, showing a banner like "3 charges require payment" linking to the relevant shipments.

**Files:** Update `DashboardActionBanners.tsx`.

---

### Implementation Summary

| Area | Files |
|------|-------|
| Cutoff sync | New `sync-cutoffs` edge function, update `CutoffTracker.tsx`, `config.toml` |
| Amendment payments | Update `AmendmentPanel.tsx`, `verify-payment` edge function |
| Charges panel | New `ShipmentChargesPanel.tsx`, update `ShipmentDetail.tsx` |
| Charge notifications | New DB trigger migration |
| Dashboard banner | Update `DashboardActionBanners.tsx` |

### Database Changes
- New trigger `notify_on_new_charge` on `shipment_charges` table (INSERT) — creates a notification record for the shipment owner with charge details.

