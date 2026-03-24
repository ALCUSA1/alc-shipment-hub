import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Ship, ArrowLeft, ArrowRight, Sparkles, Clock, Calendar,
  ShieldCheck, DollarSign, FileText, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import type { QuoteData } from "@/pages/BookingFlow";

interface QuotePreviewStepProps {
  quoteData: QuoteData;
  onBook: () => void;
  onModify: () => void;
  isLoading: boolean;
}

export function QuotePreviewStep({ quoteData, onBook, onModify, isLoading }: QuotePreviewStepProps) {
  const { sailing, search, costBreakdown, aiInsight } = quoteData;
  const etdDate = sailing.etd ? new Date(sailing.etd) : null;
  const etaDate = sailing.eta ? new Date(sailing.eta) : null;
  const validDate = new Date(costBreakdown.validUntil);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onModify} className="gap-1 -ml-3">
        <ArrowLeft className="h-4 w-4" /> Change Sailing
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Quote Card */}
        <div className="lg:col-span-2 space-y-5">
          {/* Shipment Summary */}
          <Card>
            <div className="p-4 border-b bg-secondary/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Shipment Summary</span>
              <Badge variant="outline" className="gap-1 text-xs">
                <Ship className="h-3 w-3" />
                {search.mode === "ocean" ? "FCL Ocean" : "Air Freight"}
              </Badge>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Origin</p>
                  <p className="font-medium text-foreground">{search.origin}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">{search.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Container</p>
                  <p className="font-medium text-foreground">{search.containerSize} × {search.containers}</p>
                </div>
                {search.commodity && (
                  <div>
                    <p className="text-xs text-muted-foreground">Commodity</p>
                    <p className="font-medium text-foreground">{search.commodity}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Sailing */}
          <Card>
            <div className="p-4 border-b bg-secondary/50">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Selected Sailing</span>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ship className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-lg text-foreground">{sailing.carrier}</span>
                  {sailing.ai_label && (
                    <Badge variant="secondary" className="text-[10px]">{sailing.ai_label}</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center py-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">ETD</p>
                  <p className="font-semibold text-foreground">
                    {etdDate ? format(etdDate, "MMM d, yyyy") : "TBD"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Transit</p>
                  <p className="font-semibold text-foreground">
                    {sailing.transit_days ? `${sailing.transit_days} days` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">ETA</p>
                  <p className="font-semibold text-foreground">
                    {etaDate ? format(etaDate, "MMM d, yyyy") : "TBD"}
                  </p>
                </div>
              </div>

              {sailing.free_time_days && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {sailing.free_time_days} days free time at destination
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Breakdown */}
          <Card>
            <div className="p-4 border-b bg-secondary/50">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Price Breakdown</span>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ocean Freight</span>
                  <span className="font-medium text-foreground tabular-nums">${costBreakdown.oceanFreight.toLocaleString()}</span>
                </div>
                {costBreakdown.surcharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Surcharges</span>
                    <span className="font-medium text-foreground tabular-nums">${costBreakdown.surcharges.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Terminal Handling</span>
                  <span className="font-medium text-foreground tabular-nums">${costBreakdown.thc}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium text-foreground tabular-nums">${costBreakdown.documentation}</span>
                </div>
              </div>

              <Separator />

              <div className="rounded-xl border-2 border-accent/20 bg-accent/5 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Total Price</p>
                    <p className="text-3xl font-bold text-accent tabular-nums">
                      ${costBreakdown.sellPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      × {search.containers} container{search.containers > 1 ? "s" : ""} = ${(costBreakdown.sellPrice * search.containers).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Valid Until</p>
                    <p className="text-sm font-medium text-foreground">
                      {format(validDate, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* AI Insight */}
          <Card className="border-accent/20 bg-gradient-to-b from-accent/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="font-semibold text-foreground text-sm">AI Insight</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <Button
                variant="electric"
                size="lg"
                className="w-full h-12 text-base"
                onClick={onBook}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Processing..." : "Accept & Book"}
              </Button>

              <Button variant="outline" className="w-full" onClick={onModify}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Modify Selection
              </Button>

              <Button variant="ghost" className="w-full text-muted-foreground">
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Adjustment
              </Button>
            </CardContent>
          </Card>

          {/* Trust signals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Live carrier rates updated in real-time
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-accent" />
              Price locked for {Math.ceil((validDate.getTime() - Date.now()) / 86400000)} days
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-accent" />
              Booking confirmation sent instantly
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
