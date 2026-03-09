import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "CN", name: "China" }, { code: "JP", name: "Japan" },
  { code: "DE", name: "Germany" }, { code: "GB", name: "United Kingdom" }, { code: "FR", name: "France" },
  { code: "IN", name: "India" }, { code: "IT", name: "Italy" }, { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" }, { code: "KR", name: "South Korea" }, { code: "RU", name: "Russia" },
  { code: "AU", name: "Australia" }, { code: "ES", name: "Spain" }, { code: "MX", name: "Mexico" },
  { code: "ID", name: "Indonesia" }, { code: "NL", name: "Netherlands" }, { code: "SA", name: "Saudi Arabia" },
  { code: "TR", name: "Turkey" }, { code: "CH", name: "Switzerland" }, { code: "TW", name: "Taiwan" },
  { code: "PL", name: "Poland" }, { code: "SE", name: "Sweden" }, { code: "BE", name: "Belgium" },
  { code: "TH", name: "Thailand" }, { code: "NG", name: "Nigeria" }, { code: "AT", name: "Austria" },
  { code: "NO", name: "Norway" }, { code: "IL", name: "Israel" }, { code: "AE", name: "United Arab Emirates" },
  { code: "IE", name: "Ireland" }, { code: "SG", name: "Singapore" }, { code: "MY", name: "Malaysia" },
  { code: "PH", name: "Philippines" }, { code: "DK", name: "Denmark" }, { code: "HK", name: "Hong Kong" },
  { code: "CO", name: "Colombia" }, { code: "EG", name: "Egypt" }, { code: "CL", name: "Chile" },
  { code: "PK", name: "Pakistan" }, { code: "FI", name: "Finland" }, { code: "CZ", name: "Czech Republic" },
  { code: "VN", name: "Vietnam" }, { code: "RO", name: "Romania" }, { code: "PT", name: "Portugal" },
  { code: "NZ", name: "New Zealand" }, { code: "PE", name: "Peru" }, { code: "GR", name: "Greece" },
  { code: "QA", name: "Qatar" }, { code: "KW", name: "Kuwait" }, { code: "ZA", name: "South Africa" },
  { code: "HU", name: "Hungary" }, { code: "BD", name: "Bangladesh" }, { code: "AR", name: "Argentina" },
  { code: "KE", name: "Kenya" }, { code: "MA", name: "Morocco" }, { code: "SK", name: "Slovakia" },
  { code: "EC", name: "Ecuador" }, { code: "DO", name: "Dominican Republic" }, { code: "GT", name: "Guatemala" },
  { code: "PA", name: "Panama" }, { code: "LK", name: "Sri Lanka" }, { code: "UZ", name: "Uzbekistan" },
  { code: "OM", name: "Oman" }, { code: "LT", name: "Lithuania" }, { code: "GH", name: "Ghana" },
  { code: "BG", name: "Bulgaria" }, { code: "HR", name: "Croatia" }, { code: "JO", name: "Jordan" },
  { code: "TN", name: "Tunisia" }, { code: "LB", name: "Lebanon" }, { code: "UY", name: "Uruguay" },
  { code: "CR", name: "Costa Rica" }, { code: "SI", name: "Slovenia" }, { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" }, { code: "TT", name: "Trinidad and Tobago" }, { code: "BH", name: "Bahrain" },
  { code: "CY", name: "Cyprus" }, { code: "LU", name: "Luxembourg" }, { code: "MM", name: "Myanmar" },
  { code: "KH", name: "Cambodia" }, { code: "ET", name: "Ethiopia" }, { code: "TZ", name: "Tanzania" },
  { code: "SN", name: "Senegal" }, { code: "CI", name: "Ivory Coast" }, { code: "CM", name: "Cameroon" },
].sort((a, b) => a.name.localeCompare(b.name));

interface CountrySelectorProps {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export function CountrySelector({ value, onValueChange, className, triggerClassName, placeholder = "Country" }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.code === value || c.name.toLowerCase() === value?.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", triggerClassName)}
        >
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[240px] p-0", className)} align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => { onValueChange(c.code); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3 w-3", (value === c.code || value === c.name) ? "opacity-100" : "opacity-0")} />
                  <Globe className="mr-1.5 h-3 w-3 text-muted-foreground" />
                  <span>{c.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
