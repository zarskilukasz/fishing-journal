# Plan Implementacji: Automatyczne Pobieranie Pogody (Frontend)

## 1. Analiza stanu obecnego

### ✅ Co już istnieje (Backend - gotowe)

| Komponent | Ścieżka | Status |
|-----------|---------|--------|
| Endpointy API | `src/pages/api/v1/trips/[tripId]/weather/*` | ✅ Gotowe |
| Weather Service | `src/lib/services/weather.service.ts` | ✅ Gotowe |
| Weather Provider | `src/lib/services/weather-provider.service.ts` | ✅ AccuWeather |
| Schematy walidacji | `src/lib/schemas/weather.schema.ts` | ✅ Gotowe |
| Typy DTO | `src/types.ts` | ✅ Gotowe |

### ⚠️ Co wymaga implementacji (Frontend)

| Komponent | Ścieżka | Status |
|-----------|---------|--------|
| `WeatherSection` | `src/components/trip-details/components/` | ⏳ Placeholder |
| `WeatherTimeline` | Do utworzenia | ❌ Brak |
| `WeatherHourCard` | Do utworzenia | ❌ Brak |
| `WeatherRefreshButton` | Do utworzenia | ❌ Brak |
| `useWeather` hook | Do utworzenia | ❌ Brak |
| API client funkcje | `src/lib/api/weather.ts` | ❌ Brak |

---

## 2. Architektura rozwiązania

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WeatherSection                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  SectionHeader + WeatherRefreshButton                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  WeatherTimeline (horizontal scroll)                          │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │  │
│  │  │ Hour │ │ Hour │ │ Hour │ │ Hour │ │ Hour │ ...            │  │
│  │  │ Card │ │ Card │ │ Card │ │ Card │ │ Card │                │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  WeatherEmptyState (gdy brak danych) z przyciskiem pobierania │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

               │ useWeather hook
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TanStack Query: useQuery + useMutation                              │
│  - fetchWeatherSnapshot(snapshotId)                                  │
│  - refreshWeather(tripId, command)                                   │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Endpoints (Backend)                                             │
│  - GET  /api/v1/weather/snapshots/{id}?include_hours=true           │
│  - POST /api/v1/trips/{tripId}/weather/refresh                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Szczegółowy plan implementacji

### Etap 1: API Client (`src/lib/api/weather.ts`)

```typescript
// Nowy plik: src/lib/api/weather.ts

import type {
  WeatherSnapshotGetResponseDto,
  WeatherRefreshResponseDto,
  WeatherRefreshCommand,
  ApiErrorResponse,
} from "@/types";

export class WeatherApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "WeatherApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Fetch weather snapshot with hourly data
 */
export async function fetchWeatherSnapshot(snapshotId: string): Promise<WeatherSnapshotGetResponseDto> {
  const response = await fetch(`/api/v1/weather/snapshots/${snapshotId}?include_hours=true`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new WeatherApiError(
      errorData.error?.message || "Nie udało się pobrać danych pogodowych",
      errorData.error?.code || "unknown_error",
      response.status
    );
  }

  return response.json();
}

/**
 * Refresh weather from external API
 */
export async function refreshWeather(
  tripId: string,
  command: WeatherRefreshCommand
): Promise<WeatherRefreshResponseDto> {
  const response = await fetch(`/api/v1/trips/${tripId}/weather/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new WeatherApiError(
      errorData.error?.message || "Nie udało się pobrać pogody",
      errorData.error?.code || "unknown_error",
      response.status
    );
  }

  return response.json();
}

/**
 * Polish error messages
 */
