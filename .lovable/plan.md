

# Cogoport-Inspired Rate Results Enhancements

## What to Build

Five new UI patterns from the Cogoport screenshot that we don't yet have:

### 1. Sticky Price Sidebar
A persistent cost breakdown card showing Origin Local, Destination Local, FCL Freight, and Total. Sticks to the right side as the user scrolls through rate cards. On mobile, this becomes a fixed bottom bar showing the total.

**File**: New `src/components/rate-search/PriceSummarySidebar.tsx`
**Change in**: `RateResultsPanel.tsx` — wrap rate cards in a 2-column grid layout (cards left, sidebar right)

### 2. Sailing Schedule Selector
Weekly date range rows showing available sailing windows with prices per week. User picks a sailing week, which highlights the selected schedule. Shows "Sail By", "Transit time", and "Week of arrival" details below.

**File**: New `src/components/rate-search/SailingScheduleSelector.tsx`
**Change in**: `RateResultsPanel.tsx` — render above the rate cards, after summary header

### 3. Shipping Preferences Panel
A collapsible section with three preference controls:
- Direct vs. Transshipment toggle
- Carrier type preference (All / Major / NVOCC)
- Spot vs. Contract toggle

These filter the displayed rate cards client-side.

**File**: New `src/components/rate-search/ShippingPreferences.tsx`
**Change in**: `RateResultsPanel.tsx` — render below sailing schedule

### 4. Inline Cargo Summary (replace bottom form)
Replace the current bottom `CargoDetailsForm` with an inline compact cargo summary bar at the top (like Cogoport's "1 Ctr x 20ft Standard | 18 MT | Edit") with an edit popover. The "Edit" button opens a popover with the commodity/weight/container fields.

**File**: New `src/components/rate-search/CargoSummaryBar.tsx`
**Change in**: `RateResultsPanel.tsx` — replace `<CargoDetailsForm />` at bottom, add summary bar near top

### 5. Trust & Disclaimer Footer
A small text block below rate cards with tax disclaimer ("Total cost including taxes, local charges...") and a savings callout ("Looking for savings? Apply coupons in the next step").

**File**: Inline in `RateResultsPanel.tsx`

## Layout Change

Current layout is single-column. New layout:

```text
┌─────────────────────────────────────────────┐
│  Route Map                                  │
├─────────────────────────────────────────────┤
│  Summary Header (route, badges, range)      │
├─────────────────────────────────────────────┤
│  Cargo Summary Bar  [1x40HC | 18MT | Edit]  │
├─────────────────────────────────────────────┤
│  Sailing Schedule Selector                  │
├─────────────────────────────────────────────┤
│  Shipping Preferences (collapsible)         │
├──────────────────────────┬──────────────────┤
│  Rate Cards (left col)   │  Sticky Price    │
│  Card 1                  │  Sidebar (right) │
│  Card 2                  │  - Origin Local  │
│  Card 3                  │  - Dest Local    │
│                          │  - FCL Freight   │
│                          │  - Total         │
│                          │  [Book Now]      │
├──────────────────────────┴──────────────────┤
│  Trust Disclaimer Footer                    │
└─────────────────────────────────────────────┘
```

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/rate-search/PriceSummarySidebar.tsx` |
| Create | `src/components/rate-search/SailingScheduleSelector.tsx` |
| Create | `src/components/rate-search/ShippingPreferences.tsx` |
| Create | `src/components/rate-search/CargoSummaryBar.tsx` |
| Modify | `src/components/rate-search/RateResultsPanel.tsx` — new layout, integrate all components |
| Delete reference | Remove `CargoDetailsForm` import/usage (replace with `CargoSummaryBar`) |

No database changes needed. All filtering is client-side on existing `carrier_rates` data.

