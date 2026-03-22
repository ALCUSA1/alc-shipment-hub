

## Plan: Unified Shipment Flow with Optional Quote

### The Problem
Currently the flow is: Quote → Approve → Convert to Shipment → Track. This forces every user through a quoting pipeline, even direct shippers who just want to book. The quote step should be optional, not mandatory.

### The New Flow (5-step guided wizard)

```text
┌─────────────────────────────────────────────────────────────┐
│  Dashboard CTA: "New Shipment"                              │
│  (replaces "New Quote" as primary action)                   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
         ┌─────────────────────────┐
Step 1   │  Route & Basics         │  Origin, destination, mode,
         │                         │  shipment type (import/export),
         │                         │  incoterms, customer (optional)
         └────────────┬────────────┘
                      ▼
         ┌─────────────────────────┐
Step 2   │  Cargo                  │  Container type/count, commodity,
         │                         │  weight, dimensions, hazmat flag
         └────────────┬────────────┘
                      ▼
         ┌─────────────────────────┐
Step 3   │  Select Rate            │  Show matching carrier rates inline.
         │                         │  User picks one. If no rates match,
         │                         │  allow manual entry.
         │                         │
         │  ┌─ FORK ────────────┐  │
         │  │ "Book Now"        │──┼──► Step 4 (Review & Confirm)
         │  │ "Save as Quote"   │──┼──► Saves as quote, redirects to
         │  └───────────────────┘  │    Quotes page for margin/approval
         └────────────┬────────────┘
                      ▼
         ┌─────────────────────────┐
Step 4   │  Review & Confirm       │  Summary of route, cargo, rate,
         │                         │  estimated charges. One-click
         │                         │  "Confirm Booking" button.
         └────────────┬────────────┘
                      ▼
         ┌─────────────────────────┐
Step 5   │  Booking Created        │  Success screen with shipment ref,
         │                         │  next actions (upload docs, assign
         │                         │  trucking, etc.), link to workspace.
         └─────────────────────────┘
```

### Key UX Decisions

1. **"New Shipment" becomes the primary CTA** on the dashboard, sidebar, and empty states. "New Quote" becomes secondary (accessible from Quotes page or as the fork in Step 3).

2. **The fork at Step 3** is the critical moment: forwarders who need customer approval click "Save as Quote" (adds margin step, sends to customer). Direct shippers click "Book Now" and skip the quote entirely.

3. **Progressive disclosure**: Steps 4-5 only appear for "Book Now" path. The quote path exits early and enters the existing quote approval flow.

4. **Customer is optional**: Direct shippers shipping their own goods don't need to select a customer. Forwarders do. The field is present but not required.

5. **Pre-fill from rate search**: If user came from the homepage rate search, origin/destination/mode are pre-filled and Step 1 is partially complete.

### What Changes

**New file:**
- `src/pages/NewShipmentWizard.tsx` — 5-step wizard replacing the current full-workspace approach for initial creation

**Modified files:**
- `src/pages/Dashboard.tsx` — Change primary CTA from "New Quote" to "New Shipment", update the welcome flow cards (1. Add Customer → 2. Create Shipment → 3. Track & Deliver)
- `src/components/dashboard/AppSidebar.tsx` — No structural change needed (Shipments link already exists)
- `src/App.tsx` — Route the new wizard at `/dashboard/shipments/new` (already exists, just swap the component)
- `src/pages/NewShipment.tsx` — Refactor into the new wizard flow, reuse existing workspace sections as sub-components

**Existing reusable pieces:**
- `CarrierRateSelector` — already shows matching rates
- `PortSelector` — origin/destination port picker
- `CargoStep` — cargo details from the quote wizard
- `WizardShell` — step progress bar component

### What Stays the Same
- The full workspace (`/dashboard/shipments/:id`) remains for editing after creation
- The quote flow (`/dashboard/quotes/new`) stays available for users who specifically want to quote
- All existing shipment data models, tables, and RLS policies are unchanged