export const WEATHER_ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Przekroczono limit zapytań. Spróbuj ponownie za chwilę.",
  bad_gateway: "Błąd serwisu pogodowego. Spróbuj ponownie później.",
  validation_error: "Wyprawa nie spełnia wymagań (brak lokalizacji lub zbyt stara).",
  not_found: "Dane pogodowe nie zostały znalezione.",
};
```

---

### Etap 2: Hook `useWeather` (`src/components/hooks/useWeather.ts`)

```typescript
// Nowy plik: src/components/hooks/useWeather.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWeatherSnapshot, refreshWeather, WeatherApiError, WEATHER_ERROR_MESSAGES } from "@/lib/api/weather";
import type { WeatherSnapshotGetResponseDto, TripWeatherCurrentDto, WeatherRefreshCommand } from "@/types";

interface UseWeatherOptions {
  tripId: string;
  tripStartedAt: string;
  tripEndedAt: string | null;
  weatherCurrent: TripWeatherCurrentDto | null;
  hasLocation: boolean;
}

interface UseWeatherReturn {
  // Data state
  weatherData: WeatherSnapshotGetResponseDto | null;
  isLoading: boolean;
  error: string | null;

  // Refresh mutation
  isRefreshing: boolean;
  refreshError: string | null;
  canRefresh: boolean;
  refreshWeather: () => Promise<void>;
  
  // Computed
  hasWeatherData: boolean;
}

/**
 * Query keys for weather data
 */
export const weatherQueryKeys = {
  snapshot: (snapshotId: string) => ["weather", "snapshot", snapshotId] as const,
};

/**
 * Hook for managing weather data in trip details view
 */
export function useWeather(options: UseWeatherOptions): UseWeatherReturn {
  const { tripId, tripStartedAt, tripEndedAt, weatherCurrent, hasLocation } = options;
  const queryClient = useQueryClient();

  // Fetch weather snapshot data (only if we have a current snapshot)
  const snapshotQuery = useQuery({
    queryKey: weatherCurrent ? weatherQueryKeys.snapshot(weatherCurrent.snapshot_id) : ["weather", "none"],
    queryFn: () => {
      if (!weatherCurrent) throw new Error("No snapshot");
      return fetchWeatherSnapshot(weatherCurrent.snapshot_id);
    },
    enabled: !!weatherCurrent,
    staleTime: 60000, // 1 minute
  });

  // Refresh weather mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Calculate period from trip times
      const periodStart = tripStartedAt;
      const periodEnd = tripEndedAt || new Date().toISOString();

      const command: WeatherRefreshCommand = {
        period_start: periodStart,
        period_end: periodEnd,
        force: false, // Could expose this as option
      };

      return refreshWeather(tripId, command);
    },
    onSuccess: async () => {
      // Invalidate trip details to get new weather_current
      await queryClient.invalidateQueries({ queryKey: ["trip", "details", tripId] });
    },
  });

  // Map errors to user-friendly messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof WeatherApiError) {
      return WEATHER_ERROR_MESSAGES[error.code] || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Nieoczekiwany błąd";
  };

  // Check if refresh is possible (trip has location and is recent)
  const tripAge = Date.now() - new Date(tripStartedAt).getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24h
  const canRefresh = hasLocation && tripAge <= maxAge;

  return {
    weatherData: snapshotQuery.data ?? null,
    isLoading: snapshotQuery.isLoading,
    error: snapshotQuery.error ? getErrorMessage(snapshotQuery.error) : null,

    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error ? getErrorMessage(refreshMutation.error) : null,
    canRefresh,
    refreshWeather: async () => {
      await refreshMutation.mutateAsync();
    },

    hasWeatherData: !!weatherCurrent && !!snapshotQuery.data,
  };
}
```

---

### Etap 3: Komponenty UI

#### 3.1 `WeatherHourCard.tsx`

```typescript
// Nowy plik: src/components/trip-details/components/WeatherHourCard.tsx

import React from "react";
import { Wind, Cloud } from "lucide-react";
import type { WeatherHourViewModel } from "../types";

interface WeatherHourCardProps {
  hour: WeatherHourViewModel;
}

/**
 * Single hour card in weather timeline
 */
