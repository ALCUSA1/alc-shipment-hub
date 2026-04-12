import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ship } from "lucide-react";
import { motion } from "framer-motion";
import type { SailingOption, SearchParams } from "@/pages/BookingFlow";
import type { SortKey, FilterKey } from "./types";
import { portName } from "./types";
import { useSailingScoring } from "./useSailingScoring";
import { SailingTimeline } from "./SailingTimeline";
import { SailingFilters } from "./SailingFilters";
import { SailingCard } from "./SailingCard";
import { AiInsightPanel } from "./AiInsightPanel";

interface SailingIntelligenceBoardProps {
  options: SailingOption[];
  searchParams: SearchParams;
  onSelect: (option: SailingOption) => void;
  onBack: () => void;
}

export function SailingIntelligenceBoard({ options, searchParams, onSelect, onBack }: SailingIntelligenceBoardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const { scored, sorted, bestPrice, fastestTransit } = useSailingScoring(options, sortKey, filterKey);

  if (options.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Modify Search
        </Button>
        <div className="text-center py-20">
          <Ship className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No sailings found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No carrier options available for {portName(searchParams.origin)} → {portName(searchParams.destination)}. Try adjusting your search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" onClick={onBack} className="gap-1 mb-2 -ml-3">
            <ArrowLeft className="h-4 w-4" /> Modify Search
          </Button>
          <h2 className="text-2xl font-bold text-foreground">
            {portName(searchParams.origin)} → {portName(searchParams.destination)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered sailing recommendations for your route
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-[10px] text-muted-foreground uppercase">From</p>
            <p className="text-lg font-bold text-accent">${bestPrice.toLocaleString()}</p>
          </div>
          {fastestTransit < Infinity && (
            <div className="text-center px-4 py-2 rounded-lg bg-secondary border">
              <p className="text-[10px] text-muted-foreground uppercase">Fastest</p>
              <p className="text-lg font-bold text-foreground">{fastestTransit}d</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SailingTimeline sailings={scored} onSelect={onSelect} />
      </motion.div>

      {/* AI Insight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <AiInsightPanel sailings={scored} />
      </motion.div>

      {/* Filters & Sort */}
      <SailingFilters
        filter={filterKey}
        sort={sortKey}
        onFilterChange={setFilterKey}
        onSortChange={setSortKey}
        count={sorted.length}
      />

      {/* Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Select a sailing to continue booking</h3>
        </div>
        {sorted.map((sailing, idx) => (
          <motion.div
            key={sailing.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx + 0.3 }}
          >
            <SailingCard
              sailing={sailing}
              isTop={idx === 0}
              onSelect={() => onSelect(sailing)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
