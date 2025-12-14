/**
 * CatchForm - Main form for adding/editing catches.
 * Combines all input components with validation and submission.
 */
import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SpeciesSelect } from "./SpeciesSelect";
import { LureSelect } from "./LureSelect";
import { GroundbaitSelect } from "./GroundbaitSelect";
import { TimeInput } from "./TimeInput";
import { WeightInput } from "./WeightInput";
import { LengthInput } from "./LengthInput";
import { PhotoUpload } from "./PhotoUpload";
import { CollapsibleOptional } from "./CollapsibleOptional";
import type { UseCatchFormReturn } from "@/components/hooks/useCatchForm";

export interface CatchFormProps {
  /** Form state and actions from useCatchForm hook */
  form: UseCatchFormReturn;
  /** Trip start datetime (ISO string) */
  tripStartedAt: string;
  /** Trip end datetime (ISO string) or null */
  tripEndedAt: string | null;
  /** Cancel handler */
  onCancel: () => void;
}

/**
 * Main catch form component.
 */
export function CatchForm({ form, tripStartedAt, tripEndedAt, onCancel }: CatchFormProps) {
  const {
    formData,
    errors,
    touched,
    setFieldValue,
    isSubmitting,
    submitError,
    handleSubmit,
    photoUpload,
    isEditMode,
    displayWeightKg,
    displayLengthCm,
    setDisplayWeightKg,
    setDisplayLengthCm,
  } = form;

  // Handle form submission
  const onSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit]
  );

  // Min/max dates for time input
  const minDate = React.useMemo(() => new Date(tripStartedAt), [tripStartedAt]);
  const maxDate = React.useMemo(() => (tripEndedAt ? new Date(tripEndedAt) : new Date()), [tripEndedAt]);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Form-level error */}
      {submitError && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Required fields section */}
      <div className="space-y-4">
        <SpeciesSelect
          value={formData.species_id}
          onChange={(value) => setFieldValue("species_id", value)}
          error={touched.species_id ? errors.species_id : undefined}
          disabled={isSubmitting}
        />

        <LureSelect
          value={formData.lure_id}
          onChange={(value) => setFieldValue("lure_id", value)}
          error={touched.lure_id ? errors.lure_id : undefined}
          disabled={isSubmitting}
        />

        <GroundbaitSelect
          value={formData.groundbait_id}
          onChange={(value) => setFieldValue("groundbait_id", value)}
          error={touched.groundbait_id ? errors.groundbait_id : undefined}
          disabled={isSubmitting}
        />

        <TimeInput
          value={formData.caught_at}
          onChange={(value) => setFieldValue("caught_at", value)}
          minDate={minDate}
          maxDate={maxDate}
          error={touched.caught_at ? errors.caught_at : undefined}
          disabled={isSubmitting}
        />
      </div>

      {/* Optional fields section */}
      <CollapsibleOptional>
        <WeightInput
          value={displayWeightKg}
          onChange={setDisplayWeightKg}
          error={touched.weight_g ? errors.weight_g : undefined}
          disabled={isSubmitting}
        />

        <LengthInput
          value={displayLengthCm}
          onChange={setDisplayLengthCm}
          error={touched.length_mm ? errors.length_mm : undefined}
          disabled={isSubmitting}
        />

        <PhotoUpload
          state={photoUpload.state}
          onFileSelect={photoUpload.handleFileSelect}
          onDelete={isEditMode && form.formData.photo === null ? undefined : undefined}
          error={touched.photo ? errors.photo : undefined}
          disabled={isSubmitting}
        />
      </CollapsibleOptional>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Zapisuję...
            </>
          ) : isEditMode ? (
            "Zapisz zmiany"
          ) : (
            "Dodaj połów"
          )}
        </Button>
      </div>
    </form>
  );
}
