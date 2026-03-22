

## Integrate Real Shipping Line APIs (Replacing e2open)

There are several proven alternatives to e2open/INTTRA for pulling shipment data directly from shipping lines. Here's a comparison and implementation plan.

### Available Alternatives

| Provider | Coverage | What You Get | Cost |
|----------|----------|-------------|------|
| **DCSA Track & Trace** | 9 major carriers (Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, Evergreen, ZIM, HMM, Yang Ming) | Standardized container tracking events across carriers via one API spec | Free standard; carrier-specific API keys needed |
| **Direct Carrier APIs** | Per-carrier | Booking, tracking, schedules, cutoffs — deepest data | Free tier available (Maersk, CMA CGM have public APIs) |
| **Portcast / Vizion** | 100+ carriers | Unified tracking, ETA predictions, vessel schedules | Paid SaaS |
| **MarineTraffic / VesselFinder** | AIS-based vessel tracking | Real-time vessel positions, port calls | Paid per-call |

### Recommended Approach: Direct Carrier APIs + DCSA Fallback

The most practical and cost-effective approach is to integrate the **top 4 carrier APIs directly** (Maersk, MSC, CMA CGM, Hapag-Lloyd cover ~60% of global container volume) and use the **DCSA standard format** as the common data model so all carriers map to the same internal structure.

### Implementation Plan

#### 1. Create a unified carrier API adapter (`supabase/functions/track-shipment/index.ts`)
Replace the current placeholder functions with real API calls:
- **Maersk**: `api.maersk.com/track-and-trace` (free API key via Maersk Developer Portal)
- **CMA CGM**: `api-portal.cma-cgm.com` Track & Trace API (free registration)
- **MSC**: `digital.msc.com` tracking API
- **Hapag-Lloyd**: `api.hlag.com` tracking endpoint

Each adapter returns a common `TrackingResult[]` format (already defined in the codebase).

#### 2. Refactor `e2open-sync` into a `carrier-sync` function
- Replace the single e2open endpoint with a carrier-routing layer that picks the correct API based on the shipment's carrier field
- Preserve the same database update logic (tracking_events, shipment status, cutoffs, voyage legs)
- Add a `carrier_api_source` field to tracking events so users know where data came from

#### 3. Add carrier API keys as secrets
- Each carrier API requires its own key. We'll use the secrets tool to configure:
  - `MAERSK_API_KEY`
  - `CMA_CGM_API_KEY`
  - `HAPAG_LLOYD_API_KEY`
  - `MSC_API_KEY`

#### 4. Update the LiveTrackingPanel UI
- Show which carrier API is being used for tracking
- Display a "last synced" timestamp
- Add carrier-specific status badges

#### 5. Fallback chain
If a carrier's direct API is unavailable or unconfigured, fall back gracefully:
```text
Direct Carrier API → e2open (if key configured) → Manual entry
```

### What stays the same
- All existing database tables, RLS policies, and tracking_events schema
- The milestone-to-status mapping logic
- The AI summary and smart banners (they consume the same data regardless of source)
- The bulk tracking cron mode

### Technical Details

- Each carrier adapter is a simple async function that calls the carrier's REST API, parses the response, and maps it to the existing `TrackingResult` interface
- DCSA event codes (e.g., `ARRI`, `DEPA`, `LOAD`) will be mapped to the existing milestone labels
- Rate limiting will respect each carrier's API quotas
- Error handling will log failures per-carrier without blocking other carriers

