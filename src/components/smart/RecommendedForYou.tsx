import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Ship, Handshake, Package, DollarSign,
  ThumbsUp, ThumbsDown, Bookmark, Zap, ArrowRight,
  RefreshCw, Loader2, TrendingUp, MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";

const MATCH_ICONS: Record<string, typeof Ship> = {
  shipment: Ship,
  partner: Handshake,
  capacity: Package,
  high_earning: DollarSign,
};

const MATCH_COLORS: Record<string, string> = {
  shipment: "bg-accent/10 text-accent",
  partner: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  capacity: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  high_earning: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const MATCH_LABELS: Record<string, string> = {
  shipment: "Shipment",
  partner: "Partner",
  capacity: "Capacity",
  high_earning: "High Earning",
};

interface RecommendedForYouProps {
  variant?: "dashboard" | "spark" | "full";
  maxItems?: number;
}

export function RecommendedForYou({ variant = "dashboard", maxItems = 5 }: RecommendedForYouProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["ai-matches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_matches")
        .select("*")
        .eq("status", "active")
        .order("match_score", { ascending: false })
        .limit(maxItems);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-matches");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-matches"] });
      toast({ title: "New matches generated!", description: "We found opportunities tailored for you." });
      setGenerating(false);
    },
    onError: (err: any) => {
      toast({ title: "Error generating matches", description: err.message, variant: "destructive" });
      setGenerating(false);
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ matchId, action }: { matchId: string; action: "engaged" | "saved" | "dismissed" }) => {
      const { error: updateErr } = await supabase
        .from("ai_matches")
        .update({ status: action })
        .eq("id", matchId);
      if (updateErr) throw updateErr;

      if (action === "dismissed") {
        await supabase.from("ai_match_feedback").insert({
          user_id: user!.id,
          match_id: matchId,
          feedback: "not_interested",
        });
      } else if (action === "engaged") {
        await supabase.from("ai_match_feedback").insert({
          user_id: user!.id,
          match_id: matchId,
          feedback: "relevant",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-matches"] }),
  });

  if (!user) return null;

  const hasMatches = matches && matches.length > 0;
  const isCompact = variant === "spark";

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-card via-card to-accent/[0.03] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Recommended for You</CardTitle>
            <p className="text-xs text-muted-foreground">AI-powered opportunity matches</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generating}
          className="text-accent hover:text-accent"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5 hidden sm:inline text-xs">
            {generating ? "Analyzing..." : "Refresh"}
          </span>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !hasMatches ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No matches yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              We're analyzing your profile. Click below to generate opportunities.
            </p>
            <Button
              variant="electric"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generating}
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Generate Matches
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className={isCompact ? "space-y-2" : "space-y-3"}>
              {matches.map((match, idx) => {
                const Icon = MATCH_ICONS[match.match_type] || Ship;
                const colorClass = MATCH_COLORS[match.match_type] || MATCH_COLORS.shipment;
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group rounded-xl border border-border/60 bg-card hover:border-accent/30 hover:shadow-md transition-all p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{match.title}</span>
                          {(match.match_score as number) >= 85 && (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              {match.match_score}% match
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {match.trade_lane && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {match.trade_lane}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] py-0">
                            {MATCH_LABELS[match.match_type] || match.match_type}
                          </Badge>
                        </div>
                        {match.reason && (
                          <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-1">{match.reason}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          ${(match.estimated_earnings as number)?.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            title="Engage & Earn"
                            onClick={() => actionMutation.mutate({ matchId: match.id, action: "engaged" })}
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-accent hover:bg-accent/10"
                            title="Save"
                            onClick={() => actionMutation.mutate({ matchId: match.id, action: "saved" })}
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Not interested"
                            onClick={() => actionMutation.mutate({ matchId: match.id, action: "dismissed" })}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
