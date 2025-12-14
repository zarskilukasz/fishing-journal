/**
 * Species select component for catch form.
 * Fetches fish species from global dictionary.
 */
import * as React from "react";
import { Fish } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Combobox } from "./Combobox";
import { useCatchSelectData } from "@/components/hooks";

export interface SpeciesSelectProps {
  /** Current selected species ID */
  value: string;
  /** Callback when species changes */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Combobox for selecting fish species with search.
 */
export const SpeciesSelect = React.memo(function SpeciesSelect({
  value,
  onChange,
  error,
  disabled,
  showLabel = true,
}: SpeciesSelectProps) {
  const { species, isLoadingSpecies, setSpeciesSearchQuery } = useCatchSelectData();

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="species" className={error ? "text-destructive" : undefined}>
          Gatunek ryby
        </Label>
      )}
      <Combobox
        value={value}
        onChange={onChange}
        options={species}
        placeholder="Wybierz gatunek..."
        searchPlaceholder="Szukaj gatunku..."
        emptyText="Nie znaleziono gatunku"
        error={error}
        disabled={disabled}
        isLoading={isLoadingSpecies}
        onSearchChange={setSpeciesSearchQuery}
        optionIcon={<Fish className="h-4 w-4 text-muted-foreground" />}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
