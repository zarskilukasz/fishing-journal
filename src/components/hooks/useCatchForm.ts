/**
 * Custom hook for managing catch form state, validation, and submission.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePhotoUpload, type UsePhotoUploadReturn } from "./usePhotoUpload";
import { createCatch, updateCatch, getCatchApiErrorMessage } from "@/lib/api/catches";
import {
  catchFormSchema,
  validateCaughtAtInTripRange,
  kgToGrams,
  gramsToKg,
  cmToMm,
  mmToCm,
} from "@/lib/schemas/catch-form.schema";
import {
  type CatchFormData,
  type CatchFormErrors,
  type CatchFormTouched,
  CATCH_FORM_DEFAULTS,
  CATCH_FORM_TOUCHED_DEFAULTS,
  catchDtoToFormData,
} from "@/components/catches/types";
import type { CatchDto, CreateCatchCommand, UpdateCatchCommand } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for useCatchForm hook.
 */
export interface UseCatchFormOptions {
  /** Trip ID to add catch to */
  tripId: string;
  /** Trip start datetime (ISO string) */
  tripStartedAt: string;
  /** Trip end datetime (ISO string) or null if still active */
  tripEndedAt: string | null;
  /** Existing catch data (for edit mode) */
  existingCatch?: CatchDto;
  /** Callback on successful submission */
  onSuccess?: (catchData: CatchDto) => void;
}

/**
 * Return type for useCatchForm hook.
 */
