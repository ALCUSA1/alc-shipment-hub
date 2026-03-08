import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCallback } from "react";

const STATUSES = ["all", "prospect", "pending_compliance", "active", "suspended", "inactive"];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })) },
];

function daysDiff(d1: Date, d2: Date) { return Math.floor((d1.getTime() - d2.getTime()) / 86400000); }

const AdminCompliance = () => {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-compliance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, status, fmc_license_number, fmc_license_expiry, fmc_license_status, oti_bond_number, oti_bond_surety, oti_bond_amount, cargo_insurance_expiry, cargo_insurance_provider, general_liability_expiry, general_liability_provider, sam_expiry, sam_registration, ein, w9_on_file")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customs } = useQuery({
    queryKey: ["admin-customs-filings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customs_filings").select("id, filing_type, status, shipment_id").limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((c: any) => [
    c.company_name, c.fmc_license_number, c.ein, c.oti_bond_number,
  ], []);
  const statusField = useCallback((c: any) => c.status, []);

  const { search, setSearch, filterValues, onFilterChange, filtered } = useAdminFilters({
    data: companies, searchFields, statusField,
  });

  const today = new Date();
  const expiringFields = filtered.reduce((acc: any, c: any) => {
    const fields = [
      { name: "FMC License", date: c.fmc_license_expiry },
      { name: "Cargo Insurance", date: c.cargo_insurance_expiry },
      { name: "General Liability", date: c.general_liability_expiry },
      { name: "SAM Registration", date: c.sam_expiry },
    ];
    for (const f of fields) {
      if (f.date) {
        const days = daysDiff(new Date(f.date), today);
        if (days < 0) acc.expired.push({ company: c.company_name, field: f.name, days });
        else if (days <= 60) acc.expiring.push({ company: c.company_name, field: f.name, days });
      }
    }
    return acc;
  }, { expired: [] as any[], expiring: [] as any[] });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Compliance Monitor</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">FMC licenses, bonds, insurance, customs filings across all customers</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Companies Shown</p>
          <p className="text-2xl font-bold text-white mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Expired Credentials</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{expiringFields.expired.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Expiring ≤60 Days</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{expiringFields.expiring.length}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Customs Filings</p>
          <p className="text-2xl font-bold text-white mt-1">{customs?.length || 0}</p>
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by company, FMC license, EIN, bond number…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        resultCount={filtered.length}
        resultLabel="companies"
      />

      {(expiringFields.expired.length > 0 || expiringFields.expiring.length > 0) && (
        <div className="rounded-xl border border-red-500/20 bg-[hsl(220,18%,10%)] p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white">Compliance Alerts</h2>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {expiringFields.expired.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Expired</Badge>
                <span className="text-white font-medium">{e.company}</span>
                <span className="text-[hsl(220,10%,50%)]">— {e.field} ({Math.abs(e.days)} days ago)</span>
              </div>
            ))}
            {expiringFields.expiring.map((e: any, i: number) => (
              <div key={`e-${i}`} className="flex items-center gap-3 text-xs">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Expiring</Badge>
                <span className="text-white font-medium">{e.company}</span>
                <span className="text-[hsl(220,10%,50%)]">— {e.field} (in {e.days} days)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-center px-4 py-3">FMC</th>
                <th className="text-center px-4 py-3">OTI Bond</th>
                <th className="text-center px-4 py-3">Cargo Ins.</th>
                <th className="text-center px-4 py-3">GL Ins.</th>
                <th className="text-center px-4 py-3">W-9</th>
                <th className="text-center px-4 py-3">EIN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No companies match your filters</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{c.company_name}</td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.fmc_license_number} /></td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.oti_bond_number} /></td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.cargo_insurance_provider} date={c.cargo_insurance_expiry} /></td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.general_liability_provider} date={c.general_liability_expiry} /></td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.w9_on_file ? "yes" : null} /></td>
                  <td className="px-4 py-3 text-center"><ComplianceDot value={c.ein} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

function ComplianceDot({ value, date }: { value: string | null | undefined; date?: string | null }) {
  if (!value) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-[hsl(220,10%,25%)]" title="Missing" />;
  if (date) {
    const days = daysDiff(new Date(date), new Date());
    if (days < 0) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" title="Expired" />;
    if (days <= 60) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" title={`Expiring in ${days} days`} />;
  }
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" title="Valid" />;
}

export default AdminCompliance;
