import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "ocean_freight", label: "Ocean Freight" },
  { value: "trucking", label: "Trucking" },
  { value: "customs", label: "Customs & Duties" },
  { value: "warehousing", label: "Warehousing" },
  { value: "handling", label: "Handling Fees" },
  { value: "documentation", label: "Documentation" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const ENTRY_TYPES = [
  { value: "revenue", label: "Revenue" },
  { value: "cost", label: "Cost of Goods/Services" },
  { value: "expense", label: "Operating Expense" },
];

interface FinancialEntry {
  id: string;
  entry_type: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  vendor: string | null;
  invoice_ref: string | null;
  date: string | null;
  notes: string | null;
}

interface ShipmentPnLProps {
  shipmentId: string;
  quoteAmount?: number | null;
  shipmentStatus?: string;
}

const COMPLETED_STATUSES = ["delivered", "completed", "cancelled"];

export function ShipmentPnL({ shipmentId, quoteAmount, shipmentStatus }: ShipmentPnLProps) {
  const isEditable = !COMPLETED_STATUSES.includes(shipmentStatus || "");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    entry_type: "cost",
    category: "ocean_freight",
    description: "",
    amount: "",
    vendor: "",
    invoice_ref: "",
    notes: "",
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["shipment-financials", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_financials")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FinancialEntry[];
    },
    enabled: !!shipmentId,
  });

  const handleSave = async () => {
    if (!form.description || !form.amount) {
      toast({ title: "Missing fields", description: "Description and amount are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("shipment_financials").insert({
        shipment_id: shipmentId,
        user_id: user!.id,
        entry_type: form.entry_type,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        vendor: form.vendor || null,
        invoice_ref: form.invoice_ref || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Entry added" });
      setForm({ entry_type: "cost", category: "ocean_freight", description: "", amount: "", vendor: "", invoice_ref: "", notes: "" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shipment-financials", shipmentId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("shipment_financials").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shipment-financials", shipmentId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate P&L
  const revenueFromQuote = quoteAmount || 0;
  const revenueEntries = entries.filter((e) => e.entry_type === "revenue");
  const costEntries = entries.filter((e) => e.entry_type === "cost");
  const expenseEntries = entries.filter((e) => e.entry_type === "expense");

  const totalRevenue = revenueFromQuote + revenueEntries.reduce((s, e) => s + e.amount, 0);
  const totalCOGS = costEntries.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Group by category
  const groupByCategory = (items: FinancialEntry[]) => {
    const groups: Record<string, { label: string; total: number; items: FinancialEntry[] }> = {};
    items.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = {
          label: CATEGORIES.find((c) => c.value === item.category)?.label || item.category,
          total: 0,
          items: [],
        };
      }
      groups[item.category].total += item.amount;
      groups[item.category].items.push(item);
    });
    return Object.values(groups);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-accent" />
          Profit & Loss Statement
        </CardTitle>
        {isEditable && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="electric" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Financial Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Input className="mt-1" placeholder="e.g. Ocean freight to LA" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount (USD) *</Label>
                  <Input type="number" className="mt-1" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Input className="mt-1" placeholder="e.g. Maersk" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Ref</Label>
                  <Input className="mt-1" placeholder="INV-001" value={form.invoice_ref} onChange={(e) => setForm({ ...form, invoice_ref: e.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input className="mt-1" placeholder="Optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="electric" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Total Revenue" value={fmt(totalRevenue)} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
          <SummaryCard label="Total COGS" value={fmt(totalCOGS)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
          <SummaryCard label="Gross Profit" value={fmt(grossProfit)} sub={`${grossMargin.toFixed(1)}% margin`} positive={grossProfit >= 0} />
          <SummaryCard label="Net Profit" value={fmt(netProfit)} sub={`${netMargin.toFixed(1)}% margin`} positive={netProfit >= 0} />
        </div>

        {/* Full P&L Statement */}
        <div className="space-y-1 text-sm">
          {/* Revenue */}
          <StatementHeader title="Revenue" />
          {revenueFromQuote > 0 && (
            <StatementRow label="Accepted Quote" amount={fmt(revenueFromQuote)} indent />
          )}
          {revenueEntries.map((e) => (
            <StatementRow key={e.id} label={e.description} amount={fmt(e.amount)} indent sub={e.vendor || undefined} onDelete={() => handleDelete(e.id)} deleting={deletingId === e.id} />
          ))}
          <StatementTotal label="Total Revenue" amount={fmt(totalRevenue)} />

          <Separator className="my-3" />

          {/* COGS */}
          <StatementHeader title="Cost of Goods/Services" />
          {groupByCategory(costEntries).map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground pl-4 pt-1">{group.label}</p>
              {group.items.map((e) => (
                <StatementRow key={e.id} label={e.description} amount={`(${fmt(e.amount)})`} indent sub={e.vendor || undefined} onDelete={() => handleDelete(e.id)} deleting={deletingId === e.id} />
              ))}
            </div>
          ))}
          {costEntries.length === 0 && <p className="text-xs text-muted-foreground pl-4 py-1">No cost entries yet</p>}
          <StatementTotal label="Total COGS" amount={`(${fmt(totalCOGS)})`} />

          <Separator className="my-3" />

          {/* Gross Profit */}
          <StatementTotal label="Gross Profit" amount={fmt(grossProfit)} highlight positive={grossProfit >= 0} />
          <p className="text-xs text-muted-foreground pl-4">{grossMargin.toFixed(1)}% gross margin</p>

          <Separator className="my-3" />

          {/* Operating Expenses */}
          <StatementHeader title="Operating Expenses" />
          {groupByCategory(expenseEntries).map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground pl-4 pt-1">{group.label}</p>
              {group.items.map((e) => (
                <StatementRow key={e.id} label={e.description} amount={`(${fmt(e.amount)})`} indent sub={e.vendor || undefined} onDelete={() => handleDelete(e.id)} deleting={deletingId === e.id} />
              ))}
            </div>
          ))}
          {expenseEntries.length === 0 && <p className="text-xs text-muted-foreground pl-4 py-1">No expense entries yet</p>}
          <StatementTotal label="Total Operating Expenses" amount={`(${fmt(totalExpenses)})`} />

          <Separator className="my-3" />

          {/* Net Profit */}
          <div className={`flex items-center justify-between py-2 px-4 rounded-md font-bold text-base ${netProfit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            <span>Net Profit</span>
            <span>{fmt(netProfit)}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-4">{netMargin.toFixed(1)}% net margin</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, icon, sub, positive }: { label: string; value: string; icon?: React.ReactNode; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${positive !== undefined ? (positive ? "text-green-700" : "text-red-600") : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatementHeader({ title }: { title: string }) {
  return <p className="font-semibold text-foreground text-sm pt-1">{title}</p>;
}

function StatementRow({ label, amount, indent, sub, onDelete, deleting }: { label: string; amount: string; indent?: boolean; sub?: string; onDelete?: () => void; deleting?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 group ${indent ? "pl-4" : ""}`}>
      <div>
        <span className="text-foreground">{label}</span>
        {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-foreground">{amount}</span>
        {onDelete && (
          <button onClick={onDelete} disabled={deleting} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function StatementTotal({ label, amount, highlight, positive }: { label: string; amount: string; highlight?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 font-semibold ${highlight ? (positive ? "text-green-700" : "text-red-600") : "text-foreground"}`}>
      <span>{label}</span>
      <span className="font-mono">{amount}</span>
    </div>
  );
}
