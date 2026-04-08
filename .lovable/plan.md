
# Streamlined Shipment Booking & Management Experience

## Problem
The current system requires users to manually navigate between disconnected pages (rates, schedules, AES, documents, trucking, warehouse). Too many clicks, too much manual data entry, and no proactive intelligence.

## Solution: Smart Step-by-Step Flow + Intelligent Workspace

### Part 1: Redesigned Booking Flow (`/book`)

**Step 1 — Route & Cargo** (existing, enhanced)
- Origin/destination port selection with schedule availability indicator
- Container type, commodity, weight — auto-suggests based on user's booking history
- AI banner: "⚠️ Red Sea disruptions affecting Asia-USEC routes — expect +5 day transit"

**Step 2 — Rate & Sailing Selection** (existing, enhanced)
- Sailing Intelligence Board with rates, transit times, availability scores
- NEW: Inline carrier news alerts (route cancellations, surcharge changes)
- NEW: Terminal schedule preview — shows terminal cutoff dates alongside sailing options
- NEW: Detention risk indicator per carrier (free days, historical detention data)

**Step 3 — Logistics Setup** (NEW — replaces manual trucking/warehouse pages)
- **Smart Trucking Suggestions**: System recommends top 2-3 trucking companies based on:
  - Proximity to origin/destination
  - Available rates from `trucking_quotes`
  - Historical performance
- **Warehouse Selection**: If cargo needs warehousing, suggest nearest facilities with availability
- Auto-generates pickup/delivery instructions from shipment data
- All documentation pre-filled for trucking company (cargo details, hazmat flags, special handling)

**Step 4 — Compliance & Documents** (enhanced)
- AES filing auto-populated from shipment parties, cargo, and routing data (already built)
- Smart compliance checklist: shows exactly what's needed based on commodity + destination
- AI assistant highlights missing items: "You need an EEI filing for this commodity to this destination"
- Document requirements auto-seeded based on shipment type

**Step 5 — Review & Payment** (enhanced)
- Complete cost breakdown: ocean freight + surcharges + trucking + warehouse + estimated detention
- AI summary: "This shipment has a 92% on-time probability. Detention risk: Low (14 free days)"
- Payment processing
- Confirmation with timeline showing all key dates (cutoffs, ETD, ETA, terminal schedule)

### Part 2: Enhanced Post-Booking Workspace

**Proactive AI Intelligence Panel** (top of workspace)
- Real-time alerts: route disruptions, price changes, detention warnings
- Shipping line news relevant to this specific route/carrier
- Terminal schedule updates for origin and destination ports
- Suggested next actions: "Document cutoff in 3 days — upload Commercial Invoice"

**Smart Logistics Coordination Tab**
- Unified view of trucking + warehouse status
- Trucking company sees pre-filled documentation (cargo manifest, pickup instructions, hazmat info)
- Warehouse receives expected arrival details automatically
- Status progression visible to all parties

**Enhanced Timeline**
- Merges milestones, terminal schedules, and carrier events into one unified timeline
- Shows port terminal operating hours and cutoff times inline
- Detention clock starts automatically when applicable

### Technical Implementation

1. **Create `SmartBookingFlow` component** — new unified booking experience replacing fragmented pages
2. **Create `LogisticsSetupStep` component** — trucking + warehouse smart selection
3. **Create `ShipmentIntelligencePanel` component** — AI-powered alerts and suggestions for workspace
4. **Enhance `shipment-assistant` edge function** — add context about routes, detention, terminal schedules, carrier news
5. **Create `booking-intelligence` edge function** — AI-powered suggestions during booking (route risks, compliance requirements, logistics recommendations)
6. **Update workspace layout** — add intelligence panel at top, unified logistics tab

### What Won't Change
- Database schema (no new tables needed)
- Existing edge functions for draft creation, AES, documents
- Core shipment lifecycle logic
- Role-based access and routing
