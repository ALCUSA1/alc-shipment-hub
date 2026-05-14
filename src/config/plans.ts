// Plan + Stripe price configuration. Used by Pricing, ChoosePlan, Subscribe and edge functions.
export type PlanId = "solo" | "team" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthly: number; // USD whole dollars (display)
  annual: number;
  perShipmentCents: number;
  stripePriceMonthly: string | null; // null = sales-led / no Stripe price
  stripePriceAnnual: string | null;
  selfServe: boolean; // false = sales-led only
}

export const PLANS: Record<PlanId, PlanConfig> = {
  solo: {
    id: "solo",
    name: "Solo",
    monthly: 299,
    annual: 1990,
    perShipmentCents: 5900,
    stripePriceMonthly: "price_1TWzZp8jG2mKZ6OJ8h1EHuFQ",
    stripePriceAnnual: "price_1TWziU8jG2mKZ6OJiF7Idsyv",
    selfServe: true,
  },
  team: {
    id: "team",
    name: "Team",
    monthly: 599,
    annual: 4990,
    perShipmentCents: 5900,
    stripePriceMonthly: "price_1TWzkC8jG2mKZ6OJV0ToUyyO",
    stripePriceAnnual: "price_1TX09r8jG2mKZ6OJV2SFusVm",
    selfServe: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthly: 1499,
    annual: 12990,
    perShipmentCents: 4900,
    stripePriceMonthly: null,
    stripePriceAnnual: null,
    selfServe: false,
  },
};

export const TRIAL_DAYS = 14;

export function getStripePriceId(planId: PlanId, interval: BillingInterval): string | null {
  const p = PLANS[planId];
  return interval === "annual" ? p.stripePriceAnnual : p.stripePriceMonthly;
}