export function WeatherHourCard({ hour }: WeatherHourCardProps) {
  return (
    <div className="flex-shrink-0 w-20 p-3 bg-secondary/50 border border-border rounded-lg text-center">
      {/* Hour */}
      <p className="text-xs font-medium text-foreground">{hour.hourFormatted}</p>

      {/* Weather icon or placeholder */}
      <div className="my-2 h-8 flex items-center justify-center">
        {hour.weatherIcon ? (
          <span className="text-2xl" aria-label={hour.weatherText ?? "Pogoda"}>
            {getWeatherEmoji(hour.weatherIcon)}
          </span>
        ) : (
          <Cloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {/* Temperature */}
      <p className="text-lg font-semibold text-foreground">
        {hour.temperatureC !== null ? `${Math.round(hour.temperatureC)}°` : "-"}
      </p>

      {/* Wind */}
      {hour.windSpeedKmh !== null && (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
          <Wind className="h-3 w-3" aria-hidden="true" />
          {Math.round(hour.windSpeedKmh)}
        </p>
      )}
    </div>
  );
}

/**
 * Map AccuWeather icon codes to emojis
 */
function getWeatherEmoji(iconCode: string): string {
  const code = parseInt(iconCode, 10);
  // AccuWeather icon mapping (simplified)
  if (code >= 1 && code <= 5) return "☀️"; // Sunny
  if (code >= 6 && code <= 11) return "⛅"; // Partly cloudy
  if (code >= 12 && code <= 14) return "☁️"; // Cloudy
  if (code >= 15 && code <= 17) return "⛈️"; // Thunderstorm
  if (code >= 18 && code <= 21) return "🌧️"; // Rain
  if (code >= 22 && code <= 29) return "❄️"; // Snow
  if (code >= 32 && code <= 34) return "💨"; // Wind
  return "🌤️"; // Default
}
```

#### 3.2 `WeatherTimeline.tsx`

```typescript
// Nowy plik: src/components/trip-details/components/WeatherTimeline.tsx

import React from "react";
import { WeatherHourCard } from "./WeatherHourCard";
import type { WeatherHourDto } from "@/types";
import type { WeatherHourViewModel } from "../types";

interface WeatherTimelineProps {
  hours: WeatherHourDto[];
}

/**
 * Horizontal scrolling timeline of hourly weather data
 */
export function WeatherTimeline({ hours }: WeatherTimelineProps) {
  // Transform to view model
  const hourViewModels: WeatherHourViewModel[] = hours.map((hour) => ({
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
  }));

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
```

#### 3.3 `WeatherRefreshButton.tsx`

```typescript
// Nowy plik: src/components/trip-details/components/WeatherRefreshButton.tsx

import React from "react";
import { RefreshCw, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeatherRefreshButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  variant?: "icon" | "full";
}

/**
 * Button to trigger weather refresh from API
 */
export function WeatherRefreshButton({ 
  onClick, 
  isLoading, 
  disabled = false,
  variant = "icon" 
}: WeatherRefreshButtonProps) {
  if (variant === "full") {
    return (
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        size="sm"
        variant="secondary"
        className="gap-2"
      >
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            Pobieranie...
          </>
        ) : (
          <>
            <CloudDownload className="h-4 w-4" aria-hidden="true" />
            Pobierz pogodę
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      aria-label={isLoading ? "Pobieranie pogody..." : "Odśwież pogodę"}
    >
      <RefreshCw 
        className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} 
        aria-hidden="true" 
      />
    </Button>
  );
}
```

#### 3.4 `WeatherEmptyState.tsx`

```typescript
// Nowy plik: src/components/trip-details/components/WeatherEmptyState.tsx

import React from "react";
import { Cloud, MapPinOff, Clock } from "lucide-react";
import { WeatherRefreshButton } from "./WeatherRefreshButton";

interface WeatherEmptyStateProps {
  canRefresh: boolean;
  hasLocation: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  error?: string | null;
}

/**
 * Empty state when no weather data is available
 */
export function WeatherEmptyState({ 
  canRefresh, 
  hasLocation, 
  onRefresh, 
  isRefreshing,
  error 
}: WeatherEmptyStateProps) {
  // Determine the reason for no data
  const getContent = () => {
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
  };

  const content = getContent();
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
          <WeatherRefreshButton
            onClick={onRefresh}
            isLoading={isRefreshing}
            variant="full"
          />
        </div>
      )}
    </div>
  );
}
```

---

### Etap 4: Zaktualizowany `WeatherSection.tsx`

```typescript
// Zaktualizowany plik: src/components/trip-details/components/WeatherSection.tsx

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
export function WeatherSection({ 
  weatherCurrent, 
  tripId,
  tripStartedAt,
  tripEndedAt,
  location,
}: WeatherSectionProps) {
  const {
    weatherData,
    isLoading,
    error,
    isRefreshing,
    refreshError,
    canRefresh,
    refreshWeather,
    hasWeatherData,
  } = useWeather({
    tripId,
    tripStartedAt,
    tripEndedAt,
    weatherCurrent,
    hasLocation: !!location,
  });

  // Loading state
  if (isLoading && weatherCurrent) {
    return (
      <section className="geist-card p-6" aria-labelledby="weather-heading">
        <SectionHeader title="Pogoda" />
        <div className="mt-4 flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">
            Ładowanie danych pogodowych...
          </div>
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
            hasLocation={!!location}
            onRefresh={refreshWeather}
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
          canRefresh && (
            <WeatherRefreshButton
              onClick={refreshWeather}
              isLoading={isRefreshing}
              variant="icon"
            />
          )
        }
      />

      {/* Error banner */}
      {(error || refreshError) && (
        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error || refreshError}</p>
        </div>
      )}

      {/* Weather timeline */}
      {hours.length > 0 ? (
        <div className="mt-4">
          <WeatherTimeline hours={hours} />
          <p className="mt-3 text-xs text-muted-foreground">
            Źródło: <span className="font-medium">{sourceLabel}</span>
          </p>
        </div>
      ) : (
        <div className="mt-4 text-sm text-muted-foreground text-center py-8">
          Brak szczegółowych danych godzinowych.
        </div>
      )}
    </section>
  );
}
```

---

### Etap 5: Aktualizacja typów i kontekstu

#### 5.1 Rozszerzenie `WeatherSectionProps` w `types.ts`

```typescript
// Aktualizacja: src/components/trip-details/types.ts

