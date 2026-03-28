

## Unified Shipment Booking Transaction Flow

### Problem
The platform currently has 4+ disconnected entry points for creating shipments (Landing page "Book Now", `/book` flow, `/rates` search, `/shipments/new` wizard), each with different UX journeys. The current workspace mixes booking and post-booking modes in one 1070-line component. Payment feels bolted on rather than part of the transaction.

### Architecture

```text
ALL ENTRY POINTS
  ├── Landing "Book Now"
  ├── "Start Shipment" / New Shipment
  ├── "Live Carrier Rates"
  └── "Repeat Shipment"
        │
        ▼
┌─────────────────────────────────────┐
│  /book  — Unified Booking Flow      │
│  Step 1: Search (origin/dest/mode)  │
│  Step 2: Rate Selection (Sailing)   │
│  ──── createShipmentDraft() ────    │
│  Step 3: Shipment Details           │
│  Step 4: Cargo & Parties            │
│  Step 5: Compliance & Services      │
│  Step 6: Documents & Review         │
│  Step 7: Payment                    │
│  Step 8: Confirmation               │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  /dashboard/shipments/:id/workspace │
│  Post-booking operational workspace │
│  (Overview, Tracking, Docs, etc.)   │
└─────────────────────────────────────┘
```

### File Changes

#### 1. New: `src/pages/UnifiedBookingFlow.tsx` (~800 lines)
The single booking page that handles the entire 8-step transaction. Replaces `/book`, absorbs booking-mode logic from `ShipmentWorkspace.tsx`.

**Step management:** URL-driven via `?step=search|rates|details|cargo|compliance|documents|payment|confirmed`

**Layout:** Two-column from Step 3 onward:
- Left: Active step form content
- Right sticky: Shipment summary card (route, carrier, ETD/ETA, locked price, readiness checklist, document generation status)

**Top:** Sticky horizontal progress bar showing all 7 stages with current highlighted

**Steps:**
1. **Search** — Origin (PortSelector), Destination (PortSelector), Shipment Type (export/import), Mode (ocean/air), Search button
2. **Rate Selection** — Reuses `SailingIntelligenceBoard` component. "Select Rate" calls `createShipmentDraft()`, stores shipment ID in state, advances to step 3
3. **Shipment Details** — Read-only summary of locked rate + editable fields (vessel notes, incoterms, pickup date)
4. **Cargo & Parties** — Reuses existing cargo form + shipper/consignee/notify party forms from current workspace
5. **Compliance & Services** — Customs toggle, trucking, warehouse, insurance, special instructions
6. **Documents & Review** — Left: document preview tabs (SI, HBL, Invoice with generation status). Right: compliance summary, services, total due. Buttons: Back, Save Draft, Continue to Payment
7. **Payment** — Pay by Card (Stripe checkout), Pay by Balance, Fund via Wire. Right summary: shipment ref, total due, available balance, remaining. Buttons: Pay Now, Mark Wire Intent, Back
8. **Confirmation** — Booking confirmed card with shipment number, route, carrier, total paid, next milestone. Actions: Go to Workspace, Download Invoice, Download SI, Message Support

#### 2. Modify: `src/pages/ShipmentWorkspace.tsx`
- Remove all booking-mode logic (BOOKING_TABS, form state, persistDraft, validateTab, handleContinueBooking, payment tab, bottom action bar)
- Keep only OPERATIONS_TABS for post-booking management
- Reduces from ~1070 lines to ~500 lines
- Tabs: Overview, Tracking, Booking (read-only summary), Compliance, Logistics, Documents, Financials, Messages, Activity

#### 3. Modify: `src/App.tsx`
- Replace `BookingFlow` import with `UnifiedBookingFlow`
- Redirect `/rates` → `/book` (or make `/rates` render the same unified component starting at search step)
- Redirect `/shipments/new` → `/book`
- Keep `/dashboard/shipments/:id/workspace` for post-booking operations only

#### 4. Modify: All entry point components to redirect to `/book`:
- `src/components/marketing/HeroRateSearch.tsx` — "Book Now" → `/book`
- `src/components/marketing/StartShipmentModal.tsx` — → `/book`
- `src/pages/RateSearch.tsx` — Either redirect to `/book` or render UnifiedBookingFlow
- `src/pages/NewShipmentWizard.tsx` — Redirect to `/book` (keep "Search & Book Instantly" button)
- Dashboard "New Shipment" buttons → `/book`

#### 5. New: `src/components/booking/BookingProgressBar.tsx`
Sticky 7-step progress indicator with icons and labels. Highlights completed, current, and upcoming steps.

#### 6. New: `src/components/booking/BookingSummaryPanel.tsx`
Right-side sticky panel showing: route, carrier, ETD/ETA, transit time, locked price, draft status, document generation status, validation readiness checklist.

#### 7. New: `src/components/booking/BookingConfirmationStep.tsx`
Confirmation screen with shipment details, payment status, next milestone, and action buttons (Go to Workspace, Download Invoice/SI, Message Support).

#### 8. New: `src/components/booking/BookingPaymentStep.tsx`
Payment step with three options (Card, Balance, Wire), summary panel, and action buttons.

#### 9. New: `src/components/booking/BookingDocumentReviewStep.tsx`
Document preview tabs with generation status indicators, plus compliance and services summary.

### Guest/Unauthenticated Flow
- Keep existing sessionStorage persistence for unauthenticated "Book Now" clicks
- After login redirect, resume at the search step with pre-filled params (existing pattern works)
- Auth check happens at rate selection (before `createShipmentDraft`)

### Database Changes
None required — all existing tables (shipments, cargo, shipment_parties, containers, shipment_services, shipment_financials) are reused.

### Implementation Order
1. Create the new booking components (progress bar, summary panel, payment, documents review, confirmation)
2. Create `UnifiedBookingFlow.tsx` assembling all steps
3. Strip booking-mode from `ShipmentWorkspace.tsx`
4. Update routing in `App.tsx`
5. Redirect all entry points to `/book`

