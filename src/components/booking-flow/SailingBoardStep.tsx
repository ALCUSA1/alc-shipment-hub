import type { SailingOption, SearchParams } from "@/pages/BookingFlow";
import { SailingIntelligenceBoard } from "@/components/sailing-board/SailingIntelligenceBoard";

interface SailingBoardStepProps {
  options: SailingOption[];
  searchParams: SearchParams;
  onSelect: (option: SailingOption) => void;
  onBack: () => void;
}

export function SailingBoardStep({ options, searchParams, onSelect, onBack }: SailingBoardStepProps) {
  return (
    <SailingIntelligenceBoard
      options={options}
      searchParams={searchParams}
      onSelect={onSelect}
      onBack={onBack}
    />
  );
}
