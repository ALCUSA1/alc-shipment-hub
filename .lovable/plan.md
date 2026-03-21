

## Plan: Enhance Marketing Landing Page with Cogoport-Inspired Sections

### What We're Building

Four new marketing sections for the homepage, inspired by Cogoport's approach to social proof and conversion:

1. **Trusted By Logo Bar** -- A horizontal row of client/partner logos below the hero, with a subtle grayscale treatment and a heading like "Trusted by leading shippers worldwide"

2. **Live Platform Stats** -- Animated counters showing key metrics (e.g., "5,000+ Shipments Coordinated", "40+ Countries", "97% On-Time Rate", "500+ Active Users") using count-up animations on scroll

3. **Industries Served Section** -- A grid of 6-8 industry cards (Agriculture, Pharma, Electronics, Textiles, Automotive, FMCG, Chemicals, Mining) with icons and brief descriptions

4. **Focus Lanes / Popular Routes** -- A section showcasing 4-6 top trade corridors (e.g., "US to West Africa", "China to US", "Asia to Europe") as route cards with origin/destination flags and a CTA to get a quote

### Page Layout (updated order)

```text
HeroSection
TrustedBySection       ← NEW
PlatformStatsSection   ← NEW
ProblemSection
CategorySection
BeforeAfterSection
IndustriesSection      ← NEW
WorkflowSection
FeaturesSection
FocusLanesSection      ← NEW
PartnerAccessSection
SecuritySection
CTASection
```

### Files to Create

| File | Description |
|------|-------------|
| `src/components/marketing/TrustedBySection.tsx` | Grayscale logo carousel with 6-8 placeholder company logos |
| `src/components/marketing/PlatformStatsSection.tsx` | 4 animated stat counters using scroll-triggered count-up |
| `src/components/marketing/IndustriesSection.tsx` | Grid of industry cards with Lucide icons |
| `src/components/marketing/FocusLanesSection.tsx` | Trade lane route cards with origin/destination and CTA |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Import and insert 4 new sections in order shown above |

### Technical Details

- All sections use existing design patterns: `ScrollReveal` for entrance animations, `section-padding` / `container-narrow` classes, navy/electric/gray-light color tokens
- Platform stats will use a simple `useEffect` + `IntersectionObserver` count-up animation (no new dependencies)
- Trusted By logos will use placeholder SVG rectangles with company name text (can be replaced with real logos later)
- Focus Lanes cards link to `/signup` as a CTA since rate lookup isn't built yet
- No database changes required -- all static/demo content

