/**
 * SearchInput - Search input field with debounce and clear button.
 * Optimized for equipment filtering.
 */
import React, { useCallback, useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Search input with icon, clear button, and accessibility support.
 */
export const SearchInput = React.memo(function SearchInput({
  value,
  onChange,
  placeholder = "Szukaj...",
  className,
  disabled = false,
}: SearchInputProps) {
  const inputId = useId();

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={cn("relative", className)}>
      {/* Search icon */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />

      {/* Input field */}
      <Input
        id={inputId}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pl-9 pr-9",
          // Hide native clear button in WebKit browsers
          "[&::-webkit-search-cancel-button]:hidden"
        )}
        aria-label="Wyszukaj sprzęt"
      />

      {/* Clear button */}
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
          aria-label="Wyczyść wyszukiwanie"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
