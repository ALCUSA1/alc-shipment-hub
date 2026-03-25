import { Sparkles, TrendingDown, Zap, Clock } from "lucide-react";
import type { ScoredSailing } from "./types";

interface AiInsightPanelProps {
  sailings: ScoredSailing[];
}

export function AiInsightPanel({ sailings }: AiInsightPanelProps) {
  if (sailings.length < 2) return null;

  const recommended = sailings.find(s => s.ai_label === "Recommended") || sailings[0];
  const cheapest = [...sailings].sort((a, b) => a.total_rate - b.total_rate)[0];
  const fastest = [...sailings].sort((a, b) => (a.transit_days || 99) - (b.transit_days || 99))[0];

  const insights: { icon: any; text: string }[] = [];

  if (cheapest.id !== recommended.id && recommended.transit_days && cheapest.transit_days) {
    const priceDiff = cheapest.total_rate - recommended.total_rate;
    const daysDiff = (recommended.transit_days || 0) - (cheapest.transit_days || 0);
    if (daysDiff !== 0) {
      insights.push({
        icon: TrendingDown,
        text: priceDiff < 0
          ? `Save $${Math.abs(priceDiff).toLocaleString()} with ${recommended.carrier} vs cheapest`
          : `Cheapest option saves $${priceDiff.toLocaleString()} but takes ${Math.abs(daysDiff)} more days`,
      });
    }
  }

  if (fastest.id !== recommended.id && fastest.transit_days && recommended.transit_days) {
    const priceDiff = fastest.total_rate - recommended.total_rate;
    const daysSaved = (recommended.transit_days || 0) - (fastest.transit_days || 0);
    if (daysSaved > 0) {
      insights.push({
        icon: Zap,
        text: `Save ${daysSaved} day${daysSaved > 1 ? "s" : ""} with ${fastest.carrier} for $${priceDiff.toLocaleString()} more`,
      });
    }
  }

  if (recommended.free_time_days && recommended.free_time_days >= 10) {
    insights.push({
      icon: Clock,
      text: `Recommended option includes ${recommended.free_time_days} days free time at destination`,
    });
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border border-accent/20 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">AI Recommendation</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-accent">{recommended.carrier}</span> is recommended with a score of{" "}
            <span className="font-bold text-foreground">{recommended.sailing_score}/100</span> — best balance of cost, speed, and reliability.
          </p>
          {insights.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {insights.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    {ins.text}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
