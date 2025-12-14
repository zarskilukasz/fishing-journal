/**
 * Reusable Combobox component for catch form selects.
 * Based on Radix Popover + cmdk Command.
 */
import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { SelectOption } from "./types";

export interface ComboboxProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Text shown when no options match search */
  emptyText?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Custom className for trigger button */
  className?: string;
  /** Called when search input changes (for server-side search) */
  onSearchChange?: (search: string) => void;
  /** Icon to show before each option */
  optionIcon?: React.ReactNode;
}

/**
 * Combobox component with search functionality.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Wybierz...",
  searchPlaceholder = "Szukaj...",
  emptyText = "Brak wyników",
  error,
  disabled,
  isLoading,
  className,
  onSearchChange,
  optionIcon,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Find selected option for display
  const selectedOption = React.useMemo(() => options.find((opt) => opt.value === value), [options, value]);

  // Handle search change with optional callback
  const handleSearchChange = React.useCallback(
    (newSearch: string) => {
      setSearch(newSearch);
      onSearchChange?.(newSearch);
    },
    [onSearchChange]
  );

  // Handle option select
  const handleSelect = React.useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={!!error}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-[#ffffff] text-foreground",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={handleSearchChange} />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem key={option.value} value={option.label} onSelect={() => handleSelect(option.value)}>
                      {optionIcon}
                      <span className="flex-1 truncate">{option.label}</span>
                      <Check className={cn("h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
