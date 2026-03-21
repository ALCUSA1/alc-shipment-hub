

## Plan: Hybrid Monetization — Amazon + YouTube Model

Implementing a three-pillar revenue model: marketplace commissions on transactions, freemium subscription tiers for platform access, and promoted/boosted content in the community feed.

---

### Pillar 1: Subscription Tiers (YouTube Model — Freemium)

**Create Stripe products and a Pricing page** with three tiers:

| | Starter (Free) | Pro ($99/mo) | Enterprise ($299/mo) |
|---|---|---|---|
| Shipments/mo | 5 | Unlimited | Unlimited |
| Rate searches | 10/mo | Unlimited | Unlimited |
| Document generation | 3/mo | Unlimited | Unlimited |
| Community posts | 2/mo | Unlimited | Unlimited |
| Analytics | Basic | Advanced | Custom reports |
| Partner network | View only | Full access | Priority matching |
| Support | Community | Priority email | Dedicated rep |
| Boosted posts | — | 3/mo included | Unlimited |

**Files to create:**
- `src/pages/Pricing.tsx` — tier comparison table, FAQ accordion, CTA
- `supabase/functions/create-checkout/index.ts` — Stripe checkout session
- `supabase/functions/check-subscription/index.ts` — verify active subscription + tier
- `supabase/functions/customer-portal/index.ts` — manage subscription via Stripe portal

**Files to modify:**
- `src/contexts/AuthContext.tsx` — add subscription state (tier, status, end date)
- `src/components/marketing/MarketingNav.tsx` — add "Pricing" link
- `src/App.tsx` — register `/pricing` route

---

### Pillar 2: Marketplace Commissions (Amazon Model)

**Add a platform fee layer to the existing Stripe Connect payment flow.** The `AdminPaymentSettings` already supports configurable platform fees — this pillar surfaces that value to users.

- `src/components/marketing/MarketingFeesSection.tsx` — transparent fee breakdown section on Pricing page showing: "2.5% platform fee on transactions — no hidden markups"
- Gate premium payment features (saved ACH, multi-currency) behind Pro/Enterprise tiers

---

### Pillar 3: Promoted Content (Ad Revenue)

**Add "Boost Post" functionality to the Community feed.**

**Database migration:**
- Add columns to `feed_posts`: `is_boosted boolean default false`, `boost_expires_at timestamptz`, `boost_tier text` (standard/premium)
- Create `boost_purchases` table to track boost transactions

**Files to create:**
- `src/components/community/BoostPostDialog.tsx` — boost options (Standard $25/7 days, Premium $75/30 days)
- `supabase/functions/create-boost/index.ts` — Stripe one-time payment for boost

**Files to modify:**
- `src/pages/Community.tsx` — show boosted posts at top of feed with "Promoted" badge, add boost button on own posts

---

### Pillar 4: Landing Page Value Messaging

**Show users exactly why the platform saves them money.**

- `src/components/marketing/ValuePropositionSection.tsx` — 3 cards: "No Broker Markup", "Free Tier Available", "Transparent 2.5% Fee"
- Add to `Index.tsx` after `PlatformStatsSection`
- Link to `/pricing` from the hero CTA area

---

### Technical Details

- Stripe products/prices created via Stripe tools (Pro: `$99/mo`, Enterprise: `$299/mo`)
- Subscription state stored in AuthContext, checked on login + every 60s
- Feature gating via a `useSubscription()` hook that returns tier + limits
- Boosted posts use Stripe one-time payments, not subscriptions
- All edge functions use existing `STRIPE_SECRET_KEY` secret

### Implementation Order
1. Create Stripe products/prices
2. Build subscription edge functions
3. Add subscription state to AuthContext
4. Build Pricing page with tier table
5. Add boost post flow to Community
6. Add value proposition section to landing page
7. Wire feature gating across the app

