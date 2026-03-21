

# Cogoport Feature Analysis — What We Can Implement

## What Cogoport Offers (from the screenshots)

Based on the three uploaded PDFs (homepage, rate search, and rate results), Cogoport is a **self-service freight booking platform** for shippers. Key features observed:

### 1. Instant Rate Search (Hero Feature)
- Origin/destination port selector with mode tabs (FCL vs Air/LCL)
- Container size picker (20ft, 40ft, 40ft HC, 45ft HC)
- Container type selector (Standard/Dry, Open Top, Flat Rack, ISO Tank, Open Side)
- Weight per container and commodity input
- "Book Freight Now" — single CTA to search

### 2. Rate Results Page
- **Estimated price range** shown immediately (e.g. "$4,501/ctr - $5,157/ctr")
- Spot rate vs contract rate toggle
- Weekly rate calendar (rates by sailing week with transit times)
- Rate breakdown: Origin Local, Destination Local, FCL Freight, Total
- Shipping preferences: Direct vs Transshipment, carrier preference, spot vs own price

### 3. Value-Add Features
- **CogoAssured** — vetted partner guarantee program
- **Pay Later** — credit terms / BNPL for freight
- **CogoRewards** — loyalty points per shipment
- **Refer & Earn** — referral program
- **Freight Contracts** — lock in long-term rates

### 4. Marketing / Trust Elements
- Platform stats (30K+ shippers, 192 countries, 400K+ containers, 97% on-time B/L)
- Industry verticals served
- Focus lanes with specific route detail
- "How it Works" — 4-step flow

---

## What Your Platform Already Has
- Quote creation wizard with carrier rate selection
- Port selector, container types, cargo details
- Shipment workspace with full lifecycle management
- Rate trends page
- Trucking marketplace, warehouse coordination
- Multi-portal system (shipper, forwarder, carrier, warehouse, driver)

## Recommended Features to Implement (prioritized)

### A. Instant Rate Search Widget (High Impact)
Add a prominent rate search component — similar to Cogoport's hero — where users enter origin, destination, container size/type, and get instant estimated rates from your `shipment_rates` table. This replaces the current multi-step quote wizard for quick lookups.

**Scope**: New page or dashboard widget. Reuse existing `PortSelector`, add container config UI, query `shipment_rates` for matching lanes, display price range and weekly breakdown.

### B. Rate Breakdown Display
When viewing rates, show a structured cost breakdown: base freight, origin charges, destination charges, surcharges, total. Currently rates show as a single number — breaking them out builds trust and matches industry expectations.

**Scope**: Enhance `CarrierRateSelector` and quote detail views.

### C. Shipping Preferences Panel
Let users set preferences before booking: direct vs transshipment routing, preferred carriers, spot vs contract pricing. Filter rate results accordingly.

**Scope**: New filter component on quote/rate pages.

### D. Weekly Rate Calendar
Display rates organized by sailing week with transit times and arrival windows (like Cogoport's "$4,501 — 22 Mar - 27 Mar — 19 Days — arrival 06 Apr - 12 Apr"). Helps users pick optimal sailing dates.

**Scope**: New component using `shipment_rates` valid dates.

### E. "How It Works" Flow Update
Update the marketing page flow to match the 4-step pattern: Discover Rates → Book & Ship → Track & Manage Docs → Pay & Complete. Your existing `WorkflowSection` can be refined.

**Scope**: Content update to existing marketing component.

---

## Technical Approach

| Feature | Files to Create/Modify | Database Changes |
|---------|----------------------|-----------------|
| Rate Search Widget | New `src/pages/RateSearch.tsx`, new `src/components/rate-search/` components | None — queries existing `shipment_rates` |
| Rate Breakdown | Modify `CarrierRateSelector.tsx`, `NewQuote.tsx` | None — uses existing `surcharges` JSON |
| Shipping Preferences | New `src/components/shipment/ShippingPreferences.tsx` | Optional: new `user_preferences` table |
| Weekly Rate Calendar | New `src/components/rate-search/WeeklyRateCalendar.tsx` | None |
| How It Works | Modify `WorkflowSection.tsx` | None |

Estimated effort: 3-5 implementation messages depending on scope chosen.

