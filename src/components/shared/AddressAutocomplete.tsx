import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface StructuredAddress {
  formatted: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  companyName?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: StructuredAddress) => void;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Search address...",
  className,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "autocomplete", input },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setOpen(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    setOpen(false);
    onChange(prediction.description);

    try {
      const { data } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "details", mapboxId: prediction.description },
      });
      if (data?.result) {
        const components = data.result.address_components || [];
        const get = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.long_name || "";

        const structured: StructuredAddress = {
          formatted: data.result.formatted_address || prediction.description,
          street: `${get("street_number")} ${get("route")}`.trim(),
          city: get("locality") || get("sublocality"),
          state: get("administrative_area_level_1"),
          postalCode: get("postal_code"),
          country: get("country"),
          companyName: data.result.name !== data.result.formatted_address ? data.result.name : undefined,
        };
        onChange(structured.formatted);
        onAddressSelect?.(structured);
      }
    } catch {
      // keep the description as fallback
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Popover open={open && predictions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={`pl-8 ${className || ""}`}
            onFocus={() => predictions.length > 0 && setOpen(true)}
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="max-h-60 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 text-sm transition-colors border-b border-border/50 last:border-0"
              onClick={() => handleSelect(p)}
            >
              <div className="font-medium text-foreground text-xs">
                {p.structured_formatting?.main_text || p.description}
              </div>
              {p.structured_formatting?.secondary_text && (
                <div className="text-[10px] text-muted-foreground">
                  {p.structured_formatting.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
