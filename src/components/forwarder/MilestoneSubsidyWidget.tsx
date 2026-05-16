import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Rocket, TrendingUp, Trophy, ArrowRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// Tier thresholds (must match /pricing)
const TIER_1 = 25; // $200 subsidy
const TIER_2 = 50; // $400 subsidy
const RATE_STD = 3000;
const RATE_T1 = 2800;
const RATE_T2 = 2600;
const AGENT_EARN_STD = 500;
const AGENT_EARN_T1 = 700;
const AGENT_EARN_T2 = 900;

function getTier(count: number) {
  if (count >= TIER_2) return {
    name: "Elite",
    subsidy: 400,
    agentRate: RATE_T2,
    agentEarn: AGENT_EARN_T2,
    icon: Trophy,
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    progressValue: 100,
    nextLabel: "Top tier unlocked",
    description: "$400 subsidy active — carrier renegotiation restores ALC's margin.",
  };
  if (count >= TIER_1) return {
    name: "Unlocked",
    subsidy: 200,
    agentRate: RATE_T1,
    agentEarn: AGENT_EARN_T1,
    icon: Rocket,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    progressValue: Math.min(100, ((count - TIER_1) / (TIER_2 - TIER_1)) * 100),
    nextLabel: `${TIER_2 - count} ships to Elite ($400 subsidy)`,
    description: "$200 carrier subsidy active. Each extra shipment moves you closer to Elite.",
  };
  return {
    name: "Building",
    subsidy: 0,
    agentRate: RATE_STD,
    agentEarn: AGENT_EARN_STD,
    icon: Target,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    progressValue: Math.min(100, (count / TIER_1) * 100),
    nextLabel: `${TIER_1 - count} ships to unlock $200 subsidy`,
    description: "Standard rate. Hit 25 shipments this month to unlock the $200 carrier subsidy.",
  };
}

export function MilestoneSubsidyWidget() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["milestone-subsidy", user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("shipments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", start.toISOString());
      return { count: count ?? 0 };
    },
    enabled: !!user,
  });

  const count = data?.count ?? 0;
  const tier = getTier(count);
  const Icon = tier.icon;
  const mtdEarnings = count * tier.agentEarn;

  return (
    <Card className="overflow-hidden border-2 border-accent/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", tier.bg)}>
              <Icon className={cn("h-5 w-5", tier.accent)} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Carrier Subsidy Tier
              </p>
              <h3 className="text-base font-bold text-foreground">{tier.name}</h3>
            </div>
          </div>
          <Badge className={cn("text-[10px]", tier.badge)}>
            {tier.subsidy > 0 ? `−$${tier.subsidy} / ship` : "No subsidy yet"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">MTD shipments</p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{isLoading ? "—" : count}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Agent rate</p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">${tier.agentRate.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Est. MTD earnings</p>
            <p className={cn("text-2xl font-bold tabular-nums leading-none", tier.accent)}>${mtdEarnings.toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">{tier.nextLabel}</span>
            {tier.name !== "Elite" && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {count} / {tier.name === "Building" ? TIER_1 : TIER_2}
              </span>
            )}
          </div>
          <Progress value={tier.progressValue} className="h-2" />
        </div>

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          <TrendingUp className="inline h-3 w-3 mr-1 -mt-0.5" />
          {tier.description}
        </p>

        <Button variant="ghost" size="sm" className="text-accent text-xs font-semibold p-0 h-auto hover:bg-transparent" asChild>
          <Link to="/pricing">
            View subsidy details <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
