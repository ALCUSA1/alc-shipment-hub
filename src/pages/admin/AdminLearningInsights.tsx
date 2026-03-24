import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle,
  Check, Lightbulb, RefreshCw, MessageSquare, ThumbsUp, ThumbsDown,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { toast } from "sonner";

/* ── Mock data ── */
const WIN_LOSS_BY_MARGIN = [
  { margin: "3–5%", won: 28, lost: 6, winRate: 82 },
  { margin: "5–7%", won: 42, lost: 15, winRate: 74 },
  { margin: "7–10%", won: 35, lost: 22, winRate: 61 },
  { margin: "10–12%", won: 18, lost: 24, winRate: 43 },
  { margin: "12%+", won: 9, lost: 23, winRate: 28 },
];

const MARGIN_TREND = [
  { month: "Sep", avgMargin: 9.2, winRate: 58 },
  { month: "Oct", avgMargin: 8.8, winRate: 62 },
  { month: "Nov", avgMargin: 8.5, winRate: 65 },
  { month: "Dec", avgMargin: 9.1, winRate: 60 },
  { month: "Jan", avgMargin: 8.3, winRate: 67 },
  { month: "Feb", avgMargin: 7.9, winRate: 71 },
  { month: "Mar", avgMargin: 8.1, winRate: 69 },
];

const AI_INSIGHTS = [
  { type: "pattern", text: "You lose deals above 12% margin on Asia→US West Coast lanes", impact: "high", trend: "consistent" },
  { type: "pattern", text: "Customer Apex Logistics consistently accepts pricing at 8–9% margin", impact: "medium", trend: "consistent" },
  { type: "opportunity", text: "Promo rates improve win rate by 18% when partially shared with customer", impact: "high", trend: "improving" },
  { type: "warning", text: "Rep C wins deals by over-discounting — average margin 4.2% vs team 8.1%", impact: "high", trend: "worsening" },
  { type: "pattern", text: "LCL shipments have 22% higher margin than FCL with similar win rates", impact: "medium", trend: "stable" },
  { type: "opportunity", text: "Margin can safely increase by 1.5% on Europe→US lanes without win rate impact", impact: "medium", trend: "improving" },
];

const RECENT_OUTCOMES = [
  { id: "SHP-2026-038", customer: "Apex Logistics", lane: "SHA→LAX", margin: 8.5, outcome: "won", feedback: null },
  { id: "SHP-2026-037", customer: "Pacific Imports", lane: "NGB→LGB", margin: 12.3, outcome: "lost", feedback: "Competitor was cheaper" },
  { id: "SHP-2026-036", customer: "Midwest Dist.", lane: "HKG→NYC", margin: 7.1, outcome: "won", feedback: null },
  { id: "SHP-2026-035", customer: "Euro Traders", lane: "RTM→SAV", margin: 11.8, outcome: "lost", feedback: "Customer went with existing partner" },
  { id: "SHP-2026-034", customer: "Tech Parts Inc", lane: "PVG→ORD", margin: 9.2, outcome: "won", feedback: null },
];

const AI_IMPROVEMENT = [
  { month: "Oct", accuracy: 62, profitImpact: 12000 },
  { month: "Nov", accuracy: 67, profitImpact: 15200 },
  { month: "Dec", accuracy: 71, profitImpact: 18400 },
  { month: "Jan", accuracy: 74, profitImpact: 21600 },
  { month: "Feb", accuracy: 78, profitImpact: 25100 },
  { month: "Mar", accuracy: 81, profitImpact: 28800 },
];

