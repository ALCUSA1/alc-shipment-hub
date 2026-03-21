

# Cogoport Rate Results Page — Replicable Improvements

## What the Screenshot Shows

Cogoport's rate results page (USLAX → CNSGH) has several UI patterns our results panel lacks:

1. **Route visualization map** — A world map with origin/destination pins and a route line connecting them
2. **Rich route header** — Shows full city names ("Los Angeles" / "Shanghai") with port codes, mode badge (Ocean Freight), container badge (20ft Standard General), and transit time badge (Avg Transit: 19 Days)
3. **Estimated price range** prominently displayed ($4,501/ctr – $5,157/ctr) with helper text
4. **"Choose your shipment quote"** section with a Spot Rate card
5. **Cargo details form** — Commodity, number of containers, total weight per container, with a "Proceed" button to get an exact tailored quote

## What We Already Have
- Summary bar with price range and carrier count (good)
- Individual rate cards with cost breakdowns (good)
- Mode tabs in search form (good)

## What to Add

### 1. Route Header with City Names
Replace port codes in the summary bar with full city/port names. Use the `ports` data to resolve codes to names. Add mode/container/transit badges.

**File**: `RateResultsPanel.tsx` — update summary bar to show city names, add badges for mode and container type.

### 2. Route Map Visualization
Add an SVG world map showing origin and destination with a curved route line. Use approximate lat/lng for major ports to place pins.

**File**: New `RouteMapPreview.tsx` component, rendered above the summary bar in `RateResultsPanel.tsx`.

### 3. Cargo Details Form
Below the rate cards, add a "Get Exact Quote" form with commodity, number of containers, and weight fields. The "Proceed" button links to signup/new-shipment.

**File**: New section at bottom of `RateResultsPanel.tsx` or a new `CargoDetailsForm.tsx`.

### 4. Spot Rate Highlight
Add a "Spot Rate" label to the best-rate card, similar to Cogoport's "from $4,501/ctr" callout.

**File**: Update existing rate card in `RateResultsPanel.tsx`.

## Implementation Steps

| Step | Description | File(s) | Complexity |
|------|-------------|---------|------------|
| 1 | Route map SVG component | New `RouteMapPreview.tsx` | Medium |
| 2 | Enhanced route header with city names + badges | `RateResultsPanel.tsx` | Low |
| 3 | Cargo details form | `RateResultsPanel.tsx` | Low |
| 4 | Spot Rate label on best card | `RateResultsPanel.tsx` | Low |

### Technical Notes
- Port name resolution: Pass `ports` array as a prop to `RateResultsPanel`, or look up names from the rate data's origin/destination fields
- Route map: Use a lightweight inline SVG with approximate coordinates for ~20 major ports. No external map library needed
- Cargo form "Proceed" action: Link to `/signup` for unauthenticated users since this is a marketing conversion funnel

No database changes required.

