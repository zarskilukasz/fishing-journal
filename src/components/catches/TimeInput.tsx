/**
 * Time input component for catch form.
 * Datetime picker with trip date range validation.
 */
import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TimeInputProps {
  /** Current datetime value */
  value: Date;
  /** Callback when datetime changes */
  onChange: (value: Date) => void;
  /** Minimum allowed date (trip start) */
  minDate: Date;
  /** Maximum allowed date (trip end or now) */
  maxDate?: Date;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Formats Date to datetime-local input value (YYYY-MM-DDTHH:mm)
 */
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Time input with "Now" quick button.
 */
export const TimeInput = React.memo(function TimeInput({
  value,
  onChange,
  minDate,
  maxDate,
  error,
  disabled,
  showLabel = true,
}: TimeInputProps) {
  const inputId = React.useId();

  // Handle input change
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    },
    [onChange]
  );

  // Set to current time
  const handleSetNow = React.useCallback(() => {
    const now = new Date();
    // Ensure it's within the valid range
    if (now >= minDate && (!maxDate || now <= maxDate)) {
      onChange(now);
    } else if (maxDate && now > maxDate) {
      onChange(maxDate);
    } else {
      onChange(minDate);
    }
  }, [onChange, minDate, maxDate]);

  // Compute input constraints
  const minValue = formatDateTimeLocal(minDate);
  const maxValue = maxDate ? formatDateTimeLocal(maxDate) : formatDateTimeLocal(new Date());

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={inputId} className={error ? "text-destructive" : undefined}>
          Czas połowu
        </Label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={inputId}
            type="datetime-local"
            value={formatDateTimeLocal(value)}
            onChange={handleChange}
            min={minValue}
            max={maxValue}
            disabled={disabled}
            aria-invalid={!!error}
            className={cn("pl-10", error && "border-destructive")}
          />
        </div>
        <Button type="button" variant="secondary" size="default" onClick={handleSetNow} disabled={disabled}>
          Teraz
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
