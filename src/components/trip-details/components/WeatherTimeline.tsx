/**
 * WeatherTimeline - Horizontal scrolling timeline of hourly weather data.
 * Transforms API data to view models and renders WeatherHourCard for each hour.
 */
import React, { useMemo } from "react";
import { WeatherHourCard } from "./WeatherHourCard";
import type { WeatherHourDto } from "@/types";
import type { WeatherHourViewModel, WeatherTimelineProps } from "../types";

/**
 * Transform API hour data to view model for display
 */
function transformToViewModel(hour: WeatherHourDto): WeatherHourViewModel {
  return {
    hourFormatted: new Date(hour.observed_at).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperatureC: hour.temperature_c,
    weatherIcon: hour.weather_icon,
    weatherText: hour.weather_text,
    windSpeedKmh: hour.wind_speed_kmh,
    windDirection: hour.wind_direction,
    pressureHpa: hour.pressure_hpa,
    humidityPercent: hour.humidity_percent,
  };
}

/**
 * Horizontal scrolling timeline of hourly weather data
 */
export function WeatherTimeline({ hours }: WeatherTimelineProps) {
  // Transform to view models with memoization
  const hourViewModels = useMemo(() => hours.map(transformToViewModel), [hours]);

  if (hourViewModels.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">Brak szczegółowych danych godzinowych.</div>;
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      role="list"
      aria-label="Dane pogodowe godzinowe"
    >
      {hourViewModels.map((hour, index) => (
        <WeatherHourCard key={index} hour={hour} />
      ))}
    </div>
  );
}
