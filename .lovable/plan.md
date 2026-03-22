
# Unified Shipment Flow — Implemented

## What Was Built

A 5-step guided wizard at `/dashboard/shipments/new` replacing the quote-first flow:

1. **Route & Basics** — Origin/destination ports, shipment type, incoterms, customer (optional)
2. **Cargo** — Container type/count, commodity, weight, dimensions, value
3. **Select Rate** — Matching carrier rates inline with "Book Now" or "Save as Quote" fork
4. **Review & Confirm** — Summary of route, cargo, rate, documents to generate
5. **Booking Created** — Success screen with next actions

### Key UX Changes
- "New Shipment" is now the primary CTA on the dashboard (electric button)
- "New Quote" is still accessible as a secondary action
- Welcome cards updated: Add Customer → Create Shipment → Track & Deliver
- The fork at Step 3 lets forwarders save as quote, direct shippers book immediately
- Pre-fill support via URL params (`?origin=XXX&destination=YYY`)

### Files
| Action | File |
|--------|------|
| Created | `src/pages/NewShipmentWizard.tsx` |
| Modified | `src/pages/Dashboard.tsx` — New CTA + updated welcome cards |
| Modified | `src/App.tsx` — Route swap to NewShipmentWizard |
| Preserved | `src/pages/NewShipment.tsx` — Full workspace still available for editing |
| Preserved | `src/pages/NewQuote.tsx` — Quote flow unchanged |
