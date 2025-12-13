# Plan implementacji widoku Szczegóły Wyprawy

## 1. Przegląd

Widok Szczegóły Wyprawy (`TripDetailsView`) prezentuje pełne informacje o pojedynczej wyprawie wędkarskiej wraz ze wszystkimi powiązanymi danymi: połowami, sprzętem, pogodą i lokalizacją. Jest to główny widok do przeglądania i zarządzania wyprawą.

**Główne funkcjonalności:**
- Wyświetlanie podstawowych danych wyprawy (daty, status, lokalizacja)
- Podsumowanie statystyk (czas trwania, liczba połowów, łączna waga, największa ryba)
- Wizualizacja lokalizacji na mapie Google Maps
- Oś czasu pogody z przewijaniem poziomym
- Lista połowów z miniaturkami zdjęć
- Sekcje sprzętu (wędki, przynęty, zanęty)
- Akcje: zamknięcie wyprawy, usunięcie wyprawy, dodanie połowu

## 2. Routing widoku

```
/app/trips/[id]
```

**Parametr ścieżki:**
- `id` - UUID wyprawy

**Przykład:** `/app/trips/550e8400-e29b-41d4-a716-446655440000`

## 3. Struktura komponentów

```
TripDetailsPage.astro
└── TripDetailsView (React, client:load)
    ├── TripDetailsLoading (skeleton)
    ├── TripDetailsError
    └── TripDetailsContent
        ├── TripHeader
        │   ├── StatusBadge
        │   ├── TripDateTimeDisplay
        │   └── TripActionsMenu
        │       └── DropdownMenu (shadcn)
        │           ├── EditMenuItem
        │           ├── CloseMenuItem
        │           └── DeleteMenuItem
        ├── TripSummaryGrid
        │   └── StatCard (x4)
        ├── LocationSection
        │   ├── SectionHeader
        │   └── LocationMap (lazy loaded)
        ├── WeatherSection
        │   ├── SectionHeader
        │   ├── WeatherManualBanner (conditional)
        │   └── WeatherTimeline
        │       └── WeatherHourCard[]
        ├── CatchesSection
        │   ├── SectionHeader
        │   └── CatchList
        │       └── CatchCard[]
        ├── EquipmentSection
        │   ├── SectionHeader
        │   └── EquipmentChipsGroup
        │       ├── ChipSection (wędki)
        │       ├── ChipSection (przynęty)
        │       └── ChipSection (zanęty)
        ├── AddCatchFAB
        └── ConfirmDialog (dla close/delete)
```

## 4. Szczegóły komponentów

### 4.1 TripDetailsPage.astro

**Opis:** Strona Astro służąca jako kontener dla widoku. Weryfikuje sesję użytkownika, pobiera ID wyprawy z URL i renderuje komponent React.

**Główne elementy:**
- `<Layout>` - wrapper layoutu aplikacji
- `<TripDetailsView>` z atrybutem `client:load`

**Propsy przekazywane do TripDetailsView:**
```typescript
interface TripDetailsPageProps {
  tripId: string;
}
```

---

### 4.2 TripDetailsView

**Opis:** Główny komponent React odpowiedzialny za zarządzanie stanem i orkiestrację całego widoku. Używa custom hooka do pobierania danych i zarządzania operacjami.

**Główne elementy:**
- Warunkowe renderowanie Loading/Error/Content
- Context provider dla akcji wyprawy

**Obsługiwane interakcje:**
- Pobieranie danych przy montowaniu
- Odświeżanie po akcjach (close/delete)

**Typy:**
- `TripDetailsViewModel`
- `TripGetResponseDto`

**Propsy:**
```typescript
interface TripDetailsViewProps {
  tripId: string;
}
```

---

### 4.3 TripHeader

**Opis:** Nagłówek wyprawy zawierający daty rozpoczęcia/zakończenia, status i menu akcji.

**Główne elementy:**
- `<header>` z flexbox layoutem
- `StatusBadge` - odznaka statusu (draft/active/closed)
- `TripDateTimeDisplay` - formatowane daty i czas trwania
- `TripActionsMenu` - dropdown z akcjami

**Obsługiwane interakcje:**
- Kliknięcie menu akcji
- Kliknięcie "Edytuj" → nawigacja do formularza edycji
- Kliknięcie "Zamknij" → dialog potwierdzenia → API call
- Kliknięcie "Usuń" → dialog potwierdzenia → API call

