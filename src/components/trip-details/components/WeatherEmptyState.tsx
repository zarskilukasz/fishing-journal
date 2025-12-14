/**
 * WeatherEmptyState - Empty state when no weather data is available.
 * Shows different messages and actions based on the reason for missing data.
 */
import React from "react";
import { Cloud, MapPinOff, Clock } from "lucide-react";
import { WeatherRefreshButton } from "./WeatherRefreshButton";
import type { LucideIcon } from "lucide-react";

interface WeatherEmptyStateProps {
  /** Whether refresh is possible (location exists, trip recent) */
  canRefresh: boolean;
  /** Whether the trip has a location set */
  hasLocation: boolean;
  /** Handler for refresh button click */
  onRefresh: () => void;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Error message to display */
  error?: string | null;
}

interface EmptyStateContent {
  icon: LucideIcon;
  title: string;
  description: string;
  showButton: boolean;
}

/**
 * Determine the appropriate content based on state
 */
function getEmptyStateContent(hasLocation: boolean, canRefresh: boolean): EmptyStateContent {
  if (!hasLocation) {
    return {
      icon: MapPinOff,
      title: "Brak lokalizacji",
      description: "Dodaj lokalizację do wyprawy, aby pobrać dane pogodowe.",
      showButton: false,
    };
  }

  if (!canRefresh) {
    return {
      icon: Clock,
      title: "Wyprawa zbyt stara",
      description: "Automatyczne pobieranie pogody dostępne tylko dla wypraw z ostatnich 24h.",
      showButton: false,
    };
  }

  return {
    icon: Cloud,
    title: "Brak danych pogodowych",
    description: "Kliknij przycisk poniżej, aby pobrać dane pogodowe dla tej wyprawy.",
    showButton: true,
  };
}

/**
 * Empty state when no weather data is available
 */
export function WeatherEmptyState({ canRefresh, hasLocation, onRefresh, isRefreshing, error }: WeatherEmptyStateProps) {
  const content = getEmptyStateContent(hasLocation, canRefresh);
  const Icon = content.icon;

  return (
    <div className="rounded-lg bg-secondary/50 border border-border p-6 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{content.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{content.description}</p>

      {error && (
        <p className="text-xs text-destructive mt-2" role="alert">
          {error}
        </p>
      )}

      {content.showButton && (
        <div className="mt-4">
          <WeatherRefreshButton onClick={onRefresh} isLoading={isRefreshing} variant="full" />
        </div>
      )}
    </div>
  );
}
