/**
 * Types for catch form components and state management.
 */
import type { CatchDto, CatchPhotoUploadResponseDto, FishSpeciesDto, LureDto, GroundbaitDto } from "@/types";

// ---------------------------------------------------------------------------
// Form Data Types
// ---------------------------------------------------------------------------

/**
 * Form data state for catch form.
 * Uses Date for caught_at (easier for date pickers).
 */
export interface CatchFormData {
  species_id: string;
  lure_id: string;
  groundbait_id: string;
  caught_at: Date;
  weight_g: number | null;
  length_mm: number | null;
  photo: File | null;
}

/**
 * Default values for creating a new catch form.
 */
export const CATCH_FORM_DEFAULTS: CatchFormData = {
  species_id: "",
  lure_id: "",
  groundbait_id: "",
  caught_at: new Date(),
  weight_g: null,
  length_mm: null,
  photo: null,
};

/**
 * Field-level validation errors.
 */
export interface CatchFormErrors {
  species_id?: string;
  lure_id?: string;
  groundbait_id?: string;
  caught_at?: string;
  weight_g?: string;
  length_mm?: string;
  photo?: string;
  /** Form-level error (e.g., API error) */
  form?: string;
}

/**
 * Tracks which fields have been touched (for showing errors after blur).
 */
export interface CatchFormTouched {
  species_id: boolean;
  lure_id: boolean;
  groundbait_id: boolean;
  caught_at: boolean;
  weight_g: boolean;
  length_mm: boolean;
  photo: boolean;
}

/**
 * Initial touched state (all false).
 */
export const CATCH_FORM_TOUCHED_DEFAULTS: CatchFormTouched = {
  species_id: false,
  lure_id: false,
  groundbait_id: false,
  caught_at: false,
  weight_g: false,
  length_mm: false,
  photo: false,
};

// ---------------------------------------------------------------------------
// Select Option Types
// ---------------------------------------------------------------------------

/**
 * Generic option type for combobox/select components.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Species option (same as generic).
 */
export type SpeciesOption = SelectOption;

/**
 * Lure option with soft-delete status.
 */
export interface LureOption extends SelectOption {
  deleted_at?: string | null;
}

/**
 * Groundbait option with soft-delete status.
 */
export interface GroundbaitOption extends SelectOption {
  deleted_at?: string | null;
}

/**
 * Maps FishSpeciesDto to SpeciesOption.
 */
export function mapSpeciesToOption(species: FishSpeciesDto): SpeciesOption {
  return {
    value: species.id,
    label: species.name,
  };
}

/**
 * Maps LureDto to LureOption.
 */
export function mapLureToOption(lure: LureDto): LureOption {
  return {
    value: lure.id,
    label: lure.name,
    deleted_at: lure.deleted_at,
  };
}

/**
 * Maps GroundbaitDto to GroundbaitOption.
 */
export function mapGroundbaitToOption(groundbait: GroundbaitDto): GroundbaitOption {
  return {
    value: groundbait.id,
    label: groundbait.name,
    deleted_at: groundbait.deleted_at,
  };
}

// ---------------------------------------------------------------------------
// Photo Upload Types
// ---------------------------------------------------------------------------

/**
 * Status of photo upload operation.
 */
export type PhotoUploadStatus = "idle" | "resizing" | "uploading" | "deleting" | "success" | "error";

/**
 * Complete state of photo upload process.
 */
export interface PhotoUploadState {
  /** Current operation status */
  status: PhotoUploadStatus;
  /** Upload progress 0-100 */
  progress: number;
  /** Local preview URL (created via URL.createObjectURL) */
  previewUrl: string | null;
  /** Error message if status is 'error' */
  error: string | null;
  /** Path in Supabase Storage after successful upload */
  uploadedPath: string | null;
  /** Metadata from last successful upload */
  uploadResult: CatchPhotoUploadResponseDto | null;
  /** Signed URL for displaying existing photo */
  downloadUrl: string | null;
  /** Expiration time of signed URL */
  downloadUrlExpiresAt: Date | null;
}

/**
 * Initial photo upload state.
 */
export const PHOTO_UPLOAD_INITIAL_STATE: PhotoUploadState = {
  status: "idle",
  progress: 0,
  previewUrl: null,
  error: null,
  uploadedPath: null,
  uploadResult: null,
  downloadUrl: null,
  downloadUrlExpiresAt: null,
};

// ---------------------------------------------------------------------------
// Dialog & Form Props Types
// ---------------------------------------------------------------------------

/**
 * Props for CatchFormDialog component.
 */
export interface CatchFormDialogProps {
  /** Trip ID to add catch to */
  tripId: string;
  /** Trip start datetime (ISO string) - for caught_at validation */
  tripStartedAt: string;
  /** Trip end datetime (ISO string) or null if active */
  tripEndedAt: string | null;
  /** Existing catch data for edit mode */
  existingCatch?: CatchDto;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when catch is successfully created/updated */
  onSuccess: (createdCatch: CatchDto) => void;
}

/**
 * Props for CatchForm component.
 */
export interface CatchFormProps {
  /** Trip ID */
  tripId: string;
  /** Trip start datetime (ISO string) */
  tripStartedAt: string;
  /** Trip end datetime (ISO string) or null */
  tripEndedAt: string | null;
  /** Initial form data (for edit mode) */
  initialData?: CatchFormData;
  /** Existing catch ID (for edit mode) */
  existingCatchId?: string;
  /** Existing photo path (for edit mode) */
  existingPhotoPath?: string | null;
  /** Submit handler */
  onSubmit: () => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts CatchDto to CatchFormData for edit mode.
 */
export function catchDtoToFormData(catchDto: CatchDto): CatchFormData {
  return {
    species_id: catchDto.species_id,
    lure_id: catchDto.lure_id ?? "",
    groundbait_id: catchDto.groundbait_id ?? "",
    caught_at: new Date(catchDto.caught_at),
    weight_g: catchDto.weight_g,
    length_mm: catchDto.length_mm,
    photo: null, // File is not loaded from server
  };
}