export interface UseCatchFormReturn {
  /** Current form data */
  formData: CatchFormData;
  /** Field validation errors */
  errors: CatchFormErrors;
  /** Which fields have been touched */
  touched: CatchFormTouched;
  /** Update a field value */
  setFieldValue: <K extends keyof CatchFormData>(field: K, value: CatchFormData[K]) => void;
  /** Mark a field as touched */
  setFieldTouched: (field: keyof CatchFormTouched) => void;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Form-level submit error */
  submitError: string | null;
  /** Submit the form */
  handleSubmit: () => Promise<void>;
  /** Reset form to initial state */
  resetForm: () => void;
  /** Photo upload state and handlers */
  photoUpload: UsePhotoUploadReturn;
  /** Whether editing existing catch */
  isEditMode: boolean;
  /** Display weight in kg (for WeightInput) */
  displayWeightKg: number | null;
  /** Display length in cm (for LengthInput) */
  displayLengthCm: number | null;
  /** Set display weight (converts to g internally) */
  setDisplayWeightKg: (value: number | null) => void;
  /** Set display length (converts to mm internally) */
  setDisplayLengthCm: (value: number | null) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for managing catch form state, validation, and submission.
 */
export function useCatchForm(options: UseCatchFormOptions): UseCatchFormReturn {
  const { tripId, tripStartedAt, tripEndedAt, existingCatch, onSuccess } = options;

  const isEditMode = !!existingCatch;

  // Initialize form data from existing catch or defaults
  const initialFormData = useMemo<CatchFormData>(() => {
    if (existingCatch) {
      return catchDtoToFormData(existingCatch);
    }
    return {
      ...CATCH_FORM_DEFAULTS,
      caught_at: new Date(),
    };
  }, [existingCatch]);

  // Form state
  const [formData, setFormData] = useState<CatchFormData>(initialFormData);
  const [errors, setErrors] = useState<CatchFormErrors>({});
  const [touched, setTouched] = useState<CatchFormTouched>(CATCH_FORM_TOUCHED_DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Display values for weight/length (user-friendly units)
  const [displayWeightKg, setDisplayWeightKgState] = useState<number | null>(() => gramsToKg(initialFormData.weight_g));
  const [displayLengthCm, setDisplayLengthCmState] = useState<number | null>(() => mmToCm(initialFormData.length_mm));

  // Photo upload hook
  const photoUpload = usePhotoUpload(existingCatch?.photo_path);

  // Fetch existing photo URL on mount (edit mode)
  useEffect(() => {
    if (existingCatch?.id && existingCatch?.photo_path) {
      photoUpload.fetchDownloadUrl(existingCatch.id);
    }
  }, [existingCatch?.id, existingCatch?.photo_path, photoUpload]);

  // ---------------------------------------------------------------------------
  // Field setters
  // ---------------------------------------------------------------------------

  const setFieldValue = useCallback(<K extends keyof CatchFormData>(field: K, value: CatchFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const setFieldTouched = useCallback((field: keyof CatchFormTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Weight setter (kg → g conversion)
  const setDisplayWeightKg = useCallback(
    (value: number | null) => {
      setDisplayWeightKgState(value);
      setFieldValue("weight_g", kgToGrams(value));
    },
    [setFieldValue]
  );

  // Length setter (cm → mm conversion)
  const setDisplayLengthCm = useCallback(
    (value: number | null) => {
      setDisplayLengthCmState(value);
      setFieldValue("length_mm", cmToMm(value));
    },
    [setFieldValue]
  );

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateForm = useCallback((): CatchFormErrors => {
    const validationErrors: CatchFormErrors = {};

    // Run Zod schema validation
    const result = catchFormSchema.safeParse({
      species_id: formData.species_id,
      lure_id: formData.lure_id,
      groundbait_id: formData.groundbait_id,
      caught_at: formData.caught_at,
      weight_g: formData.weight_g,
      length_mm: formData.length_mm,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CatchFormErrors;
        if (field && !validationErrors[field]) {
          validationErrors[field] = issue.message;
        }
      }
    }

    // Additional trip date range validation
    const caughtAtError = validateCaughtAtInTripRange(formData.caught_at, tripStartedAt, tripEndedAt);
    if (caughtAtError) {
      validationErrors.caught_at = caughtAtError;
    }

    return validationErrors;
  }, [formData, tripStartedAt, tripEndedAt]);

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched
    setTouched({
      species_id: true,
      lure_id: true,
      groundbait_id: true,
      caught_at: true,
      weight_g: true,
      length_mm: true,
      photo: true,
    });

    // Validate
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let resultCatch: CatchDto;

      // Convert empty strings to null for optional equipment fields
      const lureId = formData.lure_id || null;
      const groundbaitId = formData.groundbait_id || null;

      if (isEditMode && existingCatch) {
        // Update existing catch
        const command: UpdateCatchCommand = {
          caught_at: formData.caught_at.toISOString(),
          species_id: formData.species_id,
          lure_id: lureId,
          groundbait_id: groundbaitId,
          weight_g: formData.weight_g,
          length_mm: formData.length_mm,
        };
        resultCatch = await updateCatch(existingCatch.id, command);
      } else {
        // Create new catch
        const command: CreateCatchCommand = {
          caught_at: formData.caught_at.toISOString(),
          species_id: formData.species_id,
          lure_id: lureId ?? undefined,
          groundbait_id: groundbaitId ?? undefined,
          weight_g: formData.weight_g ?? undefined,
          length_mm: formData.length_mm ?? undefined,
        };
        resultCatch = await createCatch(tripId, command);
      }

      // Upload photo if selected
      if (photoUpload.selectedFile) {
        const uploadResult = await photoUpload.uploadPhoto(resultCatch.id);
        if (uploadResult) {
          resultCatch = { ...resultCatch, photo_path: uploadResult.photo_path };
        }
      }

      onSuccess?.(resultCatch);
    } catch (error) {
      const message = getCatchApiErrorMessage(error);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditMode, existingCatch, tripId, photoUpload, validateForm, onSuccess]);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setTouched(CATCH_FORM_TOUCHED_DEFAULTS);
    setSubmitError(null);
    setDisplayWeightKgState(gramsToKg(initialFormData.weight_g));
    setDisplayLengthCmState(mmToCm(initialFormData.length_mm));
    photoUpload.clearState();
  }, [initialFormData, photoUpload]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    formData,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    isSubmitting,
    submitError,
    handleSubmit,
    resetForm,
    photoUpload,
    isEditMode,
    displayWeightKg,
    displayLengthCm,
    setDisplayWeightKg,
    setDisplayLengthCm,
  };
}
