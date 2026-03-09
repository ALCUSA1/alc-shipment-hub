

# Air Shipment Capabilities — Implementation Plan

## Overview

The platform currently defaults all shipments to `mode: "ocean"`. A `mode` column already exists in the `shipments` table. We need to add "air" as a transport mode and adapt the entire workspace, routing, cargo, documents, rates, milestones, and detail page to support air freight workflows with airline-specific terminology and documents.

---

## What Changes

### 1. Database Schema Updates

Add air-specific columns to the `shipments` table:

```sql
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS mawb_number text,
  ADD COLUMN IF NOT EXISTS hawb_number text,
  ADD COLUMN IF NOT EXISTS airport_of_departure text,
  ADD COLUMN IF NOT EXISTS airport_of_destination text,
  ADD COLUMN IF NOT EXISTS iata_code_origin text,
  ADD COLUMN IF NOT EXISTS iata_code_destination text,
  ADD COLUMN IF NOT EXISTS aircraft_type text,
  ADD COLUMN IF NOT EXISTS routing_and_destination text,
  ADD COLUMN IF NOT EXISTS handling_information text,
  ADD COLUMN IF NOT EXISTS accounting_information text,
  ADD COLUMN IF NOT EXISTS chargeable_weight numeric,
  ADD COLUMN IF NOT EXISTS rate_class text,
  ADD COLUMN IF NOT EXISTS commodity_item_number text,
  ADD COLUMN IF NOT EXISTS nature_and_quantity text,
  ADD COLUMN IF NOT EXISTS declared_value_for_carriage numeric,
  ADD COLUMN IF NOT EXISTS declared_value_for_customs numeric,
  ADD COLUMN IF NOT EXISTS sci text; -- Security & cargo information
```

Add `airport` type to the `ports` table (or create a separate `airports` table):

```sql
-- Extend ports table to support airports
-- ports.type already has 'sea'; we add 'air'
INSERT INTO ports (code, name, country, type) VALUES
  ('JFK', 'John F. Kennedy Intl', 'US', 'air'),
  ('LAX', 'Los Angeles Intl', 'US', 'air'),
  -- ... seed common IATA airports
```

Add air-specific cargo fields:

```sql
ALTER TABLE public.cargo
  ADD COLUMN IF NOT EXISTS chargeable_weight numeric,
  ADD COLUMN IF NOT EXISTS rate_class text,
  ADD COLUMN IF NOT EXISTS pieces integer;
```

### 2. Mode Selector in BasicsSection

Add a **Mode** dropdown (Ocean / Air) to `BasicsSection.tsx` before the Type selector. When "air" is selected:

- Port labels change to "Airport of Origin" / "Airport of Destination"
- `PortSelector` filters to `type = 'air'` airports (IATA codes)
- Container section hides; replaced with **Piece/ULD** fields
- Vessel/voyage fields replaced with **Airline / Flight Number / MAWB**

### 3. Adaptive Routing Section

Update `RoutingSection.tsx` to accept a `mode` prop:

**Ocean mode** (current): Port of Loading, Port of Discharge, Vessel, Voyage, Feeder, ETD/ETA
**Air mode** (new): Airport of Departure, Airport of Destination, Airline, Flight Number, MAWB Number, ETD/ETA, Routing & Destination (multi-leg text), Handling Information

### 4. Adaptive Cargo Section

Update `CargoSection.tsx`:

**Ocean mode**: Containers (20GP, 40HC, etc.), VGM, Seal Numbers
**Air mode**: No containers. Instead show:
- Pieces (number of packages)
- Gross Weight (kg)
- Chargeable Weight (kg) — auto-calculated as max(gross, volumetric)
- Volumetric weight auto-calc: L × W × H / 6000 per piece
- Rate Class (M=Minimum, N=Normal, Q=Quantity, C=Specific Commodity)
- Nature & Quantity of Goods
- ULD details (optional, for consolidated shipments)

### 5. Air-Specific Documents

Add to `DocumentChecklist.tsx` and readiness engine:

| Document | Description |
|----------|-------------|
| **MAWB** (Master Air Waybill) | Issued by airline — equivalent to ocean MBL |
| **HAWB** (House Air Waybill) | Issued by forwarder — equivalent to ocean HBL |
| **Shipper's Letter of Instruction (SLI)** | Already exists for ocean, reuse |
| **Commercial Invoice** | Same as ocean |
| **Packing List** | Same as ocean |
| **Shipper's Declaration for DG** | For dangerous goods air cargo (IATA DGR) |
| **Known Shipper Declaration** | TSA security requirement |
| **Cargo Manifest** | Airline-generated on acceptance |

Auto-create document records based on mode when shipment is created.

### 6. Air Waybill Generation

New edge function `generate-air-waybill` that assembles HAWB data from shipment fields into the IATA standard AWB format:

