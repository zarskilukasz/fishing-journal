/**
 * Types for trip edit view components.
 */
import type { Control, FieldErrors } from "react-hook-form";
import type { TripGetResponseDto, RodDto, LureDto, GroundbaitDto } from "@/types";
import type { TripEditFormData } from "@/lib/schemas/trip-edit.schema";

// ---------------------------------------------------------------------------
// View Props
// ---------------------------------------------------------------------------

/**
 * Props for the main TripEditView component (React island)
 */
export interface TripEditViewProps {
  tripId: string;
}

// ---------------------------------------------------------------------------
// Form & Data Types
// ---------------------------------------------------------------------------

/**
 * Available equipment for multiselect dropdowns
 */
export interface AvailableEquipmentData {
  rods: RodDto[];
  lures: LureDto[];
  groundbaits: GroundbaitDto[];
}

/**
 * Base interface for equipment items (used in multiselect)
 */
export interface EquipmentItem {
  id: string;
  name: string;
  deleted_at: string | null;
}

// ---------------------------------------------------------------------------
// Form Props
// ---------------------------------------------------------------------------

/**
 * Props for the TripForm component
 */
export interface TripFormProps {
  initialData: TripEditFormData;
  availableEquipment: AvailableEquipmentData;
  onSubmit: (data: TripEditFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  showWeatherWarning: boolean;
  onWeatherWarningConfirm: () => void;
  onWeatherWarningCancel: () => void;
}

/**
 * Props for DateTimeSection
 */
export interface DateTimeSectionProps {
  control: Control<TripEditFormData>;
  errors: FieldErrors<TripEditFormData>;
  onDateChange?: (field: "started_at" | "ended_at") => void;
}

/**
 * Props for DateTimePicker
 */
export interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}

/**
 * Props for LocationSection
 */
export interface LocationSectionProps {
  control: Control<TripEditFormData>;
  errors: FieldErrors<TripEditFormData>;
}

/**
 * Props for LocationPicker
 */
export interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number } | null) => void;
  disabled?: boolean;
}

/**
 * Props for EquipmentSection
 */
export interface EquipmentSectionProps {
  control: Control<TripEditFormData>;
  availableRods: RodDto[];
  availableLures: LureDto[];
  availableGroundbaits: GroundbaitDto[];
}

/**
 * Props for EquipmentMultiSelect
 */
export interface EquipmentMultiSelectProps<T extends EquipmentItem> {
  label: string;
  placeholder: string;
  items: T[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  getItemId: (item: T) => string;
  getItemName: (item: T) => string;
}

/**
 * Props for WeatherWarningDialog
 */
export interface WeatherWarningDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Props for ErrorState
 */
export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Hook Types
// ---------------------------------------------------------------------------

/**
 * State managed by useTripEdit hook
 */
export interface TripEditState {
  trip: TripGetResponseDto | null;
  availableEquipment: AvailableEquipmentData;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  originalStartedAt: Date | null;
  originalEndedAt: Date | null;
  showWeatherWarning: boolean;
}

/**
 * Return type of useTripEdit hook
 */
export interface UseTripEditReturn {
  // State
  trip: TripGetResponseDto | null;
  availableEquipment: AvailableEquipmentData;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showWeatherWarning: boolean;

  // Actions
  handleSubmit: (data: TripEditFormData) => Promise<void>;
  handleCancel: () => void;
  handleWeatherWarningConfirm: () => void;
  handleWeatherWarningCancel: () => void;
  refetch: () => void;

  // Helpers
  hasDateChanged: (newStartedAt: Date, newEndedAt: Date | null) => boolean;
}
