import { useState } from "react";
import { Check, ChevronsUpDown, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  const selectedPort = ports.find((p) => p.code === value);

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
            <CommandGroup>
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
