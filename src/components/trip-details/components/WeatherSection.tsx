/**
 * WeatherSection - Weather information section.
 * Shows weather timeline or manual input banner.
 */
import React from "react";
import { Cloud } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import type { WeatherSectionProps } from "../types";

/**
 * Weather section with timeline or manual input prompt.
 * TODO: Implement full WeatherTimeline component with API integration.
 */
export function WeatherSection({ weatherCurrent, tripId }: WeatherSectionProps) {
  // Show manual input banner if no weather data
  if (!weatherCurrent) {
    return (
      <section className="geist-card p-6" aria-labelledby="weather-heading">
        <SectionHeader title="Pogoda" />

        <div className="mt-4 rounded-lg bg-secondary/50 border border-border p-6 text-center">
          <Cloud className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Brak danych pogodowych</p>
          <p className="text-xs text-muted-foreground mt-1">
            Dane pogodowe nie zostały jeszcze pobrane dla tej wyprawy.
          </p>
          {/* TODO: Add button to navigate to weather form */}
        </div>
      </section>
    );
  }

  // Show weather timeline
  return (
    <section className="geist-card p-6" aria-labelledby="weather-heading">
      <SectionHeader title="Pogoda" />

      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          Źródło: <span className="font-medium">{weatherCurrent.source === "api" ? "API" : "Ręczne"}</span>
        </p>
        <p className="text-xs mt-1">ID snapshota: {weatherCurrent.snapshot_id}</p>
        {/* TODO: Implement WeatherTimeline with hourly cards */}
      </div>
    </section>
  );
}
