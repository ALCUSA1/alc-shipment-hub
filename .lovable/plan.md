## Goal

After signup, every new user picks a plan (Solo / Team / Enterprise) and starts a **14-day free trial without entering a card**. When the trial ends, the portal is locked until they subscribe via Stripe Checkout. Enterprise is sales-led; Solo and Team are self-serve. Per-shipment fees ($59 / $49) are charged automatically per booking using the card on file once subscribed.

## User flow

1. **Pricing page (`/pricing`)** — CTA on each plan card stores the selected plan slug (`solo` / `team` / `enterprise`) in `sessionStorage` and routes to `/signup`.
2. **Signup** — unchanged auth (email + password, Google). After email verification and login, the user is routed to `/choose-plan` instead of straight to the portal.
3. **Choose plan screen (new `/choose-plan`)** — shows the 3 plans, preselects whatever was stored from Pricing.
   - **Solo / Team** → "Start 14-day free trial" button. Creates a `subscriptions` row with `status = 'trialing'`, `trial_ends_at = now() + 14 days`, `plan = solo|team`. No card collected.
   - **Enterprise** → "Talk to sales" button. Opens a contact form / mailto and creates a `sales_leads` row; account stays in `trialing` on Team-equivalent access until sales activates it.
4. **Portal access gate** — a `SubscriptionGate` wrapper on portal routes checks the user's subscription:
   - `trialing` and `trial_ends_at > now()` → allow, show banner "X days left in trial — Subscribe".
   - `active` → allow, no banner.
   - `trialing` expired or `canceled` / null → redirect to `/subscribe` (locked screen with Stripe Checkout button + Talk to Sales for Enterprise).
5. **Subscribe** — `/subscribe` calls a `create-checkout` edge function that opens Stripe Checkout in a new tab for the user's plan. On success Stripe redirects to `/subscribe/success`, which calls `check-subscription` to refresh state, then routes to the portal.
6. **Per-shipment fee** — when a booking is confirmed, a `charge-shipment-fee` edge function charges the saved card via Stripe (off-session PaymentIntent on the customer's default payment method) for $59 (Solo) or $49 (Team). Enterprise = custom, skipped or invoiced separately.

## Database changes (one migration)

- New table `public.subscriptions`:
  - `id`, `user_id` (unique, FK auth.users), `company_id` (nullable),
  - `plan` enum (`solo`, `team`, `enterprise`),
  - `billing_interval` (`monthly`, `annual`),
  - `status` (`trialing`, `active`, `past_due`, `canceled`, `incomplete`),
  - `trial_ends_at`, `current_period_end`,
  - `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`,
  - `per_shipment_fee_cents`, timestamps.
  - RLS: user can read own row; only service_role can insert/update.
- New table `public.sales_leads` for Enterprise inquiries (`user_id`, `company_name`, `notes`, `status`, RLS: own + admin).
- Trigger on signup (extend `handle_new_user`) inserts a `subscriptions` row with `status = 'trialing'`, `trial_ends_at = now() + 14 days`, `plan = NULL` (filled in on `/choose-plan`).

## Frontend changes

- `src/pages/Pricing.tsx` — CTAs write `selectedPlan` + `billingInterval` to `sessionStorage`, link to `/signup`.
- `src/pages/SignUp.tsx` — after success, route to `/choose-plan` (instead of `/login` or portal).
- `src/pages/ChoosePlan.tsx` (new) — plan picker, "Start free trial" / "Talk to sales".
- `src/pages/Subscribe.tsx` (new) — locked-state screen with Stripe Checkout button.
- `src/pages/SubscribeSuccess.tsx` (new) — verifies and redirects.
- `src/components/auth/SubscriptionGate.tsx` (new) — wraps portal routes; reads `subscriptions` row, enforces gate, renders trial banner.
- `src/App.tsx` — register `/choose-plan`, `/subscribe`, `/subscribe/success`; wrap portal routes with `SubscriptionGate`.
- `src/contexts/AuthContext.tsx` (or equivalent) — fetch subscription on auth change, expose `subscription` + `daysLeftInTrial`.

## Stripe / edge functions

- Create Stripe products + monthly & annual prices for **Solo** and **Team** via the Stripe MCP (Enterprise = no Stripe price, sales-led). Hardcode the resulting `price_id`s in a `src/config/plans.ts` map.
- New edge functions (in `supabase/functions/`):
  - `create-checkout` — creates a Stripe Checkout Session in `subscription` mode for the chosen plan + interval, attaches `user_id` in metadata.
  - `check-subscription` — reads Stripe subscription by customer email, upserts `public.subscriptions` row, returns status. Called on auth change and on `/subscribe/success`.
  - `charge-shipment-fee` — called server-side when a shipment is booked; charges per-shipment fee off-session.
  - (Optional later) `customer-portal` — for plan changes / cancel.
- All four use `STRIPE_SECRET_KEY` (already configured) and `npm:` specifiers.

## Out of scope (for this plan)

- Annual vs monthly toggle wiring on `/choose-plan` (will mirror Pricing toggle).
- Webhook-based reconciliation — using polling via `check-subscription` for now per Lovable Stripe convention.
- Actually invoicing Enterprise per-shipment fees.
- Refund / proration UX.

## Open question to confirm before build

Stripe products & prices — okay to create them now with these amounts: Solo $299/mo or $2,990/yr, Team $599/mo or $5,990/yr (matches the current `/pricing` page)? Enterprise stays sales-led with no Stripe price.
