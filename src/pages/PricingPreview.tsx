import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { TrendingUp, ArrowRight, DollarSign, BarChart3, ShieldCheck, Ship } from "lucide-react";

/**
 * Pricing preview shown after a new shipment is submitted.
 * Displays estimated cost, sell price, and profit to create the "aha moment".
 */
const PricingPreview = () => {
  const navigate = useNavigate();

  // Simulated pricing data based on the shipment just created
  const pricing = {
    carrier: "Maersk Line",
    route: "Shanghai → Los Angeles",
    type: "FCL · 40HC",
    buyRate: 1200,
    thc: 150,
    trucking: 180,
    docs: 40,
    fixedAlloc: 35,
    totalCost: 1605,
    sellPrice: 1825,
    netProfit: 220,
    marginPct: 12,
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Here's your estimated pricing and profit
            </h1>
            <p className="text-muted-foreground">
              Based on current carrier rates and your margin rules.
            </p>
          </div>

          {/* Route badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge variant="secondary" className="text-xs">
              <Ship className="h-3 w-3 mr-1" /> {pricing.type}
            </Badge>
            <span className="text-sm font-medium text-foreground">{pricing.route}</span>
          </div>

          {/* Pricing card */}
          <Card className="mb-6 overflow-hidden">
            <div className="p-4 bg-secondary/50 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Pricing Estimate</span>
              <span className="text-xs text-muted-foreground">{pricing.carrier}</span>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* Cost lines */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ocean Freight</span>
                  <span className="font-medium text-foreground tabular-nums">${pricing.buyRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Terminal Handling</span>
                  <span className="font-medium text-foreground tabular-nums">${pricing.thc}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trucking</span>
                  <span className="font-medium text-foreground tabular-nums">${pricing.trucking}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium text-foreground tabular-nums">${pricing.docs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Allocation</span>
                  <span className="font-medium text-foreground tabular-nums">${pricing.fixedAlloc}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Total Cost</span>
                <span className="text-foreground tabular-nums">${pricing.totalCost.toLocaleString()}</span>
              </div>

              <Separator />

              {/* Profit highlight */}
              <div className="rounded-xl border-2 border-accent/20 bg-accent/5 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Sell Price</p>
                    <p className="text-xl font-bold text-accent tabular-nums">${pricing.sellPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Net Profit</p>
                    <p className="text-xl font-bold text-emerald-600 tabular-nums">${pricing.netProfit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Margin</p>
                    <p className="text-xl font-bold text-emerald-600 tabular-nums">{pricing.marginPct}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="electric" size="lg" className="flex-1 h-12" onClick={() => navigate("/dashboard")}>
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="flex-1 h-12" onClick={() => navigate("/shipments/new")}>
              Create Another Shipment
            </Button>
          </div>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Pricing updates with live carrier feeds
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BarChart3 className="h-3 w-3" /> Full profit analytics in dashboard
            </span>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PricingPreview;