**Walidacja:**
- Przycisk "Zamknij" widoczny tylko gdy `status !== 'closed'`
- Przycisk "Usuń" zawsze dostępny

**Typy:**
- `TripDto`
- `TripStatus`

**Propsy:**
```typescript
interface TripHeaderProps {
  trip: TripDto;
  onClose: () => void;
  onDelete: () => void;
  isClosing: boolean;
  isDeleting: boolean;
}
```

---

### 4.4 StatusBadge

**Opis:** Odznaka wizualizująca status wyprawy z odpowiednim kolorem i ikoną.

**Główne elementy:**
- `<span>` z klasami Tailwind dla różnych wariantów
- Ikona z lucide-react

**Mapowanie statusów:**
| Status | Kolor | Ikona | Tekst |
|--------|-------|-------|-------|
| draft | gray | FileEdit | Szkic |
| active | green | Play | Aktywna |
| closed | blue | CheckCircle | Zakończona |

**Propsy:**
```typescript
interface StatusBadgeProps {
  status: TripStatus;
}
```

---

### 4.5 TripSummaryGrid

**Opis:** Siatka kart ze statystykami wyprawy w stylu Material Design 3.

**Główne elementy:**
- `<div>` z CSS Grid (2x2 na mobile, 4x1 na desktop)
- 4x `StatCard`

**Statystyki:**
1. **Czas trwania** - obliczany z `started_at` i `ended_at` (lub now() dla aktywnych)
2. **Liczba połowów** - długość tablicy `catches`
3. **Łączna waga** - suma `weight_g` z catches (konwersja na kg)
4. **Największa ryba** - max `weight_g` lub `length_mm`

**Typy:**
- `TripSummaryViewModel`
- `CatchInTripDto[]`

**Propsy:**
```typescript
interface TripSummaryGridProps {
  startedAt: string;
  endedAt: string | null;
  status: TripStatus;
  catches: CatchInTripDto[];
}
```

---

### 4.6 StatCard

**Opis:** Pojedyncza karta statystyki z ikoną, etykietą, wartością i jednostką.

**Główne elementy:**
- `<div>` z tłem, cieniem i zaokrąglonymi rogami
- Ikona w górnej części
- Wartość liczbowa (duża typografia)
- Etykieta i jednostka

**Propsy:**
```typescript
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
}
```

---

### 4.7 LocationSection

**Opis:** Sekcja z mapą Google Maps pokazującą lokalizację wyprawy.

**Główne elementy:**
- `SectionHeader` z tytułem "Lokalizacja"
- `LocationMap` (lazy loaded) lub placeholder gdy brak lokalizacji

**Obsługiwane interakcje:**
- Interakcja z mapą (zoom, pan)
- Kliknięcie markera (opcjonalnie: otwórz w Google Maps)

**Walidacja:**
- Sekcja widoczna tylko gdy `location !== null`

**Propsy:**
```typescript
interface LocationSectionProps {
  location: TripLocationDto | null;
}
```

---

### 4.8 LocationMap

**Opis:** Komponent mapy Google Maps z markerem na lokalizacji wyprawy.

**Główne elementy:**
- Kontener mapy z określoną wysokością
- Marker na współrzędnych
- Opcjonalny label z nazwą miejsca

**Uwagi techniczne:**
- Lazy loading z React.lazy + Suspense
- Użycie @react-google-maps/api lub google-maps-react
- Klucz API z zmiennych środowiskowych

**Propsy:**
```typescript
interface LocationMapProps {
  lat: number;
  lng: number;
  label?: string | null;
}
```

---

### 4.9 WeatherSection

**Opis:** Sekcja pogodowa z osią czasu lub zachętą do ręcznego wprowadzenia danych.

**Główne elementy:**
- `SectionHeader` z tytułem "Pogoda"
- Warunkowe: `WeatherManualBanner` (gdy brak danych) lub `WeatherTimeline`

**Walidacja:**
- `WeatherManualBanner` gdy `weather_current === null`
- `WeatherTimeline` gdy `weather_current !== null`

**Propsy:**
```typescript
interface WeatherSectionProps {
  weatherCurrent: TripWeatherCurrentDto | null;
  tripId: string;
}
```

---

### 4.10 WeatherManualBanner

**Opis:** Baner CTA zachęcający do ręcznego wprowadzenia danych pogodowych.