import type { TripLocationDto } from "@/types";

export interface WeatherSectionProps {
  weatherCurrent: TripWeatherCurrentDto | null;
  tripId: string;
  tripStartedAt: string;
  tripEndedAt: string | null;
  location: TripLocationDto | null;
}
```

#### 5.2 Aktualizacja `TripDetailsContent.tsx`

```typescript
// W TripDetailsContent.tsx - dodaj brakujące propsy do WeatherSection
<WeatherSection 
  weatherCurrent={trip.weather_current ?? null} 
  tripId={tripId}
  tripStartedAt={trip.started_at}
  tripEndedAt={trip.ended_at}
  location={trip.location}
/>
```

---

### Etap 6: Eksport hooków

```typescript
// Aktualizacja: src/components/hooks/index.ts

export { useWeather, weatherQueryKeys } from "./useWeather";
```

---

## 4. Struktura plików do utworzenia/modyfikacji

### Nowe pliki

| Ścieżka | Opis |
|---------|------|
| `src/lib/api/weather.ts` | Client API dla pogody |
| `src/components/hooks/useWeather.ts` | Hook zarządzania pogodą |
| `src/components/trip-details/components/WeatherTimeline.tsx` | Timeline godzinowy |
| `src/components/trip-details/components/WeatherHourCard.tsx` | Karta godzinowa |
| `src/components/trip-details/components/WeatherRefreshButton.tsx` | Przycisk odświeżania |
| `src/components/trip-details/components/WeatherEmptyState.tsx` | Stan pusty |

### Modyfikowane pliki

| Ścieżka | Zmiany |
|---------|--------|
| `src/components/trip-details/components/WeatherSection.tsx` | Pełna reimplementacja |
| `src/components/trip-details/types.ts` | Rozszerzenie `WeatherSectionProps` |
| `src/components/trip-details/components/TripDetailsContent.tsx` | Dodanie nowych propsów |
| `src/components/hooks/index.ts` | Eksport `useWeather` |

---

## 5. Przepływ UX

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Użytkownik otwiera szczegóły wyprawy                        │
│     ↓                                                           │
│  2. WeatherSection sprawdza weather_current z trip response     │
│     ├── Jeśli null → wyświetl WeatherEmptyState                │
│     │   └── Przycisk "Pobierz pogodę" (jeśli canRefresh=true)  │
│     └── Jeśli exists → pobierz snapshot z hours                │
│         └── Wyświetl WeatherTimeline                           │
│                                                                 │
│  3. Użytkownik klika "Pobierz pogodę"                          │
│     ↓                                                           │
│  4. POST /weather/refresh z period_start/period_end z wyprawy  │
│     ├── Loading state (spinner na przycisku)                   │
│     ├── Success → invalidate trip query → re-render            │
│     └── Error → wyświetl komunikat błędu                       │
│                                                                 │
│  5. Po udanym pobraniu: wyświetl timeline z kartami godzinowymi │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Obsługa błędów

| Scenariusz | Zachowanie UI |
|------------|---------------|
| Brak lokalizacji wyprawy | WeatherEmptyState z ikoną MapPinOff |
| Wyprawa starsza niż 24h | WeatherEmptyState z ikoną Clock |
| Rate limit API pogodowego | Toast/banner z komunikatem + retry |
| Błąd sieci | Banner z błędem + przycisk retry |
| Puste dane godzinowe | Komunikat "Brak szczegółowych danych" |

---

## 7. Kolejność implementacji

1. **`src/lib/api/weather.ts`** - client API
2. **`src/components/hooks/useWeather.ts`** - hook
3. **`WeatherHourCard.tsx`** - komponent bazowy
4. **`WeatherTimeline.tsx`** - timeline
5. **`WeatherRefreshButton.tsx`** - przycisk
6. **`WeatherEmptyState.tsx`** - stan pusty
7. **Aktualizacja `types.ts`** - rozszerzenie propsów
8. **Reimplementacja `WeatherSection.tsx`** - główny komponent
9. **Aktualizacja `TripDetailsContent.tsx`** - przekazanie propsów
10. **Eksport w `hooks/index.ts`**

---

## 8. Estymacja czasowa

| Etap | Czas |
|------|------|
| API client + hook | 1-2h |
| Komponenty UI (4 pliki) | 2-3h |
| Integracja + testy manualne | 1-2h |
| **Razem** | **4-7h** |

---

## 9. Zależności

### Wymagane pakiety (już zainstalowane)

- `@tanstack/react-query` - zarządzanie stanem asynchronicznym
- `lucide-react` - ikony
- `zod` - walidacja (backend)

### Zmienne środowiskowe

```env
ACCUWEATHER_API_KEY=your_api_key_here
ACCUWEATHER_BASE_URL=https://dataservice.accuweather.com
```

---

## 10. Testy manualne

### Scenariusze do przetestowania

1. **Wyprawa bez lokalizacji** → WeatherEmptyState z ikoną MapPinOff
2. **Wyprawa starsza niż 24h** → WeatherEmptyState z ikoną Clock
3. **Wyprawa z lokalizacją, bez danych pogodowych** → Przycisk "Pobierz pogodę"
4. **Kliknięcie "Pobierz pogodę"** → Spinner, następnie timeline
5. **Błąd API (rate limit)** → Komunikat błędu
6. **Wyprawa z istniejącymi danymi** → Timeline od razu
7. **Przycisk odświeżenia** → Spinner, aktualizacja danych

