import type { SailingOption, SearchParams } from "@/pages/BookingFlow";

export type SortKey = "price" | "transit" | "departure" | "score";
export type FilterKey = "all" | "recommended" | "fastest" | "cheapest" | "earliest";
export type AvailabilityLevel = "High" | "Medium" | "Limited";
export type PricePosition = "below_market" | "market" | "above_market";

export interface ScoredSailing extends SailingOption {
  sailing_score: number;
  price_position: PricePosition;
  score_breakdown: {
    price: number;
    transit: number;
    availability: number;
    free_time: number;
  };
}

export interface SailingBoardProps {
  options: SailingOption[];
  searchParams: SearchParams;
  onSelect: (option: SailingOption) => void;
  onBack: () => void;
}

export const PORT_NAMES: Record<string, string> = {
  USLAX: "Los Angeles", USLGB: "Long Beach", USNYC: "New York", USHOU: "Houston",
  USSAV: "Savannah", CNSHA: "Shanghai", CNSZX: "Shenzhen", CNTAO: "Qingdao",
  CNNGB: "Ningbo", HKHKG: "Hong Kong", JPYOK: "Yokohama", KRPUS: "Busan",
  SGSIN: "Singapore", DEHAM: "Hamburg", NLRTM: "Rotterdam", BEANR: "Antwerp",
  GBFXT: "Felixstowe", FRLEH: "Le Havre", AEJEA: "Jebel Ali",
  INBOM: "Mumbai", INNSA: "Nhava Sheva", BRSSZ: "Santos",
};

export function portName(code: string) {
  return PORT_NAMES[code] || code;
}