**Główne elementy:**
- Ikona chmury/pogody
- Tekst informacyjny
- Przycisk "Dodaj dane pogodowe"

**Obsługiwane interakcje:**
- Kliknięcie przycisku → nawigacja do formularza pogody

**Propsy:**
```typescript
interface WeatherManualBannerProps {
  tripId: string;
}
```

---

### 4.11 WeatherTimeline

**Opis:** Pozioma oś czasu z kartami godzinowymi pogody.

**Główne elementy:**
- `<div>` z `overflow-x-auto` dla horizontal scroll
- Flex container z kartami
- `WeatherHourCard[]`

**Uwagi UX:**
- Scroll indicators na mobile
- Touch-friendly scroll
- Snap points na kartach

**Propsy:**
```typescript
interface WeatherTimelineProps {
  snapshotId: string;
  hours: WeatherHourDto[];
}
```

---

### 4.12 WeatherHourCard

**Opis:** Karta z danymi pogodowymi dla pojedynczej godziny.

**Główne elementy:**
- Godzina (sformatowana)
- Ikona pogody
- Temperatura
- Wiatr (prędkość, kierunek)
- Ciśnienie
- Wilgotność (opcjonalnie)

**Propsy:**
```typescript
interface WeatherHourCardProps {
  hour: WeatherHourDto;
}
```

---

### 4.13 CatchesSection

**Opis:** Sekcja z listą złowionych ryb.

**Główne elementy:**
- `SectionHeader` z tytułem "Połowy" i licznikiem
- `CatchList` lub empty state

**Walidacja:**
- Empty state gdy `catches.length === 0`

**Propsy:**
```typescript
interface CatchesSectionProps {
  catches: CatchInTripDto[];
  tripId: string;
}
```

---

### 4.14 CatchCard

**Opis:** Karta pojedynczego połowu z podstawowymi informacjami.

**Główne elementy:**
- Miniaturka zdjęcia (lub placeholder)
- Nazwa gatunku
- Waga i długość (jeśli dostępne)
- Przynęta i zanęta
- Czas połowu

**Obsługiwane interakcje:**
- Kliknięcie → nawigacja do szczegółów połowu

**Propsy:**
```typescript
interface CatchCardProps {
  catch: CatchInTripDto;
}
```

---

### 4.15 EquipmentSection

**Opis:** Sekcja z przypisanym sprzętem w formie chipów.

**Główne elementy:**
- `SectionHeader` z tytułem "Sprzęt"
- Trzy grupy chipów: wędki, przynęty, zanęty
- Etykiety sekcji

**Propsy:**
```typescript
interface EquipmentSectionProps {
  equipment: TripEquipmentDto | undefined;
}
```

---

### 4.16 EquipmentChips

**Opis:** Grupa chipów dla pojedynczego typu sprzętu.

**Główne elementy:**
- Etykieta typu sprzętu
- Flex wrap container z chipami
- Pojedyncze chipy z nazwą

**Propsy:**
```typescript
interface EquipmentChipsProps {
  label: string;
  items: { id: string; name_snapshot: string }[];
  icon: LucideIcon;
}
```

---

### 4.17 AddCatchFAB

**Opis:** Pływający przycisk akcji (FAB) do dodawania połowu.

**Główne elementy:**
- `<Button>` z wariantem FAB (fixed position, bottom-right)
- Ikona plus
- Opcjonalny tekst "Dodaj połów"

**Obsługiwane interakcje:**
- Kliknięcie → nawigacja do formularza dodawania połowu

**Walidacja:**
- Widoczny tylko dla wypraw ze statusem `active` lub `draft`

**Propsy:**
```typescript
interface AddCatchFABProps {
  tripId: string;
  disabled?: boolean;
}
```

---

### 4.18 ConfirmDialog

**Opis:** Dialog potwierdzenia dla akcji zamknięcia i usunięcia wyprawy.

**Główne elementy:**
- Shadcn `AlertDialog` component
- Tytuł i opis
- Przyciski: Anuluj, Potwierdź

**Obsługiwane interakcje:**
- Kliknięcie "Anuluj" → zamknięcie dialogu
- Kliknięcie "Potwierdź" → wywołanie callback

