

## Plan: Replace Nav "Start a Shipment" with "Sign Up"

### Rationale
The hero section already has a prominent "Start a Shipment" CTA. The nav button should serve a different purpose — direct account creation — giving users two distinct entry points: action-first (hero) and account-first (nav).

### Changes

**File: `src/components/marketing/MarketingNav.tsx`**
- Change the "Start a Shipment" button text to "Sign Up"
- Link it to `/sign-up` instead of opening the `StartShipmentModal`
- Remove the `StartShipmentModal` state and import since it's no longer used here
- Apply this change to both desktop and mobile nav versions

### Result
- Nav: **Log In** (ghost) + **Sign Up** (electric) — standard SaaS pattern
- Hero: **Start a Shipment** (electric) + **Book a Demo** (outline) — action-oriented CTAs
- No redundant buttons visible simultaneously

