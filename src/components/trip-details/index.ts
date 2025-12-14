/**
 * Barrel exports for trip details components.
 */

// Main view component
export { TripDetailsView, type TripDetailsViewProps } from "./components/TripDetailsView";

// Sub-components (for potential reuse)
export { StatusBadge } from "./components/StatusBadge";
export { StatCard } from "./components/StatCard";
export { SectionHeader } from "./components/SectionHeader";
export { ConfirmDialog } from "./components/ConfirmDialog";

// Types
export type {
  TripDetailsState,
  TripDetailsError,
  TripSummaryViewModel,
  TripActions,
  UseTripDetailsReturn,
  StatusBadgeProps,
  StatCardProps,
  ConfirmDialogProps,
} from "./types";

// Hooks
export { useTripDetails } from "./hooks/useTripDetails";

// Context
export { useTripActions, TripActionsProvider } from "./context/TripActionsContext";
