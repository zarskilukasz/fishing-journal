# Plan implementacji widoku Edycja Wyprawy

## 1. Przegląd

Widok Edycja Wyprawy (`/app/trips/[id]/edit`) umożliwia zalogowanym użytkownikom modyfikację danych istniejącej wyprawy wędkarskiej. Użytkownik może edytować daty rozpoczęcia i zakończenia, lokalizację (z mapą Google), etykietę miejsca oraz przypisany sprzęt (wędki, przynęty, zanęty) poprzez multiselect z chips.

Kluczową funkcją UX jest ostrzeżenie użytkownika przy zmianie dat o potencjalnej utracie automatycznie pobranych danych pogodowych. Widok jest w pełni responsywny (RWD), wspierający urządzenia mobilne i desktopy.

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/trips/[id]/edit` |
| **Plik** | `src/pages/app/trips/[id]/edit.astro` |
| **Typ** | Strona Astro z React island |
| **Dostęp** | Wymaga uwierzytelnienia (właściciel wyprawy) |

## 3. Struktura komponentów

```
TripEditPage (src/pages/app/trips/[id]/edit.astro)
└── Layout
    └── TripEditView (React island, client:load)
        ├── LoadingState (Skeleton)
        ├── ErrorState (ErrorBanner + retry)
        └── TripForm
            ├── DateTimeSection
            │   ├── FormField (started_at)
            │   │   └── DateTimePicker
            │   └── FormField (ended_at)
            │       └── DateTimePicker
            ├── LocationSection
            │   ├── LocationPicker (Google Maps)
            │   └── FormField (location_label)
            │       └── Input
            ├── EquipmentSection
            │   ├── EquipmentMultiSelect (type="rod")
            │   ├── EquipmentMultiSelect (type="lure")
            │   └── EquipmentMultiSelect (type="groundbait")
            ├── FormActions
            │   ├── Button (Anuluj)
            │   └── Button (Zapisz)
            └── WeatherWarningDialog
