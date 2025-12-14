/**
 * WeatherSection - Weather information section with auto-refresh capability.
 * Shows weather timeline, empty state, or loading state based on data availability.
 */
import React from "react";
import { SectionHeader } from "./SectionHeader";
import { WeatherTimeline } from "./WeatherTimeline";
import { WeatherRefreshButton } from "./WeatherRefreshButton";
import { WeatherEmptyState } from "./WeatherEmptyState";
import { useWeather } from "@/components/hooks/useWeather";
import type { WeatherSectionProps } from "../types";

/**
 * Weather section with timeline and auto-refresh capability
 */
export function WeatherSection({ weatherCurrent, tripId, tripStartedAt, tripEndedAt, location }: WeatherSectionProps) {
  const {
    weatherData,
    isLoading,
    error,
    isRefreshing,
    refreshError,
    canRefresh,
    handleRefresh,
    hasWeatherData,
    hasLocation,
  } = useWeather({
    tripId,
    tripStartedAt,
    tripEndedAt,
    weatherCurrent,
    location,
  });

  // Loading state (only when we have a snapshot to fetch)
  if (isLoading && weatherCurrent) {
    return (
      <section className="geist-card p-6" aria-labelledby="weather-heading">
        <SectionHeader title="Pogoda" />
        <div className="mt-4 flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">Ładowanie danych pogodowych...</div>
        </div>
      </section>
    );
  }

  // No weather data state
  if (!hasWeatherData) {
    return (
      <section className="geist-card p-6" aria-labelledby="weather-heading">
        <SectionHeader title="Pogoda" />
        <div className="mt-4">
          <WeatherEmptyState
            canRefresh={canRefresh}
            hasLocation={hasLocation}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            error={refreshError}
          />
        </div>
      </section>
    );
  }

  // Weather data available
  const hours = weatherData?.hours ?? [];
  const sourceLabel = weatherCurrent?.source === "api" ? "Automatyczne" : "Ręczne";

  return (
    <section className="geist-card p-6" aria-labelledby="weather-heading">
      <SectionHeader
        title="Pogoda"
        action={
          canRefresh ? (
            <WeatherRefreshButton onClick={handleRefresh} isLoading={isRefreshing} variant="icon" />
          ) : undefined
        }
      />

      {/* Error banner */}
      {(error || refreshError) && (
        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error || refreshError}</p>
        </div>
      )}

      {/* Weather timeline */}
      <div className="mt-4">
        <WeatherTimeline hours={hours} />
        <p className="mt-3 text-xs text-muted-foreground">
          Źródło: <span className="font-medium">{sourceLabel}</span>
        </p>
      </div>
    </section>
  );
}
