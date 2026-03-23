

# Redesign "Trusted By" Section — Real Partner Logos with Scrolling Marquee

## What Changes

Replace the current flat initials-badge grid with a premium infinite-scrolling marquee featuring real company logos fetched as high-quality SVGs/PNGs from public logo CDNs (e.g., logo.clearbit.com or svgl.app).

## File: `src/components/marketing/TrustedBySection.tsx` (full rewrite)

### Visual Design
- **Dark contrast background** (`bg-[hsl(220,20%,8%)]`) to make the section pop between surrounding sections
- **Two-row infinite marquee** scrolling in opposite directions via CSS `@keyframes`
- Each logo displayed as an `<img>` tag inside a frosted glass pill (`backdrop-blur`, `border-white/10`, `bg-white/5`)
- Logos rendered in grayscale by default, full color on hover (`filter grayscale → none`)
- **Gradient fade edges** on left and right for seamless infinite-scroll illusion
- **Hover pauses** the marquee row for readability

### Logo Sources
Use publicly available logo URLs from Clearbit's Logo API (`https://logo.clearbit.com/:domain`):
- Maersk → `maersk.com`
- CMA CGM → `cma-cgm.com`
- Kuehne+Nagel → `kuehne-nagel.com`
- DHL → `dhl.com`
- Cargill → `cargill.com`
- COFCO → `cofcointernational.com`
- DB Schenker → `dbschenker.com`
- Hapag-Lloyd → `hapag-lloyd.com`
- Expeditors → `expeditors.com`
- MSC → `msc.com`

Each logo entry includes `name` (fallback text) and `logo` URL. Images use `object-contain`, fixed height (~28-32px), with the company name as alt text.

### Marquee Implementation
- Pure CSS animation: two copies of each row placed side-by-side, translating `-50%` over ~30s
- Row 1 scrolls left, Row 2 scrolls right
- `hover:animation-play-state: paused` on each row
- Custom `@keyframes scroll` and `@keyframes scroll-reverse` added as inline style or Tailwind arbitrary values

### Heading
- Keep the "Industry Partners" pill badge and heading
- Update subtitle to: **"Ship with the world's leading carriers and commodity traders — all through one platform"**

### Responsive
- Single row on mobile (`md:` breakpoint splits into two rows)
- Smaller logo height on mobile (24px vs 32px)

