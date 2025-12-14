/**
 * Types for catch detail view components.
 */

// ---------------------------------------------------------------------------
// View Props
// ---------------------------------------------------------------------------

/**
 * Props for the main CatchDetailView component (React island)
 */
export interface CatchDetailViewProps {
  catchId: string;
}

// ---------------------------------------------------------------------------
// State Types
// ---------------------------------------------------------------------------

/**
 * Error in catch detail view
 */
export interface CatchDetailError {
  code: string;
  message: string;
}

/**
 * Main view state managed by useCatchDetail hook
 */
export interface CatchDetailState {
  catch: CatchDetailViewModel | null;
  isLoading: boolean;
  isDeleting: boolean;
  error: CatchDetailError | null;
}

// ---------------------------------------------------------------------------
// ViewModel Types
// ---------------------------------------------------------------------------

/**
 * ViewModel for catch details - processed data ready for display
 */
export interface CatchDetailViewModel {
  id: string;
  tripId: string;
  caughtAt: string; // ISO datetime
  speciesName: string;
  speciesId: string;
  lureId: string | null;
  groundbaitId: string | null;
  lureName: string | null; // from snapshot
  groundbaitName: string | null; // from snapshot
  weightG: number | null;
  lengthMm: number | null;
  photoUrl: string | null;
  photoPath: string | null;

  // Trip dates for edit form validation
  tripStartedAt: string;
  tripEndedAt: string | null;

  // Formatted values for UI
  caughtAtFormatted: string; // e.g., "12 gru 2025, 14:30"
  weightFormatted: string | null; // e.g., "1.2 kg"
  lengthFormatted: string | null; // e.g., "65 cm"
}

// ---------------------------------------------------------------------------
// Hook Return Type
// ---------------------------------------------------------------------------

/**
 * Return type of useCatchDetail hook
 */
export interface UseCatchDetailReturn {
  state: CatchDetailState;
  actions: {
    refresh: () => Promise<void>;
    deleteCatch: () => Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// Component Props Types
// ---------------------------------------------------------------------------

/**
 * Props for CatchDetailError component
 */
export interface CatchDetailErrorProps {
  error: CatchDetailError;
  onRetry?: () => void;
}

/**
 * Props for CatchDetailContent component
 */
export interface CatchDetailContentProps {
  catch: CatchDetailViewModel;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

/**
 * Props for CatchPhotoSection component
 */
export interface CatchPhotoSectionProps {
  photoUrl: string | null;
  speciesName: string;
}

/**
 * Props for CatchInfoSection component
 */
export interface CatchInfoSectionProps {
  speciesName: string;
  caughtAt: string;
  caughtAtFormatted: string;
  weightG: number | null;
  weightFormatted: string | null;
  lengthMm: number | null;
  lengthFormatted: string | null;
}

/**
 * Props for EquipmentSection component
 */
export interface EquipmentSectionProps {
  lureName: string | null;
  groundbaitName: string | null;
}

/**
 * Props for CatchDetailHeader component
 */
export interface CatchDetailHeaderProps {
  speciesName: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Props for ConfirmDialog (shared with trip-details)
 */
export interface CatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}
