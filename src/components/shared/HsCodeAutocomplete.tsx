import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Sparkles, Save, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface HsCodeSuggestion {
  code: string;
  description: string;
  duty_rate?: string;
  category?: string;
  country_notes?: string;
  fromSaved?: boolean;
  fromReference?: boolean;
}

interface HsCodeAutocompleteProps {
  value: string;
  commodity: string;
  onChange: (code: string) => void;
  className?: string;
  placeholder?: string;
}

export function HsCodeAutocomplete({ value, commodity, onChange, className, placeholder = "e.g. 8471.30" }: HsCodeAutocompleteProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [savedCodes, setSavedCodes] = useState<HsCodeSuggestion[]>([]);
  const [refCodes, setRefCodes] = useState<HsCodeSuggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<HsCodeSuggestion[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingRef, setLoadingRef] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Load user's saved codes
  const fetchSaved = useCallback(async (search: string) => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      let q = supabase
        .from("hs_codes")
        .select("code, description, duty_rate, category, country_notes")
        .eq("user_id", user.id)
        .order("usage_count", { ascending: false })
        .limit(10);
      if (search.length > 0) {
        q = q.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
      }
      const { data } = await q;
      setSavedCodes((data || []).map(d => ({ ...d, fromSaved: true })));
    } catch { /* ignore */ }
    setLoadingSaved(false);
  }, [user]);

  // Search the official HTS reference table
  const fetchReference = useCallback(async (search: string) => {
    if (search.length < 2) { setRefCodes([]); return; }
    setLoadingRef(true);
    try {
      const isNumeric = /^[\d.]+$/.test(search);
      let q = supabase
        .from("hs_code_reference" as any)
        .select("code, description, duty_rate, category")
        .limit(15);

      if (isNumeric) {
        q = q.ilike("code", `${search}%`);
      } else {
        q = q.ilike("description", `%${search}%`);
      }

      const { data } = await q;
      setRefCodes((data || []).map((d: any) => ({
        code: d.code,
        description: d.description,
        duty_rate: d.duty_rate,
        category: d.category,
        fromReference: true,
      })));
    } catch { /* ignore */ }
    setLoadingRef(false);
  }, []);

  // Fetch AI suggestions
  const fetchAiSuggestions = useCallback(async () => {
    if (!commodity || commodity.trim().length < 3) return;
    setLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-hs-codes", {
        body: { commodity },
      });
      if (!error && data?.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch { /* ignore */ }
    setLoadingAi(false);
  }, [commodity]);

  useEffect(() => {
    if (open) {
      fetchSaved(query);
      fetchReference(query);
      if (aiSuggestions.length === 0) fetchAiSuggestions();
    }
  }, [open]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSaved(val);
      fetchReference(val);
    }, 300);
  };

  const selectCode = async (suggestion: HsCodeSuggestion) => {
    setQuery(suggestion.code);
    onChange(suggestion.code);
    setOpen(false);

    // Save to user's hs_codes table
    if (user && !suggestion.fromSaved) {
      const { data: existing } = await supabase
        .from("hs_codes")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("code", suggestion.code)
        .maybeSingle();

      if (existing) {
        await supabase.from("hs_codes").update({ usage_count: (existing.usage_count || 0) + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("hs_codes").insert({
          user_id: user.id,
          code: suggestion.code,
          description: suggestion.description || "",
          duty_rate: suggestion.duty_rate || null,
          category: suggestion.category || null,
          country_notes: suggestion.country_notes || null,
          usage_count: 1,
        });
      }
    } else if (user && suggestion.fromSaved) {
      const { data: existing } = await supabase
        .from("hs_codes")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("code", suggestion.code)
        .maybeSingle();
      if (existing) {
        await supabase.from("hs_codes").update({ usage_count: (existing.usage_count || 0) + 1 }).eq("id", existing.id);
      }
    }
  };

  const SuggestionItem = ({ s, keyPrefix, variant = "outline" }: { s: HsCodeSuggestion; keyPrefix: string; variant?: "secondary" | "outline" | "default" }) => (
    <button
      key={`${keyPrefix}-${s.code}`}
      className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/10 flex items-start gap-2 text-sm"
      onClick={() => selectCode(s)}
    >
      <Badge variant={variant} className="shrink-0 font-mono text-[11px]">{s.code}</Badge>
      <div className="min-w-0">
        <p className="text-xs truncate">{s.description}</p>
        {s.duty_rate && <span className="text-[10px] text-muted-foreground">Duty: {s.duty_rate}</span>}
        {s.category && <span className="text-[10px] text-muted-foreground ml-2">• {s.category}</span>}
      </div>
    </button>
  );

  const usedCodes = new Set([...savedCodes.map(s => s.code)]);
  const filteredRef = refCodes.filter(r => !usedCodes.has(r.code));
  const allUsedCodes = new Set([...usedCodes, ...filteredRef.map(r => r.code)]);
  const filteredAi = aiSuggestions.filter(a => !allUsedCodes.has(a.code));
  const hasAny = savedCodes.length > 0 || filteredRef.length > 0 || filteredAi.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={className}
          />
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        <div className="max-h-[340px] overflow-y-auto">
          {/* Saved codes */}
          {savedCodes.length > 0 && (
            <div className="p-2 border-b">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1 flex items-center gap-1">
                <Save className="h-3 w-3" /> Your Saved Codes
              </span>
              {savedCodes.map((s) => <SuggestionItem key={s.code} s={s} keyPrefix="saved" variant="secondary" />)}
            </div>
          )}

          {/* Official HTS reference results */}
          {(filteredRef.length > 0 || loadingRef) && (
            <div className="p-2 border-b">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> US HTS Reference
                {loadingRef && <Loader2 className="h-3 w-3 animate-spin" />}
              </span>
              {filteredRef.map((s) => <SuggestionItem key={s.code} s={s} keyPrefix="ref" variant="outline" />)}
            </div>
          )}

          {/* AI suggestions */}
          <div className="p-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Suggestions
              {loadingAi && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            {!loadingAi && filteredAi.length === 0 && commodity.length >= 3 && (
              <Button variant="ghost" size="sm" className="w-full text-[11px] mt-1" onClick={fetchAiSuggestions}>
                <Sparkles className="h-3 w-3 mr-1" /> Suggest codes for "{commodity.slice(0, 30)}…"
              </Button>
            )}
            {!loadingAi && commodity.length < 3 && filteredRef.length === 0 && savedCodes.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-1 py-2">Type a code or commodity description to search.</p>
            )}
            {filteredAi.map((s) => <SuggestionItem key={s.code} s={s} keyPrefix="ai" variant="outline" />)}
            {loadingAi && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Analyzing commodity…</span>
              </div>
            )}
          </div>

          {!loadingAi && !loadingSaved && !loadingRef && !hasAny && (
            <p className="text-xs text-muted-foreground text-center py-4">No matches found. Type an HS code manually.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
