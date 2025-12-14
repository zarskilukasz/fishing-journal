/**
 * Types for trip details view components.
 */
import type { LucideIcon } from "lucide-react";
import type {
  TripGetResponseDto,
  TripDto,
  TripStatus,
  TripLocationDto,
  TripEquipmentDto,
  CatchInTripDto,
  TripWeatherCurrentDto,
} from "@/types";

// ---------------------------------------------------------------------------
// View Props
// ---------------------------------------------------------------------------

/**
 * Props for the main TripDetailsView component (React island)
 */
export interface TripDetailsViewProps {
  tripId: string;
}

// ---------------------------------------------------------------------------
// State Types
// ---------------------------------------------------------------------------

/**
 * Error in trip details view
 */
export interface TripDetailsError {
  code: string;
  message: string;
}

/**
 * Main view state managed by useTripDetails hook
 */
export interface TripDetailsState {
  trip: TripGetResponseDto | null;
  isLoading: boolean;
  error: TripDetailsError | null;
  isClosing: boolean;
  isDeleting: boolean;
}

// ---------------------------------------------------------------------------
// Computed/ViewModel Types
// ---------------------------------------------------------------------------

/**
 * Computed trip summary statistics
 */
export interface TripSummaryViewModel {
  /** Duration in minutes (null if cannot be calculated) */
  durationMinutes: number | null;
  /** Formatted duration (e.g., "3h 45min") */
  durationFormatted: string;
  /** Number of catches */
  catchCount: number;
  /** Total weight in grams */
  totalWeightG: number;
  /** Formatted total weight (e.g., "12.5 kg") */
  totalWeightFormatted: string;
  /** Biggest catch weight in grams */
  biggestCatchWeightG: number | null;
  /** Formatted biggest catch */
  biggestCatchFormatted: string;
}

/**
 * Single stat card data
 */
export interface StatCardData {
  id: string;
  icon: string;
  label: string;
  value: string;
  unit?: string;
}

/**
 * Available actions for a trip
 */
export interface TripActions {
  canEdit: boolean;
  canClose: boolean;
  canDelete: boolean;
  canAddCatch: boolean;
}

/**
 * Weather hour data for display
 */
export interface WeatherHourViewModel {
  /** Formatted hour (e.g., "14:00") */
  hourFormatted: string;
  /** Temperature in °C */
  temperatureC: number | null;
  /** Weather icon (AccuWeather code) */
  weatherIcon: string | null;
  /** Weather description */
  weatherText: string | null;
  /** Wind speed km/h */
  windSpeedKmh: number | null;
  /** Wind direction in degrees */
  windDirection: number | null;
  /** Pressure hPa */
  pressureHpa: number | null;
  /** Humidity % */
  humidityPercent: number | null;
}

// ---------------------------------------------------------------------------
// Hook Return Type
// ---------------------------------------------------------------------------

/**
 * Return type of useTripDetails hook
 */
export interface UseTripDetailsReturn {
  state: TripDetailsState;
  actions: {
    closeTrip: () => Promise<void>;
    deleteTrip: () => Promise<void>;
    refresh: () => Promise<void>;
  };
  computed: {
    summary: TripSummaryViewModel | null;
    tripActions: TripActions;
  };
}

// ---------------------------------------------------------------------------
// Component Props Types
// ---------------------------------------------------------------------------

/**
 * Props for TripHeader component
 */
export interface TripHeaderProps {
  trip: TripDto;
  onClose: () => void;
  onDelete: () => void;
  isClosing: boolean;
  isDeleting: boolean;
  canClose: boolean;
}

/**
 * Props for StatusBadge component
 */
export interface StatusBadgeProps {
  status: TripStatus;
}

/**
 * Props for TripSummaryGrid component
 */
export interface TripSummaryGridProps {
  startedAt: string;
  endedAt: string | null;
  status: TripStatus;
  catches: CatchInTripDto[];
}

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
}

/**
 * Props for LocationSection component
 */
export interface LocationSectionProps {
  location: TripLocationDto | null;
}

/**
 * Props for LocationMap component
 */
export interface LocationMapProps {
  lat: number;
  lng: number;
  label?: string | null;
}

/**
 * Props for WeatherSection component
 */
export interface WeatherSectionProps {
  weatherCurrent: TripWeatherCurrentDto | null;
  tripId: string;
  tripStartedAt: string;
  tripEndedAt: string | null;
  location: TripLocationDto | null;
}

/**
 * Props for WeatherManualBanner component
 */
export interface WeatherManualBannerProps {
  tripId: string;
}

/**
 * Props for WeatherTimeline component
 */
export interface WeatherTimelineProps {
  /** Array of hourly weather data from API */
  hours: import("@/types").WeatherHourDto[];
}

/**
 * Props for WeatherHourCard component
 */
export interface WeatherHourCardProps {
  hour: WeatherHourViewModel;
}

/**
 * Props for CatchesSection component
 */
export interface CatchesSectionProps {
  catches: CatchInTripDto[];
  tripId: string;
}

/**
 * Props for CatchCard component
 */
export interface CatchCardProps {
  catch: CatchInTripDto;
}

/**
 * Props for EquipmentSection component
 */
export interface EquipmentSectionProps {
  equipment: TripEquipmentDto | undefined;
}

/**
 * Props for EquipmentChips component
 */
export interface EquipmentChipsProps {
  label: string;
  items: { id: string; name_snapshot: string }[];
  icon: LucideIcon;
}

/**
 * Props for AddCatchFAB component
 */
export interface AddCatchFABProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Props for ConfirmDialog component
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

/**
 * Props for TripDetailsError component
 */
export interface TripDetailsErrorProps {
  error: TripDetailsError;
  onRetry?: () => void;
}

/**
 * Props for SectionHeader component
 */
export interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
}
