/**
 * Weight input component for catch form.
 * Displays in kilograms, stores as grams.
 */
import * as React from "react";
import { Scale } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface WeightInputProps {
  /** Current weight in kilograms (display value) */
  value: number | null;
  /** Callback when weight changes (in kilograms) */
  onChange: (value: number | null) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Weight input with kg suffix.
 */
export const WeightInput = React.memo(function WeightInput({
  value,
  onChange,
  error,
  disabled,
  showLabel = true,
}: WeightInputProps) {
  const inputId = React.useId();

  // Handle input change
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (inputValue === "" || inputValue === null) {
        onChange(null);
        return;
      }

      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange(numValue);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={inputId} className={error ? "text-destructive" : undefined}>
          Waga
        </Label>
      )}
      <div className="relative">
        <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="100"
          placeholder="np. 1.5"
          value={value ?? ""}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn("pl-10 pr-12", error && "border-destructive")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
