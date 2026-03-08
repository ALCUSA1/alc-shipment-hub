import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback } from "react";
import { Link } from "react-router-dom";

const AdminPartners = () => {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-all-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_contacts")
        .select("*, companies(company_name, status)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((c: any) => [
    c.full_name, c.email, c.phone, c.role, (c.companies as any)?.company_name,
  ], []);

  const { search, setSearch, filtered } = useAdminFilters({
    data: contacts, searchFields,
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Handshake className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Partners & Contacts</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">All company contacts across tenants</p>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by name, company, email, role…"
        search={search}
        onSearchChange={setSearch}
        resultCount={filtered.length}
        resultLabel="contacts"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No contacts match your search</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{c.full_name}</td>
                  <td className="px-4 py-3 text-xs">{(c.companies as any)?.company_name ? <Link to={`/admin/crm/${c.company_id}`} className="text-indigo-400 hover:text-indigo-300">{(c.companies as any).company_name}</Link> : "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{c.role}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPartners;