**Propsy:**
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'destructive';
}
```

## 5. Typy

### 5.1 Typy z API (istniejące w `src/types.ts`)

```typescript
// Używane bezpośrednio z types.ts
import type {
  TripDto,
  TripGetResponseDto,
  TripStatus,
  TripLocationDto,
  TripEquipmentDto,
  TripEquipmentRodItemDto,
  TripEquipmentLureItemDto,
  TripEquipmentGroundbaitItemDto,
  TripWeatherCurrentDto,
  CatchInTripDto,
  CatchPhotoDto,
  CloseTripCommand,
  ApiErrorResponse,
} from '@/types';
```

### 5.2 Typy ViewModel (nowe)

```typescript
// src/components/trip-details/types.ts

import type { TripGetResponseDto, TripStatus, CatchInTripDto } from '@/types';

/**
 * Stan głównego widoku szczegółów wyprawy
 */
export interface TripDetailsState {
  trip: TripGetResponseDto | null;
  isLoading: boolean;
  error: TripDetailsError | null;
  isClosing: boolean;
  isDeleting: boolean;
}

/**
 * Błąd w widoku szczegółów wyprawy
 */
export interface TripDetailsError {
  code: string;
  message: string;
}

/**
 * Obliczone statystyki wyprawy
 */
export interface TripSummaryViewModel {
  /** Czas trwania w minutach (null jeśli nie można obliczyć) */
  durationMinutes: number | null;
  /** Sformatowany czas trwania (np. "3h 45min") */
  durationFormatted: string;
  /** Liczba połowów */
  catchCount: number;
  /** Łączna waga w gramach */
  totalWeightG: number;
  /** Łączna waga sformatowana (np. "12.5 kg") */
  totalWeightFormatted: string;
  /** Waga największej ryby w gramach */
  biggestCatchWeightG: number | null;
  /** Największa ryba sformatowana */
  biggestCatchFormatted: string;
}

/**
 * Pojedyncza karta statystyki
 */
export interface StatCardData {
  id: string;
  icon: string; // nazwa ikony z lucide-react
  label: string;
  value: string;
  unit?: string;
}

/**
 * Dane godzinowe pogody do wyświetlenia
 */
export interface WeatherHourViewModel {
  /** Sformatowana godzina (np. "14:00") */
  hourFormatted: string;
  /** Temperatura w °C */
  temperatureC: number | null;
  /** Ikona pogody (kod AccuWeather) */
  weatherIcon: string | null;
  /** Opis pogody */
  weatherText: string | null;
  /** Prędkość wiatru km/h */
  windSpeedKmh: number | null;
  /** Kierunek wiatru w stopniach */
  windDirection: number | null;
  /** Ciśnienie hPa */
  pressureHpa: number | null;
  /** Wilgotność % */
  humidityPercent: number | null;
}

/**
 * Akcje dostępne dla wyprawy
 */
export interface TripActions {
  canEdit: boolean;
  canClose: boolean;
  canDelete: boolean;
  canAddCatch: boolean;
}
```

### 5.3 Typy dla komponentów

```typescript
// Propsy głównych komponentów - definicje w sekcji 4

