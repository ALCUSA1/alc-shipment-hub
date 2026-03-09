import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Plus, Check, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CrmCompany {
  id: string;
  company_name: string;
  company_type: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface CrmCompanySelectorProps {
  companies: CrmCompany[];
  companyType: "consignee" | "trucking";
  selectedId?: string;
  onSelect: (company: CrmCompany | null) => void;
  onCreateNew?: () => void;
  label?: string;
}

export function CrmCompanySelector({
  companies,
  companyType,
  selectedId,
  onSelect,
  onCreateNew,
  label,
}: CrmCompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies
      .filter((c) => c.company_type === companyType || c.company_type === "customer")
      .filter((c) => c.company_name.toLowerCase().includes(q));
  }, [companies, companyType, search]);

  const selected = companies.find((c) => c.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start h-9 text-sm font-normal"
          role="combobox"
        >
          <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {selected ? (
            <span className="truncate">{selected.company_name}</span>
          ) : (
            <span className="text-muted-foreground">
              {label || `Select ${companyType} from CRM...`}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-48">
          {/* None option */}
          <button
            className="w-full text-left px-3 py-2 hover:bg-accent/10 text-sm flex items-center gap-2 border-b border-border/50"
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            <span className="text-muted-foreground">— None —</span>
          </button>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 text-sm flex items-center gap-2 border-b border-border/50 last:border-0"
              onClick={() => { onSelect(c); setOpen(false); }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground truncate text-xs">{c.company_name}</span>
                  {c.id === selectedId && <Check className="h-3 w-3 text-accent" />}
                </div>
                {(c.city || c.country) && (
                  <div className="text-[10px] text-muted-foreground">
                    {[c.city, c.state, c.country].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">{c.company_type}</Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No companies found
            </div>
          )}
        </ScrollArea>
        {onCreateNew && (
          <div className="border-t border-border p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { onCreateNew(); setOpen(false); }}>
              <Plus className="h-3 w-3 mr-1" />
              Enter manually
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