```

## 4. Szczegóły komponentów

### TripEditView

- **Opis**: Główny kontener widoku edycji wyprawy. Zarządza stanem ładowania, błędów i renderuje formularz. Implementowany jako React island (`client:load`).
- **Główne elementy**: 
  - Warunkowo renderowany `LoadingState`, `ErrorState` lub `TripForm`
  - Hook `useTripEdit` do zarządzania danymi i stanem
- **Obsługiwane interakcje**: 
  - Inicjalizacja pobierania danych przy montowaniu
  - Przekazywanie callbacków do formularza
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji
- **Typy**: `TripEditViewProps`
- **Propsy**:
  ```typescript
  interface TripEditViewProps {
    tripId: string;
  }
  ```

### TripForm

- **Opis**: Formularz edycji wyprawy zbudowany na React Hook Form + Zod. Zawiera sekcje dat, lokalizacji i sprzętu.
- **Główne elementy**:
  - `<form>` z `onSubmit` handler
  - Sekcje: `DateTimeSection`, `LocationSection`, `EquipmentSection`
  - Przyciski akcji: "Anuluj", "Zapisz"
- **Obsługiwane interakcje**:
  - Submit formularza (z walidacją)
  - Reset formularza (Anuluj)
  - Wykrywanie zmiany dat (dla ostrzeżenia pogodowego)
- **Obsługiwana walidacja**:
  - `started_at`: wymagane, format ISO datetime
  - `ended_at`: opcjonalne, jeśli podane: `ended_at >= started_at`
  - `location.lat`: jeśli lokalizacja podana: -90 do 90
  - `location.lng`: jeśli lokalizacja podana: -180 do 180
  - `location.label`: max 255 znaków
- **Typy**: `TripFormData`, `TripFormProps`
- **Propsy**:
  ```typescript
  interface TripFormProps {
    initialData: TripFormData;
    availableEquipment: AvailableEquipmentData;
    onSubmit: (data: TripFormData) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
    showWeatherWarning: boolean;
    onWeatherWarningConfirm: () => void;
    onWeatherWarningCancel: () => void;
  }
  ```

### DateTimeSection

- **Opis**: Sekcja formularza do edycji dat rozpoczęcia i zakończenia wyprawy.
- **Główne elementy**:
  - Dwa pola `DateTimePicker` (rozpoczęcie, zakończenie)
  - Etykiety i komunikaty błędów (inline)
- **Obsługiwane interakcje**:
  - Zmiana daty/czasu rozpoczęcia
  - Zmiana daty/czasu zakończenia (opcjonalne)
- **Obsługiwana walidacja**:
  - `started_at`: wymagane
  - `ended_at >= started_at` (komunikat: "Data zakończenia musi być późniejsza niż data rozpoczęcia")
- **Typy**: Używa `TripFormData`
- **Propsy**:
  ```typescript
  interface DateTimeSectionProps {
    control: Control<TripFormData>;
    errors: FieldErrors<TripFormData>;
    onDateChange?: (field: 'started_at' | 'ended_at') => void;
  }
  ```

### DateTimePicker

- **Opis**: Komponent MD3-style do wyboru daty i czasu. Składa się z kalendarza (Popover) i selektora czasu.
- **Główne elementy**:
  - `Button` trigger z wyświetlaną datą/czasem
  - `Popover` z `Calendar` (Shadcn)
  - Selektory godziny i minuty
- **Obsługiwane interakcje**:
  - Kliknięcie otwiera popover z kalendarzem
  - Wybór daty
  - Wybór godziny/minuty
- **Obsługiwana walidacja**: Przekazana z parent przez React Hook Form
- **Typy**: `DateTimePickerProps`
- **Propsy**:
  ```typescript
  interface DateTimePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
  }
  ```

### LocationSection

- **Opis**: Sekcja formularza do edycji lokalizacji wyprawy. Zawiera mapę Google Maps z edytowalnym markerem oraz pole tekstowe na etykietę.
- **Główne elementy**:
  - `LocationPicker` - mapa z markerem
  - `Input` - pole na nazwę miejsca (label)
- **Obsługiwane interakcje**:
  - Przeciąganie markera na mapie
  - Kliknięcie na mapę (ustawienie nowej lokalizacji)
  - Wpisywanie nazwy miejsca
  - Przycisk "Usuń lokalizację" (ustawia null)
- **Obsługiwana walidacja**:
  - `location.label`: max 255 znaków
  - lat/lng: muszą być oba podane lub oba puste
- **Typy**: Używa `TripFormData`
- **Propsy**:
  ```typescript
  interface LocationSectionProps {
    control: Control<TripFormData>;
    errors: FieldErrors<TripFormData>;
  }
  ```

### LocationPicker

- **Opis**: Komponent mapy Google Maps z możliwością ustawienia i edycji lokalizacji przez marker.
- **Główne elementy**:
  - `GoogleMap` z `@react-google-maps/api`
  - `Marker` edytowalny (draggable)
  - Przycisk "Użyj mojej lokalizacji" (GPS)
- **Obsługiwane interakcje**:
  - Kliknięcie na mapę → ustawienie markera
  - Przeciąganie markera → zmiana pozycji
  - Przycisk GPS → geolokalizacja przeglądarki
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji (współrzędne zawsze poprawne z mapy)
- **Typy**: `LocationPickerProps`
- **Propsy**:
  ```typescript
  interface LocationPickerProps {
    value: { lat: number; lng: number } | null;
    onChange: (location: { lat: number; lng: number } | null) => void;
    disabled?: boolean;
  }
  ```

### EquipmentSection

- **Opis**: Sekcja formularza do zarządzania przypisanym sprzętem (wędki, przynęty, zanęty).
- **Główne elementy**:
  - Trzy komponenty `EquipmentMultiSelect` (po jednym dla każdego typu)
  - Etykiety sekcji
- **Obsługiwane interakcje**: Delegowane do `EquipmentMultiSelect`
- **Obsługiwana walidacja**: Brak (sprzęt opcjonalny)
- **Typy**: Używa `TripFormData`
- **Propsy**:
  ```typescript
  interface EquipmentSectionProps {
    control: Control<TripFormData>;
    availableRods: RodDto[];
    availableLures: LureDto[];
    availableGroundbaits: GroundbaitDto[];
  }
  ```

### EquipmentMultiSelect

- **Opis**: Komponent multiselect z wyszukiwaniem i wyświetlaniem wybranych elementów jako chips. Używany dla wędek, przynęt i zanęt.
- **Główne elementy**:
  - `Popover` z listą dostępnych elementów
  - `Command` (Shadcn) z wyszukiwaniem
  - Lista wybranych elementów jako `Badge` (chips)
  - Przycisk usuwania na każdym chipie
- **Obsługiwane interakcje**:
  - Otwieranie dropdown
  - Wyszukiwanie po nazwie
  - Zaznaczanie/odznaczanie elementów
  - Usuwanie wybranych przez kliknięcie X na chipie
- **Obsługiwana walidacja**: Brak (wybór opcjonalny)
- **Typy**: `EquipmentMultiSelectProps`
- **Propsy**:
  ```typescript
  interface EquipmentMultiSelectProps<T extends EquipmentItem> {
    label: string;
    placeholder: string;
    items: T[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
    getItemId: (item: T) => string;
    getItemName: (item: T) => string;
  }
  ```

### WeatherWarningDialog

- **Opis**: Dialog ostrzegawczy wyświetlany gdy użytkownik zmienił daty wyprawy. Informuje o potencjalnej utracie automatycznie pobranych danych pogodowych.
- **Główne elementy**:
  - `AlertDialog` (Shadcn)
  - Ikona ostrzeżenia
  - Tekst wyjaśniający
  - Przyciski "Anuluj" i "Kontynuuj"
- **Obsługiwane interakcje**:
  - Kliknięcie "Anuluj" → zamknięcie dialogu, powrót do formularza
  - Kliknięcie "Kontynuuj" → kontynuacja zapisu
- **Obsługiwana walidacja**: Brak
- **Typy**: `WeatherWarningDialogProps`
- **Propsy**:
  ```typescript
  interface WeatherWarningDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }
  ```

### LoadingState

- **Opis**: Komponent skeleton loading wyświetlany podczas ładowania danych wyprawy.
- **Główne elementy**:
  - `Skeleton` elementy imitujące formularz
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak props
- **Propsy**: Brak

### ErrorState

- **Opis**: Komponent wyświetlający błąd z możliwością ponowienia próby.
- **Główne elementy**:
  - Ikona błędu
  - Komunikat błędu
  - Przycisk "Spróbuj ponownie"
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku retry
- **Obsługiwana walidacja**: Brak
- **Typy**: `ErrorStateProps`
- **Propsy**:
  ```typescript
  interface ErrorStateProps {
    message: string;
    onRetry: () => void;
  }
  ```

## 5. Typy

### ViewModel Types

```typescript
// Główny typ danych formularza
interface TripFormData {
  started_at: Date;
  ended_at: Date | null;
  location: {
    lat: number;
    lng: number;
    label: string;
  } | null;
  selectedRodIds: string[];
  selectedLureIds: string[];
  selectedGroundbaitIds: string[];
}