// Hook return type
export interface UseTripDetailsReturn {
  state: TripDetailsState;
  actions: {
    closeTrip: (endedAt: string) => Promise<void>;
    deleteTrip: () => Promise<void>;
    refresh: () => Promise<void>;
  };
  computed: {
    summary: TripSummaryViewModel | null;
    tripActions: TripActions;
  };
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useTripDetails`

```typescript
// src/components/trip-details/hooks/useTripDetails.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TripGetResponseDto } from '@/types';
import type { TripDetailsState, UseTripDetailsReturn, TripSummaryViewModel, TripActions } from '../types';

export function useTripDetails(tripId: string): UseTripDetailsReturn {
  const [state, setState] = useState<TripDetailsState>({
    trip: null,
    isLoading: true,
    error: null,
    isClosing: false,
    isDeleting: false,
  });

  // Fetch trip data
  const fetchTrip = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(
        `/api/v1/trips/${tripId}?include=catches,rods,lures,groundbaits,weather_current`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Nie udało się pobrać wyprawy');
      }
      
      const trip: TripGetResponseDto = await response.json();
      setState(prev => ({ ...prev, trip, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'fetch_error',
          message: error instanceof Error ? error.message : 'Nieznany błąd',
        },
      }));
    }
  }, [tripId]);

  // Close trip
  const closeTrip = useCallback(async (endedAt: string) => {
    setState(prev => ({ ...prev, isClosing: true }));
    
    try {
      const response = await fetch(`/api/v1/trips/${tripId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ended_at: endedAt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Nie udało się zamknąć wyprawy');
      }
      
      // Refresh data after close
      await fetchTrip();
    } finally {
      setState(prev => ({ ...prev, isClosing: false }));
    }
  }, [tripId, fetchTrip]);

  // Delete trip
  const deleteTrip = useCallback(async () => {
    setState(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Nie udało się usunąć wyprawy');
      }
      
      // Redirect to dashboard after delete
      window.location.href = '/app';
    } catch (error) {
      setState(prev => ({ ...prev, isDeleting: false }));
      throw error;
    }
  }, [tripId]);

  // Computed: summary
  const summary = useMemo<TripSummaryViewModel | null>(() => {
    if (!state.trip) return null;
    
    const catches = state.trip.catches ?? [];
    const startedAt = new Date(state.trip.started_at);
    const endedAt = state.trip.ended_at 
      ? new Date(state.trip.ended_at) 
      : (state.trip.status === 'active' ? new Date() : null);
    
    const durationMinutes = endedAt 
      ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000)
      : null;
    
    const totalWeightG = catches.reduce((sum, c) => sum + (c.weight_g ?? 0), 0);
    const biggestCatch = catches.reduce<number | null>((max, c) => {
      if (c.weight_g === null) return max;
      return max === null ? c.weight_g : Math.max(max, c.weight_g);
    }, null);
    
    return {
      durationMinutes,
      durationFormatted: formatDuration(durationMinutes),
      catchCount: catches.length,
      totalWeightG,
      totalWeightFormatted: formatWeight(totalWeightG),
      biggestCatchWeightG: biggestCatch,
      biggestCatchFormatted: biggestCatch ? formatWeight(biggestCatch) : '-',
    };
  }, [state.trip]);

  // Computed: available actions
  const tripActions = useMemo<TripActions>(() => {
    if (!state.trip) {
      return { canEdit: false, canClose: false, canDelete: false, canAddCatch: false };
    }
    
    const { status } = state.trip;
    return {
      canEdit: status !== 'closed',
      canClose: status !== 'closed',
      canDelete: true,
      canAddCatch: status === 'active' || status === 'draft',
    };
  }, [state.trip]);

  // Initial fetch
  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return {
    state,
    actions: {
      closeTrip,
      deleteTrip,
      refresh: fetchTrip,
    },
    computed: {
      summary,
      tripActions,
    },
  };
}

// Helper functions
function formatDuration(minutes: number | null): string {
  if (minutes === null) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}
```

### 6.2 Context dla akcji (opcjonalny)

```typescript
// src/components/trip-details/context/TripActionsContext.tsx

import { createContext, useContext } from 'react';
import type { TripActions } from '../types';

interface TripActionsContextValue {
  tripId: string;
  actions: TripActions;
  closeTrip: (endedAt: string) => Promise<void>;
  deleteTrip: () => Promise<void>;
  isClosing: boolean;
  isDeleting: boolean;
}

const TripActionsContext = createContext<TripActionsContextValue | null>(null);

export function useTripActions() {
  const context = useContext(TripActionsContext);
  if (!context) {
    throw new Error('useTripActions must be used within TripActionsProvider');
  }
  return context;
}

export const TripActionsProvider = TripActionsContext.Provider;
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Wszystkie endpointy szczegółów wyprawy wymagają autoryzacji poprzez **Supabase SDK**:

**Server-side (Astro middleware + API endpoints):**
```typescript
// Middleware automatycznie weryfikuje sesję dla /app/*
const supabase = Astro.locals.supabase;
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ 
    error: { code: 'unauthorized', message: 'Unauthorized' }
  }), { status: 401 });
}

