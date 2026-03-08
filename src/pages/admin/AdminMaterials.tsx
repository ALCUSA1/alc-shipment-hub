import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, FileText, Image, Film, Download, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = ["general", "rate_sheet", "brochure", "case_study", "one_pager", "presentation", "template", "video"];
const FILE_TYPES = ["document", "image", "video", "spreadsheet", "presentation"];

const typeIcons: Record<string, any> = { document: FileText, image: Image, video: Film, spreadsheet: FileText, presentation: FileText };

const AdminMaterials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", category: "general", file_type: "document" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-promo-materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotional_materials").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let file_url: string | null = null;
      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("promotional-materials").upload(path, selectedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("promotional-materials").getPublicUrl(path);
        file_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("promotional_materials").insert({
        ...newItem,
        file_url,
        uploaded_by: user?.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-materials"] });
      setIsAddOpen(false);
      setNewItem({ name: "", description: "", category: "general", file_type: "document" });
      setSelectedFile(null);
      toast.success("Material uploaded");
    },
    onError: () => toast.error("Upload failed"),
    onSettled: () => setUploading(false),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotional_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-materials"] });
      toast.success("Material deleted");
    },
  });

  const filtered = categoryFilter === "all"
    ? materials || []
    : (materials || []).filter((m: any) => m.category === categoryFilter);

  const categoryCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = (materials || []).filter((m: any) => m.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="h-5 w-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Promotional Materials</h1>
          </div>
          <p className="text-sm text-[hsl(220,10%,50%)]">Sales collateral, rate sheets, brochures & media library</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" /> Upload Material
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,18%)] text-white">
            <DialogHeader><DialogTitle>Upload Material</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Name *</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Description</Label><Textarea className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-[hsl(220,10%,50%)]">Category</Label>
                  <Select value={newItem.category} onValueChange={v => setNewItem(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase())}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs text-[hsl(220,10%,50%)]">Type</Label>
                  <Select value={newItem.file_type} onValueChange={v => setNewItem(p => ({ ...p, file_type: v }))}>
                    <SelectTrigger className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{FILE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-[hsl(220,10%,50%)]">File</Label>
                <input ref={fileRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                <Button variant="outline" className="w-full mt-1 border-[hsl(220,15%,18%)] text-[hsl(220,10%,50%)] hover:text-white" onClick={() => fileRef.current?.click()}>
                  {selectedFile ? selectedFile.name : "Choose file…"}
                </Button>
              </div>
              <Button className="w-full bg-gradient-to-r from-red-500 to-orange-600" disabled={!newItem.name || uploading} onClick={() => upload.mutate()}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCategoryFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-[hsl(220,15%,18%)] text-white" : "text-[hsl(220,10%,45%)] hover:text-white hover:bg-[hsl(220,15%,14%)]"}`}>
          All ({materials?.length || 0})
        </button>
        {CATEGORIES.map(c => categoryCounts[c] > 0 && (
          <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === c ? "bg-[hsl(220,15%,18%)] text-white" : "text-[hsl(220,10%,45%)] hover:text-white hover:bg-[hsl(220,15%,14%)]"}`}>
            {c.replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase())} ({categoryCounts[c]})
          </button>
        ))}
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 text-xs text-[hsl(220,10%,40%)]">No materials found</div>
          ) : filtered.map((m: any) => {
            const Icon = typeIcons[m.file_type] || FileText;
            return (
              <div key={m.id} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(220,15%,15%)] flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-[hsl(220,10%,45%)] mt-0.5">{new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  {!m.is_active && <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 shrink-0">Inactive</Badge>}
                </div>
                {m.description && <p className="text-xs text-[hsl(220,10%,50%)] mb-3 line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Badge variant="outline" className="text-[10px] bg-[hsl(220,10%,15%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]">{m.category.replace(/_/g, " ")}</Badge>
                  <span className="text-[10px] text-[hsl(220,10%,35%)] ml-auto flex items-center gap-1"><Download className="h-3 w-3" />{m.download_count}</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(220,15%,13%)]">
                  {m.file_url && (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300">
                      <Eye className="h-3 w-3" /> View
                    </a>
                  )}
                  <button onClick={() => deleteMaterial.mutate(m.id)} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 ml-auto">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMaterials;