// Typ dla dostępnego sprzętu (do multiselect)
interface AvailableEquipmentData {
  rods: RodDto[];
  lures: LureDto[];
  groundbaits: GroundbaitDto[];
}

// Typ bazowy dla elementów sprzętu w multiselect
interface EquipmentItem {
  id: string;
  name: string;
  deleted_at: string | null;
}

// Stan hooka useTripEdit
interface TripEditState {
  trip: TripGetResponseDto | null;
  availableEquipment: AvailableEquipmentData;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  originalStartedAt: Date | null;
  originalEndedAt: Date | null;
  showWeatherWarning: boolean;
}
```

### DTO Types (z `src/types.ts`)

```typescript
// Używane z API
import type {
  TripDto,
  TripGetResponseDto,
  TripEquipmentDto,
  TripLocationDto,
  UpdateTripCommand,
  PutTripRodsCommand,
  PutTripLuresCommand,
  PutTripGroundbaitsCommand,
  RodDto,
  LureDto,
  GroundbaitDto,
  TripRodDto,
  TripLureDto,
  TripGroundbaitDto,
} from '@/types';
```

### Schemat walidacji Zod

```typescript
import { z } from 'zod';

export const tripEditFormSchema = z.object({
  started_at: z.date({
    required_error: "Data rozpoczęcia jest wymagana",
  }),
  ended_at: z.date().nullable(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    label: z.string().max(255, "Nazwa miejsca może mieć max 255 znaków"),
  }).nullable(),
  selectedRodIds: z.array(z.string().uuid()),
  selectedLureIds: z.array(z.string().uuid()),
  selectedGroundbaitIds: z.array(z.string().uuid()),
}).refine(
  (data) => {
    if (data.ended_at && data.started_at) {
      return data.ended_at >= data.started_at;
    }
    return true;
  },
  {
    message: "Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia",
    path: ["ended_at"],
  }
);