// Wszystkie zapytania do bazy używają user.id jako filtra
const trip = await tripService.getById(tripId, user.id);
```

**Client-side (React components):**
- Cookies z tokenami Supabase są automatycznie wysyłane z każdym żądaniem fetch
- Middleware weryfikuje sesję przed renderowaniem `/app/trips/[id]`

**Konfiguracja:**
- `PUBLIC_SUPABASE_URL` - URL projektu Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Publiczny klucz anon

### 7.1 Pobieranie szczegółów wyprawy

**Endpoint:** `GET /api/v1/trips/{id}`

**Query parameters:**
- `include=catches,rods,lures,groundbaits,weather_current`

**Request:**
```typescript
const response = await fetch(
  `/api/v1/trips/${tripId}?include=catches,rods,lures,groundbaits,weather_current`
);
```

**Response type:** `TripGetResponseDto`

```typescript
interface TripGetResponseDto {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: TripStatus;
  location: TripLocationDto | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  equipment?: TripEquipmentDto;
  catches?: CatchInTripDto[];
  weather_current?: TripWeatherCurrentDto | null;
}
```

### 7.2 Zamykanie wyprawy

**Endpoint:** `POST /api/v1/trips/{id}/close`

**Request body type:** `CloseTripCommand`

```typescript
interface CloseTripCommand {
  ended_at: string; // ISO datetime
}
```

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}/close`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ended_at: new Date().toISOString() }),
});
```

**Response type:** `TripDto`

### 7.3 Usuwanie wyprawy (soft-delete)

**Endpoint:** `DELETE /api/v1/trips/{id}`

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}`, {
  method: 'DELETE',
});
```

**Response:** `204 No Content`

### 7.4 Endpointy pogodowe

Widok Szczegóły Wyprawy integruje się z następującymi endpointami pogodowymi zdefiniowanymi w `api-plan.md`:

#### GET /api/v1/trips/{tripId}/weather/current
Pobiera aktualny snapshot pogodowy dla wyprawy (preferuje manual > api).

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}/weather/current`);
```

**Response type (200 OK):** `TripWeatherCurrentResponseDto`
```typescript
interface TripWeatherCurrentResponseDto {
  snapshot_id: string;
  source: 'api' | 'manual';
}
```

**Błędy:**
- `404 not_found` - brak snapshotów pogodowych dla wyprawy

#### POST /api/v1/trips/{tripId}/weather/refresh
Pobiera dane pogodowe z zewnętrznego API i tworzy nowy snapshot.

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}/weather/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period_start: '2025-12-13T08:00:00Z',
    period_end: '2025-12-13T16:00:00Z',
    force: false
  }),
});
```

**Response (201 Created):** `WeatherRefreshResponseDto`
```typescript
interface WeatherRefreshResponseDto {
  snapshot_id: string;
}
```

#### POST /api/v1/trips/{tripId}/weather/manual
Tworzy ręczny snapshot pogodowy z danymi godzinowymi.

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}/weather/manual`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fetched_at: '2025-12-13T10:00:00Z',
    period_start: '2025-12-13T08:00:00Z',
    period_end: '2025-12-13T16:00:00Z',
    hours: [
      {
        observed_at: '2025-12-13T08:00:00Z',
        temperature_c: 12,
        pressure_hpa: 1015,
        wind_speed_kmh: 10,
        wind_direction: 180,
        humidity_percent: 75,
        precipitation_mm: 0,
        cloud_cover: 50,
        weather_icon: null,
        weather_text: 'Częściowe zachmurzenie'
      }
    ]
  }),
});
```

**Response (201 Created):** `WeatherManualResponseDto`
```typescript
interface WeatherManualResponseDto {
  snapshot_id: string;
}
```

#### GET /api/v1/trips/{tripId}/weather/snapshots
Lista wszystkich snapshotów pogodowych dla wyprawy.

**Request:**
```typescript
const response = await fetch(`/api/v1/trips/${tripId}/weather/snapshots?limit=20&sort=fetched_at&order=desc`);
```

**Response type:** `WeatherSnapshotListResponseDto`
```typescript
interface WeatherSnapshotListResponseDto {
  data: WeatherSnapshotDto[];
  page: PageInfo;
}
```

#### GET /api/v1/weather/snapshots/{snapshotId}
Pobiera szczegóły konkretnego snapshota pogodowego z danymi godzinowymi.

**Request:**
```typescript
const response = await fetch(`/api/v1/weather/snapshots/${snapshotId}?include_hours=true`);
```

**Response type:** `WeatherSnapshotGetResponseDto`
```typescript
interface WeatherSnapshotGetResponseDto {
  snapshot: WeatherSnapshotDetailDto;
  hours: WeatherHourDto[];
}
```

### 7.5 Typy danych pogodowych

