## Goal

Replace the current SaaS pricing model (Solo / Team / Enterprise) with the **Milestone Subsidy** model from the uploaded mockup:

- **0–24 shipments/month**: standard rate, ALC earns $500/ship, agent earns $500/ship
- **25+ shipments/month**: ALC absorbs $200 subsidy → agent rate drops $3,000 → $2,800. Agent earns $700 (or passes savings to client)
- **50+ shipments/month**: $400 subsidy, agent rate $2,600. ALC restores margin via BCO carrier rates

No subscription fees. Monetization shifts to per-shipment margin only.

## 1. Public marketing page — rebuild `/pricing`

Convert the uploaded HTML into a polished React page using project tokens (replace raw hex colors with semantic Tailwind tokens, use shadcn `Card`, `Badge`, `Table`). Sections, in order:

1. Hero — "The $200 Carrier Subsidy Milestone" + sub
2. Before vs After comparison (2 cards)
3. Agent's two choices (pass to client / keep as profit)
4. "ALC Earns More After Milestone" table
5. "50 Agents at Milestone" platform-level dark stat panel
6. Second milestone (50 ships) table
7. Bottom KPI strip (6 stat tiles)
8. CTA → "Become an ALC Agent" → `/signup`

SEO: title "Agent Pricing — Volume-Based Subsidies | ALC", meta description.

## 2. Forwarder Portal — live milestone widget

New component `src/components/forwarder/MilestoneSubsidyWidget.tsx` mounted on `ForwarderDashboard`:

- Counts shipments for the forwarder's company in the **current calendar month** (`shipments` table, `company_id = forwarder's company`, `created_at >= start of month`)
- Shows current tier, progress bar to next milestone, current per-shipment rate, MTD earnings
- States: 0–24 (Building, progress to 25), 25–49 (Unlocked $200 subsidy, progress to 50), 50+ (Elite, $400 subsidy)
- "View pricing details" link → `/pricing`

## 3. Remove SaaS subscription gating

Files to retire / simplify:

- **Delete**: `src/pages/ChoosePlan.tsx`, `src/pages/Subscribe.tsx`, `src/pages/SubscribeSuccess.tsx`
- **Delete edge functions**: `create-checkout`, `check-subscription` (keep `charge-shipment-fee` if it's used for per-shipment billing — verify)
- **Simplify** `src/contexts/SubscriptionContext.tsx`: keep the file but make `hasAccess` always `true` and `needsPlanSelection` always `false`, so existing imports keep working without breaking the build. (Avoids touching every consumer in one pass.)
- **Update** `src/App.tsx`: remove `/choose-plan`, `/subscribe`, `/subscribe/success` routes; remove `SubscriptionGate` wrapping if present
- **Update** `src/pages/SignUp.tsx`: route to `/dashboard` (or role-routed home) instead of `/choose-plan`
- **Update** `.lovable/plan.md`: mark SaaS plan as deprecated, point to milestone model
- **Keep** `src/config/plans.ts` and `subscriptions` DB table untouched for now (no destructive DB changes — Stripe products stay dormant). Can be cleaned up later.

## 4. Nav & links

- Top nav already links to `/pricing` — content auto-updates
- Forwarder sidebar: no change needed (widget appears on dashboard)
- Footer: keep `/pricing` link

## Out of scope

- Actual computation of agent commissions / payouts (UI shows model; back-end accounting not built here)
- Migrating existing trialing/subscribed users (none in production yet per project state)
- Dropping the `subscriptions` table (preserved to avoid destructive migrations)
- Admin tooling to manually override an agent's tier

## Files touched

Create:
- `src/components/forwarder/MilestoneSubsidyWidget.tsx`

Rewrite:
- `src/pages/Pricing.tsx`

Edit:
- `src/App.tsx` (remove SaaS routes)
- `src/pages/SignUp.tsx` (redirect target)
- `src/contexts/SubscriptionContext.tsx` (always-allow shim)
- `src/pages/forwarder/ForwarderDashboard.tsx` (mount widget)
- `.lovable/plan.md` (deprecate SaaS section)

Delete:
- `src/pages/ChoosePlan.tsx`
- `src/pages/Subscribe.tsx`
- `src/pages/SubscribeSuccess.tsx`
- `supabase/functions/create-checkout/`
- `supabase/functions/check-subscription/`

## Confirm before build

Okay to proceed with this plan? Specifically: (a) deleting ChoosePlan/Subscribe pages and the two checkout edge functions, and (b) leaving the `subscriptions` DB table in place for now (no destructive migration).