export type TripEditFormSchema = z.infer<typeof tripEditFormSchema>;
```

## 6. Zarządzanie stanem

### Custom Hook: `useTripEdit`

```typescript
interface UseTripEditReturn {
  // Stan
  trip: TripGetResponseDto | null;
  availableEquipment: AvailableEquipmentData;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showWeatherWarning: boolean;
  
  // Akcje
  handleSubmit: (data: TripFormData) => Promise<void>;
  handleCancel: () => void;
  handleWeatherWarningConfirm: () => void;
  handleWeatherWarningCancel: () => void;
  refetch: () => void;
  
  // Flagi
  hasDateChanged: (newStartedAt: Date, newEndedAt: Date | null) => boolean;
}
```

**Logika hooka:**

1. **Pobieranie danych** (useEffect / TanStack Query):
   - `GET /api/v1/trips/{id}?include=rods,lures,groundbaits` - dane wyprawy
   - `GET /api/v1/rods` - dostępne wędki
   - `GET /api/v1/lures` - dostępne przynęty
   - `GET /api/v1/groundbaits` - dostępne zanęty

2. **Śledzenie zmian dat**:
   - Przechowywanie oryginalnych wartości `started_at` i `ended_at`
   - Porównywanie przy submit dla ostrzeżenia pogodowego

3. **Proces zapisu**:
   - Sprawdzenie czy daty się zmieniły → pokazanie dialogu ostrzeżenia
   - Po potwierdzeniu:
     - `PATCH /api/v1/trips/{id}` (aktualizacja podstawowych pól)
     - `PUT /api/v1/trips/{tripId}/rods` (jeśli zmiany w wędkach)
     - `PUT /api/v1/trips/{tripId}/lures` (jeśli zmiany w przynętach)
     - `PUT /api/v1/trips/{tripId}/groundbaits` (jeśli zmiany w zanętach)
   - Redirect do `/app/trips/{id}` po sukcesie

4. **Obsługa błędów**:
   - Mapowanie kodów błędów API na komunikaty PL
   - Toast dla błędów operacyjnych
   - Inline errors dla błędów walidacji

### TanStack Query Keys

```typescript
const queryKeys = {
  trip: (id: string) => ['trip', id] as const,
  tripWithEquipment: (id: string) => ['trip', id, 'equipment'] as const,
  rods: ['rods'] as const,
  lures: ['lures'] as const,
  groundbaits: ['groundbaits'] as const,
};
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Wszystkie endpointy edycji wyprawy wymagają autoryzacji poprzez **Supabase SDK**:

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