```typescript
// Pojedynczy wpis godzinowy pogody
interface WeatherHourDto {
  observed_at: string;        // ISO datetime
  temperature_c: number | null;
  pressure_hpa: number | null;
  wind_speed_kmh: number | null;
  wind_direction: number | null;  // 0-360 stopni
  humidity_percent: number | null;
  precipitation_mm: number | null;
  cloud_cover: number | null;     // 0-100%
  weather_icon: string | null;
  weather_text: string | null;
}

// Aktualny snapshot pogodowy dla wyprawy
interface TripWeatherCurrentDto {
  snapshot_id: string;
  source: 'api' | 'manual';
}

// Szczegóły snapshota pogodowego
interface WeatherSnapshotDetailDto {
  id: string;
  trip_id: string;
  source: 'api' | 'manual';
  fetched_at: string;
  period_start: string;
  period_end: string;
}
```

### 7.6 Obsługa błędów API

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      reason?: string;
    };
  };
}
```

| Kod HTTP | Kod błędu | Opis |
|----------|-----------|------|
| 400 | `validation_error` | Nieprawidłowe dane wejściowe |
| 401 | `unauthorized` | Brak sesji użytkownika |
| 404 | `not_found` | Wyprawa lub dane pogodowe nie istnieją |
| 502 | `bad_gateway` | Błąd zewnętrznego API pogody (dla refresh) |
| 500 | `internal_error` | Błąd serwera |

## 8. Interakcje użytkownika

| Interakcja | Element | Oczekiwany wynik |
|------------|---------|------------------|
| Załadowanie strony | - | Pobranie danych wyprawy, wyświetlenie loading skeleton |
| Kliknięcie menu akcji | TripActionsMenu | Otwarcie dropdown z opcjami |
| Kliknięcie "Edytuj" | MenuItem | Nawigacja do `/app/trips/{id}/edit` |
| Kliknięcie "Zamknij wyprawę" | MenuItem | Otwarcie dialogu potwierdzenia |
| Potwierdzenie zamknięcia | ConfirmDialog | API call, aktualizacja widoku, zmiana statusu na "closed" |
| Kliknięcie "Usuń" | MenuItem | Otwarcie dialogu potwierdzenia (destructive) |
| Potwierdzenie usunięcia | ConfirmDialog | API call, redirect do dashboard |
| Scroll osi czasu pogody | WeatherTimeline | Poziome przewijanie kart pogodowych |
| Kliknięcie karty połowu | CatchCard | Nawigacja do `/app/catches/{id}` |
| Kliknięcie FAB "Dodaj połów" | AddCatchFAB | Nawigacja do `/app/trips/{id}/catches/new` |
| Interakcja z mapą | LocationMap | Zoom, pan, opcjonalnie otwarcie w Google Maps |
| Kliknięcie "Dodaj dane pogodowe" | WeatherManualBanner | Nawigacja do formularza ręcznego wprowadzania |

## 9. Warunki i walidacja

### 9.1 Warunki wyświetlania

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `status !== 'closed'` | CloseMenuItem | Widoczność przycisku zamknięcia |
| `status === 'active' \|\| status === 'draft'` | AddCatchFAB | Widoczność FAB |
| `location !== null` | LocationSection | Wyświetlanie sekcji lokalizacji |
| `weather_current !== null` | WeatherTimeline | Wyświetlanie osi czasu zamiast banera |
| `weather_current === null` | WeatherManualBanner | Wyświetlanie banera CTA |
| `catches?.length > 0` | CatchList | Wyświetlanie listy zamiast empty state |
| `equipment !== undefined` | EquipmentSection | Wyświetlanie sekcji sprzętu |

### 9.2 Walidacja zamykania wyprawy

| Warunek | Komunikat błędu |
|---------|-----------------|
| `ended_at` musi być w formacie ISO datetime | "Nieprawidłowy format daty" |
| `ended_at >= started_at` | "Data zakończenia musi być późniejsza niż rozpoczęcia" |
| Wyprawa nie może być już zamknięta | "Wyprawa jest już zamknięta" |

### 9.3 Walidacja na poziomie komponentów

```typescript
// W TripHeader przed wywołaniem closeTrip
const handleCloseTrip = () => {
  const endedAt = new Date().toISOString();
  const startedAt = new Date(trip.started_at);
  
  if (new Date(endedAt) < startedAt) {
    // Teoretycznie niemożliwe przy użyciu current time
    toast.error('Data zakończenia musi być późniejsza niż rozpoczęcia');
    return;
  }
  
  onClose();
};
```

## 10. Obsługa błędów

### 10.1 Błędy pobierania danych

| Kod HTTP | Kod błędu | Obsługa |
|----------|-----------|---------|
| 401 | `unauthorized` | Redirect do strony logowania |
| 404 | `not_found` | Wyświetlenie TripDetailsError z komunikatem i przyciskiem powrotu |
| 500 | `internal_error` | Wyświetlenie TripDetailsError z opcją ponowienia |
| Network error | - | Wyświetlenie komunikatu offline z retry |

### 10.2 Błędy akcji

| Akcja | Błąd | Obsługa |
|-------|------|---------|
| Close | `validation_error` | Toast z komunikatem, zamknięcie dialogu |
| Close | `not_found` | Refresh danych, toast |
| Delete | `not_found` | Redirect do dashboard |
| Delete | Network error | Toast z opcją retry |

### 10.3 Komponent błędu

```typescript
interface TripDetailsErrorProps {
  error: TripDetailsError;
  onRetry?: () => void;
}

