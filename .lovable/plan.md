

# Cogoport Homepage Analysis — Replicable Features

## What Cogoport Does Well (from the screenshot + live site)

### 1. Hero with Embedded Rate Search
Instead of a generic hero with just text and a CTA button, Cogoport embeds the **rate search form directly in the hero section**. The user lands on the homepage and can immediately search rates without navigating anywhere. This is the single highest-impact conversion pattern on their site.

**Your current state**: Hero has text + "Start Shipping" button. Rate search exists at `/rates` but is a separate page.

### 2. Streamlined 4-Step "How It Works"
Cogoport uses 4 clear steps: **Discover Rates → Book & Ship → Track & Manage Docs → Pay & Complete**. Each step has a visual image alongside it.

**Your current state**: 7-step workflow that's too granular for a marketing page.

### 3. Guaranteed Bookings / Assured Service Section
A "CogoAssured" section highlighting reliability guarantees, freight contracts, spot booking, pay later, and rewards — presented as a feature grid with icons and descriptions.

**Your current state**: No equivalent trust/assurance section.

### 4. Service Mode Tabs
Cogoport shows service categories as clickable tabs: FCL, LCL, Air, Rail, Trailer, FTL, LTL, Customs, CFS, Handling — making it clear they cover all modes.

**Your current state**: Category section exists but doesn't use the same tab-style presentation.

### 5. Focus Lanes with Route-Specific CTAs
Cogoport shows specific trade lanes (China → India, Vietnam → India) with direct links to rate pages for those routes.

**Your current state**: FocusLanesSection exists but links to `/signup` instead of pre-filled rate searches.

---

## Implementation Plan

### Step 1 — Embed Rate Search in Hero
Move the rate search form into the hero section of the homepage. Keep the existing `/rates` page but make the hero the primary entry point. When a user searches from the hero, redirect to `/rates` with query params pre-filled.

**Files**: Edit `HeroSection.tsx` to embed a compact `RateSearchForm` variant, or add a mini search bar (origin, destination, container dropdown, "Search Rates" button) that navigates to `/rates?origin=X&dest=Y`.

### Step 2 — Simplify "How It Works" to 4 Steps
Condense the 7-step workflow into 4 steps matching the Cogoport pattern:
1. **Discover Rates** — Search and compare instant pricing
2. **Book & Ship** — Confirm booking with guaranteed reliability
3. **Track & Manage** — Real-time tracking with automated documents
4. **Pay & Complete** — Flexible payment options

**Files**: Edit `WorkflowSection.tsx` — replace the 7 steps array with 4 steps, update layout to a 2x2 grid or horizontal cards instead of vertical list.

### Step 3 — Add Service Assurance Section
New section highlighting platform guarantees: Verified Partners, Freight Contracts, Spot Booking, Flexible Payments. Positioned between the workflow and features sections.

**Files**: New `ServiceAssuranceSection.tsx` component, add to `Index.tsx`.

### Step 4 — Link Focus Lanes to Pre-filled Rate Search
Update `FocusLanesSection.tsx` so each lane links to `/rates?origin=CNSGH&destination=USLAX` instead of `/signup`, giving users instant value.

**Files**: Edit `FocusLanesSection.tsx` — change link targets.

### Step 5 — Add Service Mode Tabs
Add a horizontal row of service mode pills/tabs (FCL, Air, LCL, Trucking, Warehousing, Customs) that link to relevant pages or filter content. Can be added near the hero or as part of the category section.

**Files**: Edit `CategorySection.tsx` or add to hero area.

---

## Technical Details

| Feature | Files | Complexity |
|---------|-------|-----------|
| Hero rate search | Edit `HeroSection.tsx`, `RateSearch.tsx` (accept URL params) | Medium |
| 4-step workflow | Edit `WorkflowSection.tsx` | Low |
| Service assurance | New `ServiceAssuranceSection.tsx`, edit `Index.tsx` | Low |
| Focus lanes → rate search | Edit `FocusLanesSection.tsx` | Low |
| Service mode tabs | Edit `CategorySection.tsx` | Low |

No database changes required. All features work with existing data.

