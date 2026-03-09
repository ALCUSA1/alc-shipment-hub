import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building2, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanyDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCompany: (company: { id: string; company_name: string; company_type: string; user_id: string }) => void;
  currentUserId: string;
}

const typeColors: Record<string, string> = {
  customer: "bg-accent/10 text-accent",
  consignee: "bg-emerald-100 text-emerald-700",
  trucking: "bg-amber-100 text-amber-700",
  warehouse: "bg-purple-100 text-purple-700",
  carrier: "bg-rose-100 text-rose-700",
};

export function CompanyDirectoryDialog({ open, onOpenChange, onSelectCompany, currentUserId }: CompanyDirectoryDialogProps) {
  const [search, setSearch] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["company-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, company_type, city, state, country, industry, user_id")
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = companies.filter(
    (c) =>
      c.user_id !== currentUserId &&
      (c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        c.company_type.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Company Directory
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading directory…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No companies found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    onSelectCompany(company);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{company.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[company.city, company.state, company.country].filter(Boolean).join(", ")}
                      {company.industry && ` · ${company.industry}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${typeColors[company.company_type] || "bg-secondary text-secondary-foreground"}`}>
                      {company.company_type}
                    </Badge>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
