import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Download, RefreshCw, Calendar, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb, Target,
  ChevronRight, DollarSign, Users, Zap, BarChart3, ShieldCheck
} from "lucide-react";

const weekOptions = [
  { value: "2026-W12", label: "Week 12 — Mar 16–22, 2026" },
  { value: "2026-W11", label: "Week 11 — Mar 9–15, 2026" },
  { value: "2026-W10", label: "Week 10 — Mar 2–8, 2026" },
];

const executiveSummary = [
  { text: "Platform retained profit increased by 12% week-over-week to $98,400.", type: "up" },
  { text: "Promo rates on Asia → USA lanes generated $18,200 additional margin.", type: "up" },
  { text: "Margin leakage increased in LCL shipments due to high discount pass-through.", type: "down" },
  { text: "Auto-quote performance improved — 85% success rate, up 4pp from last week.", type: "up" },
  { text: "Customer GlobalTech generating high revenue but below-target profitability.", type: "down" },
  { text: "Two new strong promo opportunities detected on Europe → USEC routes.", type: "up" },
];

const financials = [
  { label: "Total Revenue", current: "$682,000", prev: "$630,000", delta: "+8.3%", up: true },
  { label: "Total True Cost", current: "$524,000", prev: "$498,000", delta: "+5.2%", up: true },
  { label: "Net Profit", current: "$158,000", prev: "$132,000", delta: "+19.7%", up: true },
  { label: "Platform Retained", current: "$98,400", prev: "$87,800", delta: "+12.1%", up: true },
  { label: "Network Payout", current: "$59,600", prev: "$44,200", delta: "+34.8%", up: false },
  { label: "Average Margin", current: "23.2%", prev: "21.0%", delta: "+2.2pp", up: true },
];

const sections = [
  {
    title: "Profitability Analysis",
    icon: DollarSign,
    insights: [
      "Top 10% of shipments generated 38% of total profit.",
      "Low-margin shipments increased by 2 this week — primarily on LCL routes.",
      "Average profit per shipment: $2,180 (up from $1,960 last week).",
    ],
  },
  {
    title: "Pricing Behavior",
    icon: Target,
    insights: [
      "Balanced pricing mode dominated this week (42% of quotes).",
      "Manual overrides increased in Air shipments — review needed.",
      "AI-assisted pricing achieved 3.2pp higher average margin than manual pricing.",
    ],
  },
  {
    title: "Promo Opportunity",
    icon: Zap,
    insights: [
      "28 promo rates detected across 6 carriers.",
      "Promo opportunities added $18,200 additional platform profit.",
      "Excessive pass-through on 3 deals reduced potential profit by ~$4,100.",
    ],
  },
  {
    title: "Lane Performance",
    icon: BarChart3,
    insights: [
      "Shanghai → LA performing 18% above target margin.",
      "Hamburg → Santos showing declining profitability — 12.4% margin vs 16% target.",
      "Dubai → Mumbai suitable for auto-quoting expansion based on data quality.",
    ],
  },
  {
    title: "Customer Intelligence",
    icon: Users,
    insights: [
      "GlobalTech requires tighter pricing control — high revenue but 9.4% margin.",
      "Pacific Rim is highly profitable and stable — maintain balanced strategy.",
      "Atlas Freight shows growth potential — continue growth pricing on target lanes.",
    ],
  },
  {
    title: "Sales Performance",
    icon: ShieldCheck,
    insights: [
      "Sarah M. strong profit performance — 15.8% avg margin, lowest pass-through.",
      "James K. high volume but 11.2% margin with 28% pass-through — coaching needed.",
      "Priya D. best margin discipline at 18.5% — consider expanding pricing authority.",
    ],
  },
  {
    title: "Automation Performance",
    icon: Zap,
    insights: [
      "Auto-quoting produced 58 quotes with 82% win rate.",
      "Auto-quoted FCL margins averaged 2pp higher than manual on same lanes.",
      "Hamburg → Santos LCL showing 50% fallback rate — tighten or disable.",
    ],
  },
  {
    title: "Margin Leakage",
    icon: AlertTriangle,
    insights: [
      "Estimated $13,000 total margin leakage this week.",
      "35% of leakage from over-discounting, 25% from network payout pressure.",
      "3 shipments booked below break-even — all approved with exceptions.",
    ],
  },
];