const AdminLearningInsights = () => {
  const [feedbackShipment, setFeedbackShipment] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [lossReason, setLossReason] = useState("");

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Deal Learning Loop</h1>
            <p className="text-sm text-muted-foreground">System intelligence improves with every quote outcome</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "AI Accuracy", value: "81%", sub: "+19% from start", icon: Target, color: "text-emerald-500" },
          { label: "Optimal Hit Rate", value: "69%", sub: "Deals in optimal zone", icon: Sparkles, color: "text-violet-400" },
          { label: "Profit Impact", value: "$28.8K", sub: "AI-attributed this month", icon: TrendingUp, color: "text-emerald-500" },
          { label: "Patterns Detected", value: "24", sub: "Active patterns", icon: Lightbulb, color: "text-amber-400" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="insights">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "insights", label: "AI Insights", icon: Lightbulb },
            { value: "winloss", label: "Win/Loss Analysis", icon: BarChart3 },
            { value: "outcomes", label: "Deal Outcomes", icon: MessageSquare },
            { value: "improvement", label: "AI Improvement", icon: RefreshCw },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border">
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* AI Insights */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {AI_INSIGHTS.map((insight, i) => (
              <Card key={i} className={`border-l-4 ${
                insight.type === "warning" ? "border-l-destructive" :
                insight.type === "opportunity" ? "border-l-emerald-500" : "border-l-blue-400"
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {insight.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> :
                         insight.type === "opportunity" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> :
                         <Lightbulb className="h-3.5 w-3.5 text-blue-400" />}
                        <Badge variant="outline" className="text-[9px]">
                          {insight.type} • {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{insight.text}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[10px] ${
                          insight.trend === "improving" ? "text-emerald-500" :
                          insight.trend === "worsening" ? "text-destructive" : "text-muted-foreground"
                        }`}>
                          {insight.trend === "improving" ? "↑ Improving" :
                           insight.trend === "worsening" ? "↓ Worsening" : "— Consistent"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Win/Loss Analysis */}
        <TabsContent value="winloss" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Win Rate by Margin Bucket</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={WIN_LOSS_BY_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="margin" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="won" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Won" />
                    <Bar dataKey="lost" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Lost" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Margin vs Win Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={MARGIN_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="avgMargin" stroke="hsl(217, 91%, 60%)" name="Avg Margin %" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="winRate" stroke="hsl(142, 71%, 45%)" name="Win Rate %" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Margin Bucket Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Margin Range</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Won</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Lost</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Win Rate</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WIN_LOSS_BY_MARGIN.map(row => (
                      <tr key={row.margin} className="border-b border-border/50">
                        <td className="py-2 font-medium text-foreground">{row.margin}</td>
                        <td className="py-2 text-right text-emerald-500">{row.won}</td>
                        <td className="py-2 text-right text-destructive">{row.lost}</td>
                        <td className="py-2 text-right font-semibold text-foreground">{row.winRate}%</td>
                        <td className="py-2 text-right">
                          <Badge className={`text-[9px] ${
                            row.winRate >= 70 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                            row.winRate >= 50 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                            "bg-destructive/15 text-destructive border-destructive/30"
                          }`}>
                            {row.winRate >= 70 ? "Strong" : row.winRate >= 50 ? "Moderate" : "Weak"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deal Outcomes */}
        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Deal Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {RECENT_OUTCOMES.map(deal => (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {deal.outcome === "won" ? (
                      <ThumbsUp className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{deal.id}</span>
                        <Badge className={`text-[9px] ${deal.outcome === "won" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
                          {deal.outcome}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{deal.customer} • {deal.lane} • {deal.margin}% margin</p>
                      {deal.feedback && <p className="text-[10px] text-amber-400 mt-0.5">Reason: {deal.feedback}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!deal.feedback && deal.outcome === "lost" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px]"
                        onClick={() => setFeedbackShipment(deal.id)}>
                        Add Feedback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback Form */}
          {feedbackShipment && (
            <Card className="border-violet-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Add Loss Feedback — {feedbackShipment}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Loss Reason</label>
                  <Select value={lossReason} onValueChange={setLossReason}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_too_high" className="text-xs">Price too high</SelectItem>
                      <SelectItem value="competitor" className="text-xs">Competitor won</SelectItem>
                      <SelectItem value="service" className="text-xs">Service concerns</SelectItem>
                      <SelectItem value="timing" className="text-xs">Timing mismatch</SelectItem>
                      <SelectItem value="relationship" className="text-xs">Existing relationship</SelectItem>
                      <SelectItem value="other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Additional context..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} className="text-xs" rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs" onClick={() => {
                    toast.success("Feedback saved — AI will incorporate this data");
                    setFeedbackShipment(null);
                    setFeedbackText("");
                    setLossReason("");
                  }}>Save Feedback</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setFeedbackShipment(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Improvement */}
        <TabsContent value="improvement" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI Accuracy Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={AI_IMPROVEMENT}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[50, 100]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(263, 70%, 50%)" name="Accuracy %" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI-Attributed Profit Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={AI_IMPROVEMENT}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Profit Impact"]} />
                    <Bar dataKey="profitImpact" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Profit Impact" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Learning Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-violet-400" />
                What the System Has Learned
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Optimal FCL margin zone narrowed from 5–12% to 7–10% based on 132 outcomes",
                "Customer price sensitivity scoring improved by 23% after incorporating loss feedback",
                "Promo rate detection now factors seasonal patterns (Q4 rates are not truly promotional)",
                "Strategic account pricing rules refined — high-volume discount cap reduced from 4% to 2.5%",
                "Lane competitiveness model updated — Asia→US West Coast reclassified from 'normal' to 'high'",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30">
                  <Check className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminLearningInsights;
