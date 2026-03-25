import { useMemo } from "react";
import type { SailingOption } from "@/pages/BookingFlow";
import type { ScoredSailing, PricePosition, SortKey, FilterKey } from "./types";

function assignLabel(s: ScoredSailing, allScored: ScoredSailing[]): string | undefined {
  const bestScore = Math.max(...allScored.map(x => x.sailing_score));
  const lowestPrice = Math.min(...allScored.map(x => x.total_rate));
  const fastestTransit = Math.min(...allScored.filter(x => x.transit_days).map(x => x.transit_days!));

  if (s.sailing_score === bestScore) return "Recommended";
  if (s.total_rate === lowestPrice) return "Best Price";
  if (s.transit_days && s.transit_days === fastestTransit) return "Fastest";
  if (s.sailing_score >= bestScore * 0.85) return "Best Value";
  if (s.free_time_days && s.free_time_days >= 14) return "Reliable Option";
  return undefined;
}

function assignReason(label?: string): string | undefined {
  switch (label) {
    case "Recommended": return "Best overall balance of cost, speed, and reliability";
    case "Best Price": return "Lowest total cost on this trade lane";
    case "Fastest": return "Shortest transit time available";
    case "Best Value": return "Strong combination of price and service quality";
    case "Reliable Option": return "Extended free time reduces demurrage risk";
    default: return undefined;
  }
}

export function useSailingScoring(
  options: SailingOption[],
  sortKey: SortKey,
  filterKey: FilterKey
) {
  const scored = useMemo<ScoredSailing[]>(() => {
    if (options.length === 0) return [];

    const prices = options.map(o => o.total_rate);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const transits = options.filter(o => o.transit_days).map(o => o.transit_days!);
    const minTransit = transits.length ? Math.min(...transits) : 20;
    const maxTransit = transits.length ? Math.max(...transits) : 40;
    const transitRange = maxTransit - minTransit || 1;

    const result: ScoredSailing[] = options.map(o => {
      // Price score: 0-40 (lower is better)
      const priceScore = 40 * (1 - (o.total_rate - minPrice) / priceRange);

      // Transit score: 0-30
      const td = o.transit_days || 28;
      const transitScore = 30 * (1 - (td - minTransit) / transitRange);

      // Availability: 0-15
      const availScore = o.availability === "High" ? 15 : o.availability === "Medium" ? 10 : 5;

      // Free time: 0-15
      const ftScore = Math.min(15, (o.free_time_days || 0));

      const sailing_score = Math.round(priceScore + transitScore + availScore + ftScore);

      // Price position
      let price_position: PricePosition = "market";
      if (o.total_rate < avgPrice * 0.9) price_position = "below_market";
      else if (o.total_rate > avgPrice * 1.1) price_position = "above_market";

      return {
        ...o,
        sailing_score,
        price_position,
        score_breakdown: {
          price: Math.round(priceScore),
          transit: Math.round(transitScore),
          availability: availScore,
          free_time: ftScore,
        },
      };
    });

    // Assign AI labels
    result.forEach(s => {
      s.ai_label = assignLabel(s, result);
      s.ai_reason = assignReason(s.ai_label);
    });

    return result;
  }, [options]);

  const filtered = useMemo(() => {
    if (filterKey === "all") return scored;
    if (filterKey === "recommended") return scored.filter(s => s.ai_label === "Recommended" || s.ai_label === "Best Value");
    if (filterKey === "fastest") return [...scored].sort((a, b) => (a.transit_days || 99) - (b.transit_days || 99)).slice(0, Math.max(3, Math.ceil(scored.length / 2)));
    if (filterKey === "cheapest") return [...scored].sort((a, b) => a.total_rate - b.total_rate).slice(0, Math.max(3, Math.ceil(scored.length / 2)));
    if (filterKey === "earliest") return [...scored].sort((a, b) => new Date(a.etd || "").getTime() - new Date(b.etd || "").getTime()).slice(0, Math.max(3, Math.ceil(scored.length / 2)));
    return scored;
  }, [scored, filterKey]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortKey) {
      case "score": return list.sort((a, b) => b.sailing_score - a.sailing_score);
      case "price": return list.sort((a, b) => a.total_rate - b.total_rate);
      case "transit": return list.sort((a, b) => (a.transit_days || 99) - (b.transit_days || 99));
      case "departure": return list.sort((a, b) => new Date(a.etd || "").getTime() - new Date(b.etd || "").getTime());
      default: return list;
    }
  }, [filtered, sortKey]);

  return { scored, sorted, bestPrice: Math.min(...options.map(o => o.total_rate)), fastestTransit: Math.min(...options.filter(o => o.transit_days).map(o => o.transit_days!)) };
}
