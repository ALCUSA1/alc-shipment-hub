

## About Page Visual Upgrade

The current About page is functional but flat. Here's a plan to elevate it to match the premium SaaS aesthetic used across the rest of the site.

### Changes Overview

**1. Hero Section -- Add depth and visual punch**
- Add a subtle animated gradient mesh or secondary radial gradient layer
- Introduce a decorative grid/dot pattern overlay for texture
- Add a thin glowing divider line below stats
- Animate stat numbers with a count-up effect using framer-motion

**2. Our Story -- Two-column layout with accent**
- Split into a left-aligned heading column and right-aligned text column on desktop
- Add a vertical electric-blue accent bar beside the heading
- Pull-quote styling for "We don't just move goods" with larger italic text

**3. History Timeline -- Polish the alternating cards**
- Add connecting dots on the vertical line at each milestone node
- Add subtle hover scale/glow effect on cards
- Stagger entrance animations with ScrollReveal delays

**4. Mission Section -- Make it a full-width navy banner**
- Convert from plain white background to a navy section with radial gradient (matching hero style)
- Larger icon with a glowing ring effect
- White text on dark for visual rhythm (alternating dark/light sections)

**5. Core Values -- Glass-morphism cards**
- Add a subtle gradient background or glass-blur effect to cards
- Icon housed in a rounded electric/10 background circle
- Add hover lift animation (translateY + shadow increase)

**6. Leadership -- Larger photos with overlay style**
- Increase photo size to 28x28 (112px) with a subtle ring/border in electric blue
- Add a navy gradient overlay on the card bottom for name/role
- Hover effect that slightly scales the photo

**7. CTA Section -- Add floating decorative elements**
- Add subtle floating shapes or a second radial gradient blob
- Pill-style buttons with slight shadow

**8. General Polish**
- Ensure consistent section rhythm (alternating bg-background / bg-navy / bg-muted)
- Add `motion.div` fade-in transitions where ScrollReveal isn't used

### Technical Approach
- All changes in `src/pages/About.tsx` only
- Uses existing design tokens (navy, electric, muted, etc.)
- Uses existing `ScrollReveal` and `framer-motion` already in the project
- No new dependencies needed

