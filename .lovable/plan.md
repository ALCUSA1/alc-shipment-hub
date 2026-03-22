
# Unified Shipment Flow — Implemented

## What Was Built

A 5-step guided wizard at `/dashboard/shipments/new` replacing the quote-first flow:

1. **Route & Basics** — Origin/destination ports, shipment type, incoterms, customer (optional)
2. **Cargo** — Container type/count, commodity, weight, dimensions, value
3. **Select Rate** — Matching carrier rates inline with "Book Now" or "Save as Quote" fork
4. **Customs & Compliance** — AES filing, insurance, exporter details with 3-layer validation
5. **Review & Confirm** — Summary of route, cargo, rate, documents to generate
6. **Booking Created** — Success screen with next actions

### Container ↔ Commodity Tracking (Implemented)

Each cargo line can now be assigned to a specific container via a dropdown in the workspace `CargoSection`. The system:
- Shows a **Container Contents** collapsible under each container card listing assigned commodities (HS code, weight, volume)
- Persists assignments to `container_commodities` table on booking
- Auto-assigns cargo to the container when only one container exists (wizard flow)
- Fetches `container_commodities` in `ShipmentDetail` for display

### Key UX Changes
- "New Shipment" is the primary CTA on the dashboard (electric button)
- "New Quote" is still accessible as a secondary action
- Welcome cards: Add Customer → Create Shipment → Track & Deliver
- Fork at Step 3 lets forwarders save as quote, direct shippers book immediately
- Pre-fill support via URL params (`?origin=XXX&destination=YYY&container=ZZZ&mode=MMM`)
- 3-layer validation: field-level (Zod), compliance gating, admin approval workflow

### Files
| Action | File |
|--------|------|
| Created | `src/pages/NewShipmentWizard.tsx` |
| Created | `src/lib/wizard-validation.ts` |
| Created | `src/components/workspace/sections/cargo/ContainerCard.tsx` |
| Created | `src/components/workspace/sections/cargo/CargoLineCard.tsx` |
| Modified | `src/lib/shipment-dataset.ts` — Added `containerId` to `CargoLine` |
| Modified | `src/components/workspace/sections/CargoSection.tsx` — Refactored into sub-components, added container assignment + contents view |
| Modified | `src/pages/ShipmentDetail.tsx` — Fetches `container_commodities` |
| Modified | `src/pages/Dashboard.tsx` — New CTA + updated welcome cards |
| Modified | `src/App.tsx` — Route swap to NewShipmentWizard |
| Preserved | `src/pages/NewShipment.tsx` — Full workspace still available for editing |
| Preserved | `src/pages/NewQuote.tsx` — Quote flow unchanged |
