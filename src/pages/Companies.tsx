import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Building2, Plus, Search, AlertTriangle, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { format, isBefore, addDays } from "date-fns";
import { AddCompanyDialog } from "@/components/crm/AddCompanyDialog";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  prospect: { label: "Prospect", color: "bg-secondary text-muted-foreground", icon: Clock },
  pending_compliance: { label: "Pending Compliance", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive", icon: XCircle },
  inactive: { label: "Inactive", color: "bg-secondary text-muted-foreground", icon: XCircle },
};

const Companies = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("company_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = companies.filter((c: any) => {
    const matchesSearch =
      !search ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.fmc_license_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.ein?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasExpiringDocs = (company: any) => {
    const now = new Date();
    const soon = addDays(now, 30);
    const dates = [
      company.fmc_license_expiry,
      company.cargo_insurance_expiry,
      company.general_liability_expiry,
      company.sam_expiry,
    ].filter(Boolean);
    return dates.some((d: string) => isBefore(new Date(d), soon));
  };

  const counts = {
    all: companies.length,
    prospect: companies.filter((c: any) => c.status === "prospect").length,
    pending_compliance: companies.filter((c: any) => c.status === "pending_compliance").length,
    active: companies.filter((c: any) => c.status === "active").length,
    suspended: companies.filter((c: any) => c.status === "suspended").length,
    inactive: companies.filter((c: any) => c.status === "inactive").length,
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground">Manage NVOCC customers and compliance</p>
        </div>
        <Button variant="electric" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(["prospect", "pending_compliance", "active", "suspended", "inactive"] as const).map((s) => {
          const config = STATUS_CONFIG[s];
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${statusFilter === s ? "ring-2 ring-accent" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{config.label}</p>
                <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by company name, FMC license, or EIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({counts.all})</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label} ({counts[key as keyof typeof counts]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Company list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 bg-secondary animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all" ? "No companies match your filters." : "No companies yet. Add your first NVOCC customer."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((company: any) => {
            const config = STATUS_CONFIG[company.status] || STATUS_CONFIG.prospect;
            const StatusIcon = config.icon;
            const expiring = hasExpiringDocs(company);

            return (
              <Link key={company.id} to={`/dashboard/companies/${company.id}`}>
                <Card className="hover:border-accent/40 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{company.company_name}</h3>
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-1" />
                              {config.label}
                            </Badge>
                            {expiring && (
                              <Badge variant="outline" className="text-[10px] border-yellow-400 text-yellow-600 bg-yellow-50">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                Expiring
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {company.fmc_license_number && <span>FMC: {company.fmc_license_number}</span>}
                            {company.ein && <span>EIN: {company.ein}</span>}
                            {company.city && company.state && <span>{company.city}, {company.state}</span>}
                            {company.credit_terms && <span className="capitalize">{company.credit_terms}</span>}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AddCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
};

export default Companies;
