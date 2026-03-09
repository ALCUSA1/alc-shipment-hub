import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  effective_date: string;
}

// Cache for exchange rates
let rateCache: Map<string, number> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("effective_date", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cacheKey = `${from}-${to}`;
  if (Date.now() - cacheTimestamp < CACHE_TTL && rateCache.has(cacheKey)) {
    return rateCache.get(cacheKey)!;
  }

  const { data } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", from)
    .eq("target_currency", to)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    rateCache.set(cacheKey, data.rate);
    cacheTimestamp = Date.now();
    return data.rate;
  }

  // Try inverse
  const { data: inverse } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", to)
    .eq("target_currency", from)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (inverse) {
    const rate = 1 / inverse.rate;
    rateCache.set(cacheKey, rate);
    cacheTimestamp = Date.now();
    return rate;
  }

  // Default: no conversion available
  return 1;
}

export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "KRW", symbol: "₩", name: "Korean Won" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso" },
];
