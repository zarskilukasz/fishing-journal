/**
 * Groundbait select component for catch form.
 * Shows user's active groundbaits.
 */
import * as React from "react";
import { Wheat } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Combobox } from "./Combobox";
import { useCatchSelectData } from "@/components/hooks";

export interface GroundbaitSelectProps {
  /** Current selected groundbait ID */
  value: string;
  /** Callback when groundbait changes */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Combobox for selecting groundbait from user's equipment.
 */
export const GroundbaitSelect = React.memo(function GroundbaitSelect({
  value,
  onChange,
  error,
  disabled,
  showLabel = true,
}: GroundbaitSelectProps) {
  const { groundbaits, isLoadingGroundbaits } = useCatchSelectData();

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="groundbait" className={error ? "text-destructive" : undefined}>
          Zanęta <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
        </Label>
      )}
      <Combobox
        value={value}
        onChange={onChange}
        options={groundbaits}
        placeholder="Wybierz zanętę..."
        searchPlaceholder="Szukaj zanęty..."
        emptyText="Brak zanęt. Dodaj je w ustawieniach."
        error={error}
        disabled={disabled}
        isLoading={isLoadingGroundbaits}
        optionIcon={<Wheat className="h-4 w-4 text-muted-foreground" />}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
