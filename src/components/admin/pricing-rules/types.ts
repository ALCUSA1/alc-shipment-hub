export type PricingMode = "max_profit" | "balanced" | "win_rate" | "strategic" | "ai_decide";
export type CustomerSegment = "new" | "existing" | "high_volume" | "strategic";
export type ShipmentMode = "fcl" | "lcl" | "air" | "trucking";

export interface PromoHandlingRule {
  id: string;
  name: string;
  isActive: boolean;
  promoDetectionThreshold: number; // % below historical avg
  historicalLookbackDays: number;
  defaultAction: PricingMode;
  minSavingsRetention: number; // %
  maxPassThrough: number; // %
  minRetainedProfit: number; // $
  allowAggressiveForStrategic: boolean;
}

export interface CustomerStrategyRule {
  id: string;
  segment: CustomerSegment;
  label: string;
  isActive: boolean;
  defaultPricingMode: PricingMode;
  maxPassThrough: number;
  minRetainedProfit: number;
  minMarginFloor: number;
  discountAllowed: boolean;
  notes: string;
}

export interface LaneStrategyRule {
  id: string;
  name: string;
  tradeLane: string;
  competitionLevel: "low" | "normal" | "high";
  isGrowthLane: boolean;
  isActive: boolean;
  defaultPricingMode: PricingMode;
  targetMargin: number;
  promoRetention: number;
  maxPassThrough: number;
  strategicPricingAllowed: boolean;
  approvalThreshold: number;
}

export interface ShipmentTypeRule {
  id: string;
  mode: ShipmentMode;
  label: string;
  minMargin: number;
  targetMargin: number;
  stretchMargin: number;
  promoHandling: PricingMode;
  minRetainedProfit: number;
  approvalBelowMin: boolean;
}

export interface ProfitProtectionRule {
  minNetMarginByType: Record<ShipmentMode, number>;
  minRetainedProfitByType: Record<ShipmentMode, number>;
  minDollarProfitPerShipment: number;
  maxNetworkPayoutPercent: number;
  maxTotalDiscount: number;
  breakEvenProtection: boolean;
}

export interface AiBoundary {
  allowFullRetention: boolean;
  allowPartialPassThrough: boolean;
  allowAggressiveStrategic: boolean;
  allowAutoApply: boolean;
  requireApprovalBelowThreshold: boolean;
  lowConfidenceThreshold: number;
  medConfidenceThreshold: number;
  highConfidenceThreshold: number;
}

export interface ApprovalEscalationRule {
  id: string;
  name: string;
  isActive: boolean;
  condition: string; // human-readable
  conditionType: "retained_profit" | "pass_through" | "discount" | "confidence" | "new_customer_promo";
  thresholdValue: number;
}

export interface PricingRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export interface SimulationInput {
  carrierBuyRate: number;
  shipmentType: ShipmentMode;
  customerType: CustomerSegment;
  tradeLane: string;
  promoDetected: boolean;
  competitionLevel: "low" | "normal" | "high";
  urgency: "standard" | "priority" | "urgent";
}

export interface SimulationOutput {
  rulesFired: string[];
  pricingMode: PricingMode;
  savingsRetained: number;
  savingsPassedThrough: number;
  resultingSellPrice: number;
  resultingPlatformProfit: number;
  approvalRequired: boolean;
  reasoning: string[];
}
