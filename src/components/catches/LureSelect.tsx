/**
 * Lure select component for catch form.
 * Shows user's active lures.
 */
import * as React from "react";
import { Anchor } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Combobox } from "./Combobox";
import { useCatchSelectData } from "@/components/hooks";

export interface LureSelectProps {
  /** Current selected lure ID */
  value: string;
  /** Callback when lure changes */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Combobox for selecting lure from user's equipment.
 */
export const LureSelect = React.memo(function LureSelect({
  value,
  onChange,
  error,
  disabled,
  showLabel = true,
}: LureSelectProps) {
  const { lures, isLoadingLures } = useCatchSelectData();

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="lure" className={error ? "text-destructive" : undefined}>
          Przynęta <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
        </Label>
      )}
      <Combobox
        value={value}
        onChange={onChange}
        options={lures}
        placeholder="Wybierz przynętę..."
        searchPlaceholder="Szukaj przynęty..."
        emptyText="Brak przynęt. Dodaj je w ustawieniach."
        error={error}
        disabled={disabled}
        isLoading={isLoadingLures}
        optionIcon={<Anchor className="h-4 w-4 text-muted-foreground" />}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