const risks = [
  "Declining margin on Hamburg → Santos LCL — potential structural issue.",
  "Increasing low-margin deals from Sales Rep James K.",
  "Over-reliance on promo pricing for Asia → USA win rate.",
  "Network payout growth outpacing profit growth (+34.8% vs +19.7%).",
];

const opportunities = [
  "Increase margin on Dubai → Mumbai where competition is low and win rate is 85%.",
  "Expand auto-quoting to 2 additional stable FCL lanes.",
  "Capture more promo advantage by reducing pass-through on strong promo lanes.",
  "Reclassify GlobalTech pricing strategy from Growth to Margin Protection.",
];

const actions = [
  { text: "Raise margin floor for LCL shipments by 2%.", impact: "+$3,200/month", priority: "High", owner: "Pricing" },
  { text: "Reduce promo pass-through cap on Asia lanes to 20%.", impact: "+$4,100/month", priority: "High", owner: "Pricing" },
  { text: "Enable auto-quoting pilot on Rotterdam → NY FCL.", impact: "+6 auto-quotes/week", priority: "Medium", owner: "Pricing" },
  { text: "Review GlobalTech pricing strategy.", impact: "+$4,200/month retained", priority: "High", owner: "Sales Mgr" },
  { text: "Coach James K. on margin discipline and pass-through limits.", impact: "+$2,900/month", priority: "High", owner: "Sales Mgr" },
];

export default function AdminWeeklyReview() {
  const [selectedWeek, setSelectedWeek] = useState("2026-W12");

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-red-400" />
              Executive Weekly Review
            </h1>
            <p className="text-sm text-[hsl(220,10%,50%)] mt-1">AI-generated commercial intelligence briefing</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[260px] bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white text-xs">
                <Calendar className="h-3.5 w-3.5 mr-2 text-[hsl(220,10%,40%)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((w) => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-[hsl(220,15%,18%)] text-[hsl(220,10%,60%)] text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
            <Button variant="outline" size="sm" className="border-[hsl(220,15%,18%)] text-[hsl(220,10%,60%)] text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>

        {/* Executive Summary */}
        <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)] ring-1 ring-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {executiveSummary.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {s.type === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <p className="text-sm text-[hsl(220,10%,70%)] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Financial Performance */}
        <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Financial Performance — Week-over-Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {financials.map((f) => (
                <div key={f.label} className="p-3 rounded-lg bg-[hsl(220,15%,12%)]">
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] mb-1">{f.label}</p>
                  <p className="text-lg font-bold text-white tabular-nums">{f.current}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[hsl(220,10%,40%)]">prev: {f.prev}</span>
                    <span className={`text-[11px] flex items-center gap-0.5 ${f.up && !f.label.includes("Payout") ? "text-emerald-400" : f.label.includes("Payout") ? "text-amber-400" : "text-red-400"}`}>
                      {f.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {f.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Sections */}
        {sections.map((sec) => (
          <Card key={sec.title} className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <sec.icon className="h-4 w-4 text-blue-400" />
                {sec.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {sec.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-[hsl(220,10%,30%)] mt-0.5 shrink-0" />
                  <p className="text-sm text-[hsl(220,10%,65%)] leading-relaxed">{ins}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Risks & Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-[hsl(220,15%,10%)] border-red-500/15">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Key Risks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                  <p className="text-sm text-[hsl(220,10%,65%)]">{r}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-[hsl(220,15%,10%)] border-emerald-500/15">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                Key Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.map((o, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <p className="text-sm text-[hsl(220,10%,65%)]">{o}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recommended Actions */}
        <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)] ring-1 ring-amber-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,15%,12%)] hover:bg-[hsl(220,15%,14%)] transition-colors">
                <div className="flex-1 mr-4">
                  <p className="text-sm text-white">{a.text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-emerald-400">Impact: {a.impact}</span>
                    <Badge className={`text-[9px] ${a.priority === "High" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{a.priority}</Badge>
                    <span className="text-[10px] text-[hsl(220,10%,40%)]">{a.owner}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-[hsl(220,15%,20%)] text-[hsl(220,10%,60%)]">Details</Button>
                  <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">Apply</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
