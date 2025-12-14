/**
 * WeatherHourCard - Single hour card in weather timeline.
 * Displays temperature, weather icon, and wind speed for one hour.
 */
import React from "react";
import { Wind, Cloud, Gauge } from "lucide-react";
import type { WeatherHourCardProps } from "../types";

/**
 * Convert wind direction in degrees to compass direction text.
 * Uses 8-point compass (N, NE, E, SE, S, SW, W, NW).
 */
function degreesToCompass(degrees: number): string {
  // Polish compass abbreviations
  const directions = ["PN", "PN-WSCH", "WSCH", "PD-WSCH", "PD", "PD-ZACH", "ZACH", "PN-ZACH"];
  // Normalize to 0-360 and divide into 8 sectors (45° each)
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Map AccuWeather icon codes to emoji representations.
 * AccuWeather uses numeric codes 1-44 for different weather conditions.
 * @see https://developer.accuweather.com/weather-icons
 */
function getWeatherEmoji(iconCode: string): string {
  const code = parseInt(iconCode, 10);

  // Sunny / Clear (1-5)
  if (code >= 1 && code <= 5) return "☀️";
  // Partly cloudy (6-11)
  if (code >= 6 && code <= 11) return "⛅";
  // Cloudy / Overcast (12-14)
  if (code >= 12 && code <= 14) return "☁️";
  // Thunderstorm (15-17)
  if (code >= 15 && code <= 17) return "⛈️";
  // Rain / Showers (18-21)
  if (code >= 18 && code <= 21) return "🌧️";
  // Snow / Sleet (22-29)
  if (code >= 22 && code <= 29) return "❄️";
  // Windy (32-34)
  if (code >= 32 && code <= 34) return "💨";
  // Night clear (33-34)
  if (code === 33 || code === 34) return "🌙";
  // Night partly cloudy (35-38)
  if (code >= 35 && code <= 38) return "☁️";
  // Fog / Haze (30-31)
  if (code === 30 || code === 31) return "🌫️";

  // Default
  return "🌤️";
}

/**
 * Single hour card in weather timeline
 */
export function WeatherHourCard({ hour }: WeatherHourCardProps) {
  return (
    <div
      className="flex-shrink-0 min-w-[120px] aspect-square p-3 bg-[#ffffff] dark:bg-[#1a1a1a] border border-border rounded-lg flex flex-col items-center justify-between"
      role="listitem"
    >
      {/* Hour */}
      <p className="text-xs font-medium text-[#000000] dark:text-[#ededed]">{hour.hourFormatted}</p>

      {/* Weather icon or placeholder */}
      <div className="flex items-center justify-center">
        {hour.weatherIcon ? (
          <span className="text-2xl" aria-label={hour.weatherText ?? "Pogoda"}>
            {getWeatherEmoji(hour.weatherIcon)}
          </span>
        ) : (
          <Cloud className="h-6 w-6 text-[#666666] dark:text-[#888888]" aria-hidden="true" />
        )}
      </div>

      {/* Temperature */}
      <p className="text-lg font-semibold text-[#000000] dark:text-[#ededed]">
        {hour.temperatureC !== null ? `${Math.round(hour.temperatureC)}°` : "-"}
      </p>

      {/* Wind speed and direction */}
      {(hour.windSpeedKmh !== null || hour.windDirection) && (
        <div className="text-xs text-[#666666] dark:text-[#888888] flex items-center justify-center gap-1">
          <Wind className="h-3 w-3" aria-hidden="true" />
          <span>
            {hour.windSpeedKmh !== null && `${Math.round(hour.windSpeedKmh)}`}
            {hour.windDirection && ` ${degreesToCompass(Number(hour.windDirection))}`}
          </span>
        </div>
      )}

      {/* Atmospheric pressure */}
      {hour.pressureHpa !== null && (
        <div className="text-xs text-[#666666] dark:text-[#888888] flex items-center justify-center gap-1">
          <Gauge className="h-3 w-3" aria-hidden="true" />
          <span>{Math.round(hour.pressureHpa)} hPa</span>
        </div>
      )}
    </div>
  );
}
