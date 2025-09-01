import React from 'react';
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
    import { Button } from "@/components/ui/button";
    import { Badge } from "@/components/ui/badge";
    import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
    import { cn } from "@/lib/utils";
    import { X, Check } from 'lucide-react';

    const MultiSelect = ({ options, selected, onChange, className, ...props }) => {
      const [open, setOpen] = React.useState(false);

      const handleUnselect = (item) => {
        onChange(selected.filter((i) => i !== item));
      };

      const selectedLabels = options.filter(option => selected.includes(option.value));

      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-[180px] justify-between h-8 text-xs", selected.length > 0 ? 'h-auto' : 'h-8', className)}
              onClick={() => setOpen(!open)}
            >
              <div className="flex flex-wrap gap-1 items-center">
                {selectedLabels.length > 0 ? selectedLabels.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="rounded-sm"
                  >
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => { e.stopPropagation(); handleUnselect(option.value); }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                )) : <span className="text-muted-foreground">Assigner...</span>}
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command className={className}>
              <CommandInput placeholder="Rechercher..." />
              <CommandList>
                <CommandEmpty>Aucun résultat.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          onChange(
                            isSelected
                              ? selected.filter((item) => item !== option.value)
                              : [...selected, option.value]
                          );
                        }}
                      >
                         <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    };

    export { MultiSelect };