// API endpoint dodatkowo weryfikuje właściciela wyprawy
const trip = await tripService.getById(tripId, user.id);
```

**Client-side (React components):**
- Cookies z tokenami Supabase są automatycznie wysyłane z każdym żądaniem fetch
- Middleware weryfikuje sesję przed renderowaniem `/app/trips/[id]/edit`

**Weryfikacja właściciela:**
- Endpoint `GET /api/v1/trips/{id}` zwraca 404 jeśli wyprawa nie należy do zalogowanego użytkownika
- Endpointy `PUT /api/v1/trips/{tripId}/rods|lures|groundbaits` weryfikują własność wyprawy

**Konfiguracja:**
- `PUBLIC_SUPABASE_URL` - URL projektu Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Publiczny klucz anon

### Pobieranie danych wyprawy

**Endpoint**: `GET /api/v1/trips/{id}?include=rods,lures,groundbaits`

**Typ odpowiedzi**: `TripGetResponseDto`

```typescript
interface TripGetResponseDto {
  id: string;
  started_at: string; // ISODateTime
  ended_at: string | null;
  status: TripStatus;
  location: TripLocationDto | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  equipment?: TripEquipmentDto;
}
```

### Pobieranie dostępnego sprzętu

**Endpointy**:
- `GET /api/v1/rods` → `RodListResponseDto`
- `GET /api/v1/lures` → `LureListResponseDto`
- `GET /api/v1/groundbaits` → `GroundbaitListResponseDto`

### Aktualizacja wyprawy

**Endpoint**: `PATCH /api/v1/trips/{id}`

**Typ żądania**: `UpdateTripCommand`

```typescript
interface UpdateTripCommand {
  started_at?: string; // ISODateTime
  ended_at?: string | null;
  status?: TripStatus;
  location?: TripLocationDto | null;
}
```

**Typ odpowiedzi**: `TripDto`

### Aktualizacja sprzętu wyprawy

**Endpointy**:

| Endpoint | Typ żądania | Typ odpowiedzi |
|----------|-------------|----------------|
| `PUT /api/v1/trips/{tripId}/rods` | `PutTripRodsCommand` | `TripRodsPutResponseDto` |
| `PUT /api/v1/trips/{tripId}/lures` | `PutTripLuresCommand` | `TripLuresPutResponseDto` |
| `PUT /api/v1/trips/{tripId}/groundbaits` | `PutTripGroundbaitsCommand` | `TripGroundbaitsPutResponseDto` |

```typescript
interface PutTripRodsCommand {
  rod_ids: string[];
}

interface TripRodsPutResponseDto {
  data: TripRodDto[];
}
```

### Transformacja danych

```typescript
// API → Form
function apiToFormData(trip: TripGetResponseDto): TripFormData {
  return {
    started_at: new Date(trip.started_at),
    ended_at: trip.ended_at ? new Date(trip.ended_at) : null,
    location: trip.location ? {
      lat: trip.location.lat,
      lng: trip.location.lng,
      label: trip.location.label ?? '',
    } : null,
    selectedRodIds: trip.equipment?.rods.map(r => r.id) ?? [],
    selectedLureIds: trip.equipment?.lures.map(l => l.id) ?? [],
    selectedGroundbaitIds: trip.equipment?.groundbaits.map(g => g.id) ?? [],
  };
}