function TripDetailsError({ error, onRetry }: TripDetailsErrorProps) {
  const isNotFound = error.code === 'not_found';
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <AlertCircle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">
        {isNotFound ? 'Wyprawa nie została znaleziona' : 'Wystąpił błąd'}
      </h2>
      <p className="text-muted-foreground mb-6">{error.message}</p>
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <a href="/app/dashboard">Wróć do listy wypraw</a>
        </Button>
        {onRetry && !isNotFound && (
          <Button onClick={onRetry}>Spróbuj ponownie</Button>
        )}
      </div>
    </div>
  );
}
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury (1-2h)

1. Utworzenie struktury katalogów:
   ```
   src/
   ├── pages/
   │   └── app/
   │       └── trips/
   │           └── [id].astro
   └── components/
       └── trip-details/
           ├── types.ts
           ├── hooks/
           │   └── useTripDetails.ts
           ├── context/
           │   └── TripActionsContext.tsx
           └── components/
               ├── TripDetailsView.tsx
               ├── TripDetailsLoading.tsx
               ├── TripDetailsError.tsx
               ├── TripDetailsContent.tsx
               └── ... (pozostałe komponenty)
   ```

2. Utworzenie pliku typów `src/components/trip-details/types.ts`

3. Utworzenie strony Astro `src/pages/app/trips/[id].astro`

### Faza 2: Custom hook i kontekst (2h)

4. Implementacja `useTripDetails` hook z:
   - Pobieraniem danych
   - Akcjami close/delete
   - Computed values (summary, tripActions)

5. Implementacja `TripActionsContext` (opcjonalnie)

### Faza 3: Komponenty podstawowe (3-4h)

6. Implementacja `TripDetailsView` (główny kontener)

7. Implementacja `TripDetailsLoading` (skeleton)

8. Implementacja `TripDetailsError`

9. Implementacja `TripHeader` z:
   - `StatusBadge`
   - `TripDateTimeDisplay`
   - `TripActionsMenu` (używając shadcn DropdownMenu)

10. Implementacja `ConfirmDialog` (używając shadcn AlertDialog)

### Faza 4: Sekcje informacyjne (3-4h)

11. Implementacja `TripSummaryGrid` i `StatCard`

12. Implementacja `CatchesSection` z `CatchCard`

13. Implementacja `EquipmentSection` z `EquipmentChips`

14. Implementacja `AddCatchFAB`

### Faza 5: Komponenty specjalne (4-5h)

15. Implementacja `LocationSection` z lazy-loaded `LocationMap`:
    - Instalacja `@react-google-maps/api`
    - Konfiguracja klucza API
    - Implementacja mapy z markerem

16. Implementacja `WeatherSection`:
    - `WeatherManualBanner`
    - `WeatherTimeline` z horizontal scroll
    - `WeatherHourCard`

### Faza 6: Integracja i stylowanie (2-3h)

17. Złożenie wszystkich komponentów w `TripDetailsContent`

18. Dopracowanie responsywności (mobile/desktop)

19. Implementacja stanów ładowania i błędów

20. Dodanie animacji i transitions

### Faza 7: Testy i poprawki (2h)

21. Testowanie manualne wszystkich scenariuszy

22. Testowanie responsywności

23. Weryfikacja dostępności (ARIA, keyboard navigation)

24. Poprawki i optymalizacje

### Szacowany czas całkowity: 17-22h

### Zależności do zainstalowania

```bash
pnpm add @react-google-maps/api
pnpm add -D @types/google.maps
```

### Komponenty shadcn/ui do dodania

```bash
npx shadcn@latest add dropdown-menu
npx shadcn@latest add alert-dialog
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add separator
```

