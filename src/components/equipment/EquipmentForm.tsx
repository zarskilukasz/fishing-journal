/**
 * EquipmentForm - Form for creating/editing equipment.
 * Uses manual validation with Zod (like CatchForm).
 */
import React, { useState, useCallback, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { equipmentFormSchema } from "@/lib/schemas/equipment-form.schema";
import type { EquipmentFormValues } from "./types";

export interface EquipmentFormProps {
  defaultValues?: EquipmentFormValues;
  onSubmit: (data: EquipmentFormValues) => void;
  isSubmitting: boolean;
  serverError?: string | null;
  formId: string;
}

/**
 * Equipment form with name input and validation.
 */
export const EquipmentForm = React.memo(function EquipmentForm({
  defaultValues = { name: "" },
  onSubmit,
  isSubmitting,
  serverError,
  formId,
}: EquipmentFormProps) {
  const inputId = useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState(defaultValues.name);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Display server error
  useEffect(() => {
    if (serverError) {
      setError(serverError);
    }
  }, [serverError]);

  // Validate name
  const validate = useCallback((value: string): string | null => {
    const result = equipmentFormSchema.safeParse({ name: value });
    if (!result.success) {
      return result.error.issues[0]?.message ?? "Błąd walidacji";
    }
    return null;
  }, []);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setName(value);
      if (touched) {
        setError(validate(value));
      }
    },
    [touched, validate]
  );

  // Handle blur
  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(validate(name));
  }, [name, validate]);

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      setTouched(true);
      const validationError = validate(name);
      setError(validationError);

      if (validationError) {
        return;
      }

      onSubmit({ name: name.trim() });
    },
    [name, validate, onSubmit]
  );

  const displayError = touched ? error : null;

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          Nazwa
        </Label>
        <Input
          ref={inputRef}
          id={inputId}
          value={name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Wpisz nazwę..."
          disabled={isSubmitting}
          className={cn(displayError && "border-destructive focus-visible:ring-destructive")}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${inputId}-error` : undefined}
        />
        {displayError && (
          <p id={`${inputId}-error`} className="text-sm text-destructive" role="alert">
            {displayError}
          </p>
        )}
      </div>
    </form>
  );
});