- Shipper info, Consignee info
- Agent (forwarder) info with IATA code
- Airport of departure/destination (IATA codes)
- Flight/Date, Routing
- Pieces, Gross Weight, Chargeable Weight, Rate/Charge
- Nature & Quantity, Handling Information
- Declared values for carriage and customs
- Other charges (prepaid/collect split)

### 7. Airline Rate Integration

New edge function `fetch-air-rates` to pull rates from airline cargo APIs or aggregators:

- **Cargo.one API** — multi-airline rate aggregator with booking capability
- **WebCargo (by Freightos)** — another air cargo rate platform
- **Individual airline APIs** — Emirates SkyCargo, Lufthansa Cargo, etc.

Create a new `air_rates` table (or extend `carrier_rates` with mode filtering):

```sql
ALTER TABLE public.carrier_rates
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'ocean';
-- Existing ocean rates keep mode='ocean'
-- New air rates use mode='air' with carrier=airline name
```

New component `AirlineRateSelector.tsx` — similar to `CarrierRateSelector` but shows:
- Airline name, Flight frequency (daily/3x week)
- Rate per kg (minimum charge, normal rate, quantity breaks)
- Transit time (hours, not days)
- Fuel/security surcharges
- Space availability indicator

### 8. Air Booking Flow

New component `AirBookingPanel.tsx` (replaces `VesselBookingPanel` when mode=air):

- Pre-fill from selected airline rate
- MAWB number assignment (from airline on booking confirmation)
- Flight number and date
- Pieces / Weight acceptance
- Space confirmation status
- eAWB submission via API (electronic Air Waybill)

### 9. Air Milestones

Update `MILESTONES_ORDER` in `ShipmentDetail.tsx` for air:

```
Booking Confirmed → Cargo Received at Origin → Security Screening → Flight Departed → In Transit → Arrived at Destination → Customs Clearance → Delivered
```

### 10. Readiness Engine Updates

Update `computeReadiness()` in `shipment-dataset.ts` to return mode-appropriate document checklists:

**Air mode readiness**: HAWB, MAWB, Commercial Invoice, Packing List, SLI, Known Shipper Declaration, AES/ITN (if export)
**Ocean mode readiness**: Current list (Draft B/L, SI, Invoice, Packing List, etc.)

### 11. ShipmentDetail Mode Adaptation

Update `ShipmentDetail.tsx` sidebar to conditionally render:

- **Ocean**: CarrierRateSelector, VesselBookingPanel, CutoffTracker, DemurrageTracker, DetentionTimeline
- **Air**: AirlineRateSelector, AirBookingPanel (no cutoffs, no demurrage — air has different penalty structure)

Show MAWB/HAWB numbers prominently in the header for air shipments.

### 12. ShipmentDataset Type Extensions

Add air-specific fields to the dataset interface:

```typescript
// In routing section
airline: string;
flightNumber: string;
mawbNumber: string;
airportOfDeparture: string;
airportOfDestination: string;
handlingInformation: string;
routingAndDestination: string;

// In cargo
chargeableWeight: string;
rateClass: string;
pieces: string;
```

---

## Files Summary

| Area | New | Modified |
|------|-----|----------|
| Database | 1 migration (air columns on shipments, cargo, carrier_rates) | — |
| Dataset | — | `shipment-dataset.ts` (air fields + air readiness) |
| Basics | — | `BasicsSection.tsx` (mode selector) |
| Routing | — | `RoutingSection.tsx` (conditional air/ocean fields) |
| Cargo | — | `CargoSection.tsx` (conditional air/ocean layout) |
| Documents | — | `DocumentChecklist.tsx` (air doc types) |
| Rates | `AirlineRateSelector.tsx` | `carrier_rates` table (add mode column) |
| Booking | `AirBookingPanel.tsx` | `ShipmentDetail.tsx` (conditional panels) |
| AWB generation | `generate-air-waybill` edge fn | — |
| Air rates | `fetch-air-rates` edge fn | `config.toml` |
| Submission | — | `NewShipment.tsx` (persist air fields) |
| Milestones | — | `ShipmentDetail.tsx` (air milestone order) |
| Ports | 1 migration (seed airports) | `PortSelector.tsx` (filter by mode) |

---

## API Integration Points

| API | Purpose | Secret Needed |
|-----|---------|---------------|
| **Cargo.one** or **WebCargo** | Live airline rate quotes + booking | `AIR_CARGO_API_KEY` |
| **Airline eAWB APIs** | Electronic AWB submission | Per-airline credentials |
| **TSA Known Shipper** | Security validation | `TSA_API_KEY` (if applicable) |

These will require API keys to be configured before live integration works. The UI and data flow will be built first with the same pattern as the ocean carrier integration (functional with mock/manual data, ready for API activation).

