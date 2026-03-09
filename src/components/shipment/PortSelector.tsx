import { useState } from "react";
import { Check, ChevronsUpDown, Anchor, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Port {
  code: string;
  name: string;
  country: string;
}

interface PortSelectorProps {
  ports: Port[];
  value: string;
  onValueChange: (code: string) => void;
  placeholder?: string;
}

export function PortSelector({ ports, value, onValueChange, placeholder = "Select port..." }: PortSelectorProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const selectedPort = ports.find((p) => p.code === value);

  // Fetch recently used ports from user's shipments
  const { data: recentPorts = [] } = useQuery({
    queryKey: ["recent-ports", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("origin_port, destination_port")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data) return [];
      const codes = new Set<string>();
      data.forEach(s => {
        if (s.origin_port) codes.add(s.origin_port);
        if (s.destination_port) codes.add(s.destination_port);
      });
      // Return first 5 unique port codes that exist in ports list
      return Array.from(codes)
        .map(code => ports.find(p => p.code === code))
        .filter(Boolean)
        .slice(0, 5) as Port[];
    },
    enabled: !!user && ports.length > 0,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between mt-1 font-normal"
        >
          {selectedPort ? (
            <span className="truncate">{selectedPort.name} ({selectedPort.code})</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search port name or code..." />
          <CommandList>
            <CommandEmpty>No port found.</CommandEmpty>

            {/* Recently Used Ports */}
            {recentPorts.length > 0 && (
              <CommandGroup heading="Recently Used">
                {recentPorts.map((port) => (
                  <CommandItem
                    key={`recent-${port.code}`}
                    value={`recent ${port.name} ${port.code} ${port.country}`}
                    onSelect={() => {
                      onValueChange(port.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === port.code ? "opacity-100" : "opacity-0")} />
                    <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{port.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{port.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="All Ports">
              {ports.map((port) => (
                <CommandItem
                  key={port.code}
                  value={`${port.name} ${port.code} ${port.country}`}
                  onSelect={() => {
                    onValueChange(port.code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === port.code ? "opacity-100" : "opacity-0")} />
                  <Anchor className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{port.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{port.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
