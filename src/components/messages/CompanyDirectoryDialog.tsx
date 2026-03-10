import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanyDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: { user_id: string; full_name: string; company_name: string }) => void;
  currentUserId: string;
  currentCompanyName: string;
}

export function CompanyDirectoryDialog({ open, onOpenChange, onSelectUser, currentUserId, currentCompanyName }: CompanyDirectoryDialogProps) {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name, role")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = users.filter(
    (u) =>
      u.user_id !== currentUserId &&
      ((u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.role || "").toLowerCase().includes(search.toLowerCase()))
  );

  // Sort: same company first
  const sorted = [...filtered].sort((a, b) => {
    const aInternal = a.company_name?.toLowerCase() === currentCompanyName?.toLowerCase() ? 0 : 1;
    const bInternal = b.company_name?.toLowerCase() === currentCompanyName?.toLowerCase() ? 0 : 1;
    return aInternal - bInternal;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Directory
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading directory…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <div className="space-y-1">
              {sorted.map((user) => {
                const isSameCompany =
                  currentCompanyName &&
                  user.company_name?.toLowerCase() === currentCompanyName.toLowerCase();
                return (
                  <button
                    key={user.user_id}
                    onClick={() => {
                      onSelectUser({
                        user_id: user.user_id,
                        full_name: user.full_name || user.company_name || "Unknown",
                        company_name: user.company_name || "",
                      });
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.full_name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.company_name || "No company"}
                        {user.role && ` · ${user.role}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSameCompany && (
                        <Badge variant="secondary" className="text-[10px]">
                          Same Company
                        </Badge>
                      )}
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
