import type {
  PromoHandlingRule, CustomerStrategyRule, LaneStrategyRule,
  ShipmentTypeRule, ProfitProtectionRule, AiBoundary,
  ApprovalEscalationRule, PricingRuleTemplate,
} from "./types";

export const DEFAULT_PROMO_RULE: PromoHandlingRule = {
  id: "promo-default",
  name: "Standard Promo Handling",
  isActive: true,
  promoDetectionThreshold: 12,
  historicalLookbackDays: 90,
  defaultAction: "balanced",
  minSavingsRetention: 60,
  maxPassThrough: 40,
  minRetainedProfit: 150,
  allowAggressiveForStrategic: true,
};

export const DEFAULT_CUSTOMER_RULES: CustomerStrategyRule[] = [
  { id: "cs-new", segment: "new", label: "New Customer", isActive: true, defaultPricingMode: "balanced", maxPassThrough: 20, minRetainedProfit: 180, minMarginFloor: 8, discountAllowed: false, notes: "Cautious pricing — protect margin on unproven accounts" },
  { id: "cs-existing", segment: "existing", label: "Existing Customer", isActive: true, defaultPricingMode: "balanced", maxPassThrough: 30, minRetainedProfit: 150, minMarginFloor: 6, discountAllowed: true, notes: "Standard pricing with moderate flexibility" },
  { id: "cs-high-vol", segment: "high_volume", label: "High Volume", isActive: true, defaultPricingMode: "win_rate", maxPassThrough: 40, minRetainedProfit: 120, minMarginFloor: 5, discountAllowed: true, notes: "Volume justifies tighter margins if lifetime value is strong" },
  { id: "cs-strategic", segment: "strategic", label: "Strategic Account", isActive: true, defaultPricingMode: "strategic", maxPassThrough: 50, minRetainedProfit: 100, minMarginFloor: 4, discountAllowed: true, notes: "Maximum flexibility with approval guardrails" },
];

export const DEFAULT_LANE_RULES: LaneStrategyRule[] = [
  { id: "lane-asia-us", name: "Asia → US West Coast", tradeLane: "ASIA-USWC", competitionLevel: "high", isGrowthLane: false, isActive: true, defaultPricingMode: "win_rate", targetMargin: 7, promoRetention: 55, maxPassThrough: 45, strategicPricingAllowed: true, approvalThreshold: 100 },
  { id: "lane-asia-eu", name: "Asia → Europe", tradeLane: "ASIA-EUR", competitionLevel: "normal", isGrowthLane: true, isActive: true, defaultPricingMode: "strategic", targetMargin: 9, promoRetention: 65, maxPassThrough: 35, strategicPricingAllowed: true, approvalThreshold: 120 },
  { id: "lane-eu-us", name: "Europe → US East Coast", tradeLane: "EUR-USEC", competitionLevel: "normal", isGrowthLane: false, isActive: true, defaultPricingMode: "balanced", targetMargin: 8, promoRetention: 70, maxPassThrough: 30, strategicPricingAllowed: false, approvalThreshold: 150 },
];

export const DEFAULT_SHIPMENT_TYPE_RULES: ShipmentTypeRule[] = [
  { id: "st-fcl", mode: "fcl", label: "FCL", minMargin: 5, targetMargin: 8, stretchMargin: 12, promoHandling: "max_profit", minRetainedProfit: 150, approvalBelowMin: true },
  { id: "st-lcl", mode: "lcl", label: "LCL", minMargin: 10, targetMargin: 17, stretchMargin: 25, promoHandling: "balanced", minRetainedProfit: 80, approvalBelowMin: true },
  { id: "st-air", mode: "air", label: "Air Freight", minMargin: 8, targetMargin: 13, stretchMargin: 20, promoHandling: "balanced", minRetainedProfit: 120, approvalBelowMin: true },
  { id: "st-trucking", mode: "trucking", label: "Trucking", minMargin: 5, targetMargin: 9, stretchMargin: 14, promoHandling: "win_rate", minRetainedProfit: 60, approvalBelowMin: false },
];

export const DEFAULT_PROFIT_PROTECTION: ProfitProtectionRule = {
  minNetMarginByType: { fcl: 5, lcl: 10, air: 8, trucking: 5 },
  minRetainedProfitByType: { fcl: 150, lcl: 80, air: 120, trucking: 60 },
  minDollarProfitPerShipment: 50,
  maxNetworkPayoutPercent: 40,
  maxTotalDiscount: 500,
  breakEvenProtection: true,
};

export const DEFAULT_AI_BOUNDARIES: AiBoundary = {
  allowFullRetention: true,
  allowPartialPassThrough: true,
  allowAggressiveStrategic: false,
  allowAutoApply: false,
  requireApprovalBelowThreshold: true,
  lowConfidenceThreshold: 50,
  medConfidenceThreshold: 70,
  highConfidenceThreshold: 85,
};

export const DEFAULT_APPROVAL_RULES: ApprovalEscalationRule[] = [
  { id: "esc-1", name: "Low retained profit", isActive: true, condition: "Platform retained profit below threshold", conditionType: "retained_profit", thresholdValue: 100 },
  { id: "esc-2", name: "High pass-through", isActive: true, condition: "Customer pass-through exceeds limit", conditionType: "pass_through", thresholdValue: 50 },
  { id: "esc-3", name: "Large discount", isActive: true, condition: "Total discount exceeds maximum", conditionType: "discount", thresholdValue: 400 },
  { id: "esc-4", name: "Low AI confidence", isActive: true, condition: "AI confidence score below threshold", conditionType: "confidence", thresholdValue: 60 },
  { id: "esc-5", name: "New customer promo sharing", isActive: true, condition: "New customer receives promo savings above limit", conditionType: "new_customer_promo", thresholdValue: 15 },
];

export const RULE_TEMPLATES: PricingRuleTemplate[] = [
  { id: "tpl-1", name: "Max Profit on Promo Rates", description: "Retain 90%+ of carrier promo savings as platform profit", category: "promo", icon: "trending-up" },
  { id: "tpl-2", name: "Balanced Promo Sharing", description: "Split promo savings 60/40 between platform and customer", category: "promo", icon: "scale" },
  { id: "tpl-3", name: "Strategic Account Growth", description: "Allow aggressive pricing for target accounts with profit floor", category: "customer", icon: "target" },
  { id: "tpl-4", name: "High Competition Lane Defense", description: "Use partial pass-through to maintain win rate on competitive lanes", category: "lane", icon: "shield" },
  { id: "tpl-5", name: "High Demand Margin Protection", description: "Retain maximum margin on high-demand routes", category: "lane", icon: "lock" },
  { id: "tpl-6", name: "New Customer Controlled Discount", description: "Limited discount allowed for first shipment only", category: "customer", icon: "user-plus" },
  { id: "tpl-7", name: "Volume Customer Flexible Pricing", description: "More margin flexibility for high-volume customers", category: "customer", icon: "users" },
  { id: "tpl-8", name: "Air Freight Premium Protection", description: "Protect premium margins on urgent air shipments", category: "shipment_type", icon: "plane" },
];

export const PRICING_MODE_LABELS: Record<string, string> = {
  max_profit: "Max Profit",
  balanced: "Balanced",
  win_rate: "Win Rate Optimized",
  strategic: "Strategic Growth",
  ai_decide: "AI Decides (within limits)",
};
