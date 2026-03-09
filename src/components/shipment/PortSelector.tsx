import { useState } from "react";
import { Check, ChevronsUpDown, Anchor, Clock, Plane } from "lucide-react";
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
  mode?: "ocean" | "air";
}

export function PortSelector({ ports, value, onValueChange, placeholder = "Select port...", mode = "ocean" }: PortSelectorProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAir = mode === "air";

  const selectedPort = ports.find((p) => p.code === value);

  // Fetch recently used ports from user's shipments
  const { data: recentPorts = [] } = useQuery({
    queryKey: ["recent-ports", user?.id, mode],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("origin_port, destination_port, airport_of_departure, airport_of_destination")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data) return [];
      const codes = new Set<string>();
      data.forEach(s => {
        if (isAir) {
          if ((s as any).airport_of_departure) codes.add((s as any).airport_of_departure);
          if ((s as any).airport_of_destination) codes.add((s as any).airport_of_destination);
        }
        if (s.origin_port) codes.add(s.origin_port);
        if (s.destination_port) codes.add(s.destination_port);
      });
      return Array.from(codes)
        .map(code => ports.find(p => p.code === code))
        .filter(Boolean)
        .slice(0, 5) as Port[];
    },
    enabled: !!user && ports.length > 0,
  });

  const IconComponent = isAir ? Plane : Anchor;
  const searchLabel = isAir ? "Search airport name or IATA code..." : "Search port name or code...";
  const emptyLabel = isAir ? "No airport found." : "No port found.";
  const allLabel = isAir ? "All Airports" : "All Ports";

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
          <CommandInput placeholder={searchLabel} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>

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

            <CommandGroup heading={allLabel}>
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
                  <IconComponent className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
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