// Form → API
function formToApiCommand(data: TripFormData): UpdateTripCommand {
  return {
    started_at: data.started_at.toISOString(),
    ended_at: data.ended_at?.toISOString() ?? null,
    location: data.location ? {
      lat: data.location.lat,
      lng: data.location.lng,
      label: data.location.label || null,
    } : null,
  };
}
```

## 8. Interakcje użytkownika

| Interakcja | Oczekiwany wynik |
|------------|------------------|
| Załadowanie strony | Wyświetlenie skeleton → pobranie danych → wypełnienie formularza |
| Zmiana daty rozpoczęcia | Aktualizacja pola, walidacja w locie |
| Zmiana daty zakończenia | Aktualizacja pola, walidacja `ended_at >= started_at` |
| Kliknięcie na mapę | Ustawienie markera w klikniętym miejscu |
| Przeciągnięcie markera | Aktualizacja współrzędnych lokalizacji |
| Kliknięcie "Użyj GPS" | Pobranie geolokalizacji, ustawienie markera |
| Wpisanie nazwy miejsca | Aktualizacja pola `location.label` |
| Otwarcie multiselect sprzętu | Wyświetlenie dropdown z listą dostępnych elementów |
| Wyszukiwanie w multiselect | Filtrowanie listy po wpisanym tekście |
| Zaznaczenie elementu | Dodanie do wybranych, wyświetlenie jako chip |
| Kliknięcie X na chipie | Usunięcie z wybranych |
| Kliknięcie "Anuluj" | Powrót do widoku szczegółów wyprawy (`/app/trips/{id}`) |
| Kliknięcie "Zapisz" (bez zmian dat) | Walidacja → zapis → redirect do szczegółów |
| Kliknięcie "Zapisz" (ze zmianą dat) | Wyświetlenie WeatherWarningDialog |
| Potwierdzenie w WeatherWarningDialog | Zapis wszystkich zmian → redirect |
| Anulowanie w WeatherWarningDialog | Zamknięcie dialogu, powrót do formularza |

## 9. Warunki i walidacja

### Walidacja po stronie klienta (Zod)

| Pole | Warunek | Komunikat błędu | Komponent |
|------|---------|-----------------|-----------|
| `started_at` | Wymagane | "Data rozpoczęcia jest wymagana" | DateTimePicker |
| `ended_at` | `>= started_at` (jeśli podane) | "Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia" | DateTimePicker |
| `location.lat` | -90 do 90 (jeśli lokalizacja) | "Nieprawidłowa szerokość geograficzna" | LocationPicker |
| `location.lng` | -180 do 180 (jeśli lokalizacja) | "Nieprawidłowa długość geograficzna" | LocationPicker |
| `location.label` | Max 255 znaków | "Nazwa miejsca może mieć max 255 znaków" | Input |

### Walidacja po stronie API (mapowanie błędów)

| Kod błędu API | HTTP Status | Komunikat PL | Akcja UI |
|---------------|-------------|--------------|----------|
| `validation_error` | 400 | Szczegóły z `details.field` | Inline error przy polu |
| `unauthorized` | 401 | "Sesja wygasła. Zaloguj się ponownie." | Redirect do `/auth/login` |
| `not_found` | 404 | "Wyprawa nie została znaleziona" | Redirect do dashboard z toast |
| `equipment_owner_mismatch` | 409 | "Wybrany sprzęt nie należy do Ciebie" | Toast error |
| `equipment_soft_deleted` | 409 | "Wybrany sprzęt został usunięty" | Toast error |
| `conflict` | 409 | "Wystąpił konflikt danych" | Toast error |
| `internal_error` | 500 | "Wystąpił błąd serwera. Spróbuj ponownie." | Toast error + retry |

### Warunki specjalne

1. **Ostrzeżenie pogodowe**: Wyświetlane gdy `started_at` lub `ended_at` różni się od oryginalnych wartości
2. **Lokalizacja lat/lng**: Muszą być oba podane lub oba null (walidowane przez API)
3. **Status "closed"**: Wymaga `ended_at` (walidowane przez API, nie edytowalne w tym widoku)

## 10. Obsługa błędów

### Błędy ładowania danych

| Scenariusz | Zachowanie |
|------------|------------|
| Trip 404 | Redirect do `/app` z toast "Wyprawa nie została znaleziona" |
| Trip 401 | Redirect do `/auth/login` |
| Network error | ErrorState z przyciskiem "Spróbuj ponownie" |
| Equipment fetch error | Kontynuacja z pustą listą, toast z ostrzeżeniem |

### Błędy zapisu

| Scenariusz | Zachowanie |
|------------|------------|
| Validation error (400) | Inline errors na odpowiednich polach |
| Unauthorized (401) | Redirect do `/auth/login` |
| Not found (404) | Redirect do `/app` z toast |
| Conflict (409) | Toast z komunikatem, brak redirect |
| Server error (500) | Toast "Wystąpił błąd. Spróbuj ponownie.", przycisk retry |
| Network error | Toast "Brak połączenia. Sprawdź internet.", retry |

### Obsługa częściowego zapisu

W przypadku gdy PATCH się powiedzie ale PUT dla sprzętu nie:
- Rollback nie jest możliwy (brak transakcji)
- Toast z informacją "Zapisano podstawowe dane, ale wystąpił problem ze sprzętem"
- Formularz pozostaje otwarty z możliwością ponownej próby zapisu sprzętu

## 11. Kroki implementacji

### Etap 1: Przygotowanie struktury

1. Utworzenie pliku strony Astro: `src/pages/app/trips/[id]/edit.astro`
2. Utworzenie struktury katalogów dla komponentów:
   ```
   src/components/trips/edit/
   ├── TripEditView.tsx
   ├── TripForm.tsx
   ├── DateTimeSection.tsx
   ├── DateTimePicker.tsx
   ├── LocationSection.tsx
   ├── LocationPicker.tsx
   ├── EquipmentSection.tsx
   ├── EquipmentMultiSelect.tsx
   ├── WeatherWarningDialog.tsx
   ├── LoadingState.tsx
   └── ErrorState.tsx
   ```
3. Utworzenie schematu walidacji: `src/lib/schemas/trip-edit.schema.ts`

### Etap 2: Implementacja hooka useTripEdit

1. Utworzenie pliku: `src/lib/hooks/useTripEdit.ts`
2. Implementacja pobierania danych (TanStack Query):
   - Query dla trip
   - Parallel queries dla equipment (rods, lures, groundbaits)
3. Implementacja logiki zapisu:
   - Mutation dla PATCH trip
   - Mutations dla PUT equipment
4. Implementacja śledzenia zmian dat
5. Implementacja obsługi błędów i toastów

### Etap 3: Implementacja komponentów bazowych

1. **DateTimePicker**:
   - Wykorzystanie Shadcn Calendar
   - Dodanie selektorów czasu (godzina, minuta)
   - Styling MD3
   
2. **LocationPicker**:
   - Integracja `@react-google-maps/api`
   - Implementacja draggable marker
   - Implementacja geolokalizacji (GPS)
   
3. **EquipmentMultiSelect**:
   - Wykorzystanie Shadcn Command + Popover
   - Implementacja wyszukiwania
   - Renderowanie chips dla wybranych

### Etap 4: Implementacja formularza

1. **TripForm**:
   - Integracja React Hook Form
   - Podpięcie walidacji Zod
   - Kompozycja sekcji
   
2. **DateTimeSection**:
   - Dwa DateTimePicker
   - Walidacja cross-field (ended >= started)
   
3. **LocationSection**:
   - LocationPicker + Input dla label
   - Opcja usunięcia lokalizacji
   
4. **EquipmentSection**:
   - Trzy EquipmentMultiSelect
   - Etykiety polskie

### Etap 5: Implementacja TripEditView

1. Połączenie hooka z komponentami
2. Warunkowe renderowanie (loading/error/form)
3. Obsługa WeatherWarningDialog
4. Implementacja nawigacji (cancel, success redirect)

### Etap 6: Implementacja strony Astro

1. Layout z nawigacją
2. Middleware auth check
3. Przekazanie tripId do React island

### Etap 7: Stylowanie i responsywność

1. Mobile-first styling z Tailwind
2. Dostosowanie dla desktop (max-width, grid layout)
3. Sprawdzenie touch targets (min 48dp)
4. Testy na różnych rozdzielczościach (360px, 1920px)

### Etap 8: Testy i poprawki

1. Testy manualne wszystkich interakcji
2. Testy walidacji (inline errors)
3. Testy obsługi błędów API
4. Testy z mockami API (błędy sieciowe)
5. Testy a11y (aria-labels, keyboard navigation)
6. Poprawki na podstawie testów

