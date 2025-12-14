/**
 * Length input component for catch form.
 * Displays in centimeters, stores as millimeters.
 */
import * as React from "react";
import { Ruler } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface LengthInputProps {
  /** Current length in centimeters (display value) */
  value: number | null;
  /** Callback when length changes (in centimeters) */
  onChange: (value: number | null) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Length input with cm suffix.
 */
export const LengthInput = React.memo(function LengthInput({
  value,
  onChange,
  error,
  disabled,
  showLabel = true,
}: LengthInputProps) {
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
          Długość
        </Label>
      )}
      <div className="relative">
        <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          max="300"
          placeholder="np. 45"
          value={value ?? ""}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn("pl-10 pr-12", error && "border-destructive")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">cm</span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
