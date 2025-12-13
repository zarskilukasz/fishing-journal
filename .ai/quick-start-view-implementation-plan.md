# Plan implementacji widoku Quick Start

## 1. Przegląd

Widok Quick Start to modalne okno dialogowe (Bottom Sheet na urządzeniach mobilnych, Dialog na desktopie) umożliwiające użytkownikowi szybkie rozpoczęcie nowej wyprawy wędkarskiej jednym kliknięciem. Modal jest wywoływany z poziomu Dashboard (`/app`) poprzez kliknięcie przycisku FAB "Nowa wyprawa".

Główne funkcjonalności:
- Rozpoczęcie wyprawy z automatycznym ustawieniem daty/czasu na "teraz"
- Opcjonalne wykorzystanie lokalizacji GPS urządzenia
- Opcjonalne skopiowanie sprzętu z ostatniej wyprawy
- Automatyczne przekierowanie do szczegółów nowo utworzonej wyprawy po sukcesie

## 2. Routing widoku

Widok nie posiada dedykowanej ścieżki routingowej. Jest to komponent modalny wyświetlany w kontekście strony Dashboard:

- **Ścieżka rodzica**: `/app` (Dashboard)
- **Wyświetlanie**: Modal/Bottom Sheet otwierany poprzez FAB
- **Zamknięcie**: Powrót do Dashboard lub przekierowanie do `/app/trips/[id]` po sukcesie

## 3. Struktura komponentów

```
Dashboard (/app)
└── QuickStartTrigger (FAB Button)
    └── QuickStartSheet (Modal/Dialog)
        ├── QuickStartHeader
        │   └── Title + Close Button
        ├── QuickStartContent
        │   ├── GPSCheckbox
        │   │   ├── Checkbox (Shadcn)
        │   │   └── Label
        │   └── CopyEquipmentCheckbox
        │       ├── Checkbox (Shadcn)
        │       └── Label
        └── QuickStartFooter
            └── StartButton (Primary Action)
```

## 4. Szczegóły komponentów

### 4.1 QuickStartTrigger

- **Opis komponentu**: Przycisk FAB (Floating Action Button) umieszczony w prawym dolnym rogu Dashboard, inicjujący otwarcie modalu Quick Start.
- **Główne elementy**: 
  - Shadcn `Button` z wariantem filled/primary
  - Ikona `Plus` z Lucide React
  - Tekst "Nowa wyprawa" (Extended FAB na desktop, ikona na mobile)
- **Obsługiwane interakcje**: 
  - `onClick` → otwiera modal QuickStartSheet
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**: 
  ```typescript
  interface QuickStartTriggerProps {
    onClick: () => void;
  }
  ```

### 4.2 QuickStartSheet

- **Opis komponentu**: Główny kontener modalny. Na urządzeniach mobilnych wyświetlany jako Bottom Sheet (Shadcn Sheet), na desktopie jako standardowy Dialog (Shadcn Dialog). Zawiera formularz z opcjami szybkiego startu.
- **Główne elementy**:
  - Shadcn `Sheet` (mobile) / `Dialog` (desktop)
  - `SheetHeader`/`DialogHeader` z tytułem
  - `SheetContent`/`DialogContent` z formularzem
  - `SheetFooter`/`DialogFooter` z przyciskiem akcji
- **Obsługiwane interakcje**:
  - `onOpenChange` → kontrola widoczności modalu
  - `onSubmit` → wywołanie API quick-start
  - Kliknięcie poza modal lub przycisk zamknięcia → zamknięcie modalu
- **Obsługiwana walidacja**: Brak walidacji formularza (checkboxy zawsze mają poprawne wartości boolean)
- **Typy**: 
  - `QuickStartFormState`
  - `QuickStartTripCommand`
  - `QuickStartTripResponseDto`
- **Propsy**:
  ```typescript
  interface QuickStartSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (response: QuickStartTripResponseDto) => void;
  }
  ```

### 4.3 GPSCheckbox

- **Opis komponentu**: Pole wyboru kontrolujące, czy przy tworzeniu wyprawy ma być wykorzystana lokalizacja GPS urządzenia. Domyślnie zaznaczone.
- **Główne elementy**:
  - Shadcn `Checkbox`
  - `Label` z tekstem "Użyj mojej lokalizacji GPS"
  - Opcjonalnie: ikona `MapPin` z Lucide React
- **Obsługiwane interakcje**:
  - `onCheckedChange` → aktualizacja stanu formularza
- **Obsługiwana walidacja**: Brak (pole opcjonalne)
- **Typy**: `boolean`
- **Propsy**:
  ```typescript
  interface GPSCheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }
  ```

### 4.4 CopyEquipmentCheckbox

- **Opis komponentu**: Pole wyboru kontrolujące, czy sprzęt (wędki, przynęty, zanęty) ma być skopiowany z ostatniej wyprawy użytkownika. Domyślnie zaznaczone.
- **Główne elementy**:
  - Shadcn `Checkbox`
  - `Label` z tekstem "Kopiuj sprzęt z ostatniej wyprawy"
  - Opcjonalnie: ikona `Copy` lub `Package` z Lucide React
- **Obsługiwane interakcje**:
  - `onCheckedChange` → aktualizacja stanu formularza
- **Obsługiwana walidacja**: Brak (pole opcjonalne)
- **Typy**: `boolean`
- **Propsy**:
  ```typescript
  interface CopyEquipmentCheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }
  ```

### 4.5 StartButton

- **Opis komponentu**: Główny przycisk akcji inicjujący utworzenie nowej wyprawy. Wyświetla stan ładowania podczas komunikacji z API.
- **Główne elementy**:
  - Shadcn `Button` z wariantem filled/primary
  - Tekst "Rozpocznij wyprawę"
  - Spinner/Loader podczas stanu ładowania
- **Obsługiwane interakcje**:
  - `onClick` → wywołanie funkcji submit formularza
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**:
  ```typescript
  interface StartButtonProps {
    onClick: () => void;
    isLoading: boolean;
    disabled?: boolean;
  }
  ```

## 5. Typy

### 5.1 Typy z `src/types.ts` (istniejące)

```typescript
// Command wysyłany do API
interface QuickStartTripCommand {
  use_gps: boolean;
  copy_equipment_from_last_trip: boolean;
}

// Odpowiedź z API
interface QuickStartTripResponseDto {
  trip: TripDto;
  copied_equipment: {
    rod_ids: UUID[];
    lure_ids: UUID[];
    groundbait_ids: UUID[];
  };
}

// DTO wyprawy (używane w odpowiedzi)
type TripDto = Omit<TripRow, "user_id" | "location_lat" | "location_lng" | "location_label"> & {
  location: TripLocationDto | null;
};

// Lokalizacja
interface TripLocationDto {
  lat: number;
  lng: number;
  label?: string | null;
}
```

### 5.2 Nowe typy ViewModel (do utworzenia)

```typescript
// Plik: src/components/quick-start/types.ts

/**
 * Stan formularza Quick Start
 */
interface QuickStartFormState {
  /** Czy użyć lokalizacji GPS */
  useGps: boolean;
  /** Czy skopiować sprzęt z ostatniej wyprawy */
  copyEquipment: boolean;
}

/**
 * Stan hooka useQuickStart
 */
interface UseQuickStartState {
  /** Stan formularza */
  formState: QuickStartFormState;
  /** Czy trwa wysyłanie żądania */
  isLoading: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;
  /** Status uprawnień GPS */
  gpsPermissionStatus: PermissionState | null;
}

/**
 * Akcje hooka useQuickStart
 */
interface UseQuickStartActions {
  /** Aktualizacja pola formularza */
  setField: <K extends keyof QuickStartFormState>(
    field: K, 
    value: QuickStartFormState[K]
  ) => void;
  /** Wysłanie formularza */
  submit: () => Promise<QuickStartTripResponseDto | null>;
  /** Reset błędu */
  clearError: () => void;
}

/**
 * Zwracany typ hooka useQuickStart
 */
type UseQuickStartReturn = UseQuickStartState & UseQuickStartActions;

/**
 * Propsy komponentu QuickStartSheet
 */
interface QuickStartSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (response: QuickStartTripResponseDto) => void;
}

/**
 * Typ stanu uprawnień (Web Permissions API)
 */
type PermissionState = "granted" | "denied" | "prompt";
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useQuickStart`

Hook `useQuickStart` zarządza całą logiką widoku Quick Start, w tym:
- Stanem formularza (checkboxy)
- Komunikacją z API
- Obsługą uprawnień GPS
- Obsługą błędów

**Plik**: `src/components/quick-start/useQuickStart.ts`

```typescript
import { useState, useCallback } from "react";
import type { QuickStartTripCommand, QuickStartTripResponseDto } from "@/types";

interface QuickStartFormState {
  useGps: boolean;
  copyEquipment: boolean;
}

export function useQuickStart() {
  // Stan formularza z domyślnymi wartościami
  const [formState, setFormState] = useState<QuickStartFormState>({
    useGps: true,
    copyEquipment: true,
  });
  
  // Stan ładowania
  const [isLoading, setIsLoading] = useState(false);
  
  // Stan błędu
  const [error, setError] = useState<string | null>(null);
  
  // Status uprawnień GPS
  const [gpsPermissionStatus, setGpsPermissionStatus] = 
    useState<PermissionState | null>(null);

  // Aktualizacja pojedynczego pola formularza
  const setField = useCallback(<K extends keyof QuickStartFormState>(
    field: K,
    value: QuickStartFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Sprawdzenie uprawnień GPS
  const checkGpsPermission = useCallback(async () => {
    if (!navigator.permissions) return null;
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setGpsPermissionStatus(result.state);
      return result.state;
    } catch {
      return null;
    }
  }, []);

  // Wysłanie formularza do API
  const submit = useCallback(async (): Promise<QuickStartTripResponseDto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const command: QuickStartTripCommand = {
        use_gps: formState.useGps,
        copy_equipment_from_last_trip: formState.copyEquipment,
      };

      const response = await fetch("/api/v1/trips/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Wystąpił błąd");
      }

      const data: QuickStartTripResponseDto = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formState]);

  // Reset błędu
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    formState,
    isLoading,
    error,
    gpsPermissionStatus,
    setField,
    submit,
    clearError,
    checkGpsPermission,
  };
}
```

### 6.2 Stan w komponencie Dashboard

Dashboard zarządza stanem otwarcia modalu:

```typescript
const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Widok Quick Start używa **Supabase SDK** do autoryzacji:

**Jak działa autoryzacja:**
1. **Middleware Astro** (`src/middleware/index.ts`) automatycznie weryfikuje sesję dla ścieżek `/app/*`
2. **Cookies z tokenami** Supabase są automatycznie wysyłane z każdym żądaniem fetch
3. **Endpoint API** (`/api/v1/trips/quick-start`) odczytuje sesję z `Astro.locals.supabase`

**Server-side (API endpoint):**
```typescript
// W POST /api/v1/trips/quick-start
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ 
    error: { code: 'unauthorized', message: 'Unauthorized' }
  }), { status: 401 });
}

// user.id używany do tworzenia wyprawy
```

**Client-side:**
```typescript
// Żądanie fetch automatycznie zawiera cookies z tokenami Supabase
const response = await fetch("/api/v1/trips/quick-start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(command),
  // credentials: "include" - domyślnie dla same-origin
});
```

**Konfiguracja zmiennych środowiskowych:**
- `PUBLIC_SUPABASE_URL` - URL projektu Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Publiczny klucz anon

### 7.1 Endpoint

**URL**: `POST /api/v1/trips/quick-start`

**Nagłówki**:
- `Content-Type: application/json`
- Cookies z tokenami Supabase (automatycznie przez przeglądarkę)

### 7.2 Typ żądania

```typescript
interface QuickStartTripCommand {
  use_gps: boolean;
  copy_equipment_from_last_trip: boolean;
}
```

**Przykład żądania**:
```json
{
  "use_gps": true,
  "copy_equipment_from_last_trip": true
}
```

### 7.3 Typ odpowiedzi

**Sukces (201 Created)**:
```typescript
interface QuickStartTripResponseDto {
  trip: TripDto;
  copied_equipment: {
    rod_ids: UUID[];
    lure_ids: UUID[];
    groundbait_ids: UUID[];
  };
}
```

**Przykład odpowiedzi**:
```json
{
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "started_at": "2025-12-13T10:00:00Z",
    "ended_at": null,
    "status": "active",
    "location": null,
    "deleted_at": null,
    "created_at": "2025-12-13T10:00:00Z",
    "updated_at": "2025-12-13T10:00:00Z"
  },
  "copied_equipment": {
    "rod_ids": ["uuid1", "uuid2"],
    "lure_ids": ["uuid3"],
    "groundbait_ids": ["uuid4", "uuid5"]
  }
}
```

**Błąd (4xx/5xx)**:
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

### 7.4 Integracja z TanStack Query (opcjonalnie)

Jeśli projekt używa TanStack Query, można użyć mutacji:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useQuickStartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: QuickStartTripCommand) => {
      const response = await fetch("/api/v1/trips/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Wystąpił błąd");
      }
      return response.json() as Promise<QuickStartTripResponseDto>;
    },
    onSuccess: () => {
      // Invalidate trips list cache
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
```

## 8. Interakcje użytkownika

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| Kliknięcie FAB "Nowa wyprawa" | Otwarcie modalu QuickStartSheet |
| Zmiana stanu checkboxa GPS | Aktualizacja stanu `useGps` |
| Zmiana stanu checkboxa kopiowania sprzętu | Aktualizacja stanu `copyEquipment` |
| Kliknięcie "Rozpocznij wyprawę" | Wywołanie API, wyświetlenie loadera |
| Sukces API | Zamknięcie modalu, wyświetlenie snackbara, przekierowanie do `/app/trips/[id]` |
| Błąd API | Wyświetlenie komunikatu błędu w modalu |
| Kliknięcie poza modal | Zamknięcie modalu (bez akcji) |
| Kliknięcie przycisku zamknięcia (X) | Zamknięcie modalu (bez akcji) |
| Naciśnięcie Escape | Zamknięcie modalu (bez akcji) |

## 9. Warunki i walidacja

### 9.1 Walidacja po stronie klienta

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| Oba pola są boolean | GPSCheckbox, CopyEquipmentCheckbox | Zawsze spełnione (checkbox zwraca boolean) |
| Brak dodatkowej walidacji | QuickStartSheet | Przycisk "Rozpocznij wyprawę" zawsze aktywny |

### 9.2 Walidacja po stronie serwera (API)

| Warunek | Kod błędu | Komunikat |
|---------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | "Authentication required" |
| Nieprawidłowy token | 401 | "Invalid or expired token" |
| Błąd wewnętrzny serwera | 500 | "Internal server error" |

### 9.3 Uprawnienia GPS

| Stan uprawnień | Zachowanie UI |
|----------------|---------------|
| `granted` | Checkbox GPS zaznaczony, normalne działanie |
| `prompt` | Checkbox GPS zaznaczony, przy submit przeglądarka poprosi o uprawnienia |
| `denied` | Checkbox GPS odznaczony i wyłączony, tooltip z informacją |

## 10. Integracja GPS (Geolocation API)

### 10.1 Architektura integracji GPS

Integracja GPS opiera się na **Web Geolocation API** z mechanizmem fallback dla sytuacji, gdy lokalizacja jest niedostępna lub użytkownik odmówi dostępu.

```
┌─────────────────────────────────────────────────────────────┐
│                    QuickStartSheet                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  useQuickStart                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │              useGeolocation                  │    │   │
│  │  │  ┌─────────────────────────────────────┐    │    │   │
│  │  │  │    navigator.geolocation.           │    │    │   │
│  │  │  │    getCurrentPosition()             │    │    │   │
│  │  │  └─────────────────────────────────────┘    │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Custom Hook: `useGeolocation`

**Plik**: `src/hooks/useGeolocation.ts`

Hook odpowiedzialny za:
- Sprawdzanie dostępności Geolocation API
- Sprawdzanie statusu uprawnień (Permissions API)
- Pobieranie aktualnej lokalizacji
- Obsługę błędów i timeoutów
- Cachowanie ostatniej znanej lokalizacji

```typescript
import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Współrzędne geograficzne
 */
export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Status uprawnień geolokalizacji
 */
export type GeolocationPermissionStatus = "granted" | "denied" | "prompt" | "unavailable";

/**
 * Kody błędów geolokalizacji
 */
export type GeolocationErrorCode = 
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE" 
  | "TIMEOUT"
  | "NOT_SUPPORTED"
  | "UNKNOWN";

/**
 * Błąd geolokalizacji
 */
export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * Opcje hooka useGeolocation
 */
export interface UseGeolocationOptions {
  /** Żądaj wysokiej dokładności (GPS). Domyślnie true. */
  enableHighAccuracy?: boolean;
  /** Timeout w milisekundach. Domyślnie 10000 (10s). */
  timeout?: number;
  /** Maksymalny wiek cachowanej pozycji w ms. Domyślnie 60000 (1min). */
  maximumAge?: number;
  /** Automatyczne sprawdzanie uprawnień przy montowaniu. Domyślnie true. */
  checkPermissionOnMount?: boolean;
}

/**
 * Stan hooka useGeolocation
 */
export interface UseGeolocationState {
  /** Aktualne współrzędne (lub null jeśli niedostępne) */
  coordinates: GeolocationCoordinates | null;
  /** Czy trwa pobieranie lokalizacji */
  isLoading: boolean;
  /** Błąd (jeśli wystąpił) */
  error: GeolocationError | null;
  /** Status uprawnień */
  permissionStatus: GeolocationPermissionStatus;
  /** Czy Geolocation API jest wspierane */
  isSupported: boolean;
}

/**
 * Akcje hooka useGeolocation
 */
export interface UseGeolocationActions {
  /** Pobierz aktualną lokalizację */
  getCurrentPosition: () => Promise<GeolocationCoordinates | null>;
  /** Sprawdź status uprawnień */
  checkPermission: () => Promise<GeolocationPermissionStatus>;
  /** Wyczyść błąd */
  clearError: () => void;
  /** Wyczyść cachowane współrzędne */
  clearCoordinates: () => void;
}

export type UseGeolocationReturn = UseGeolocationState & UseGeolocationActions;

const DEFAULT_OPTIONS: Required<UseGeolocationOptions> = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
  checkPermissionOnMount: true,
};

/**
 * Mapowanie kodów błędów GeolocationPositionError na nasze kody
 */
function mapGeolocationError(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: "PERMISSION_DENIED",
        message: "Dostęp do lokalizacji został zablokowany. Włącz uprawnienia w ustawieniach przeglądarki.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: "POSITION_UNAVAILABLE",
        message: "Lokalizacja jest obecnie niedostępna. Sprawdź czy GPS jest włączony.",
      };
    case error.TIMEOUT:
      return {
        code: "TIMEOUT",
        message: "Upłynął limit czasu pobierania lokalizacji. Spróbuj ponownie.",
      };
    default:
      return {
        code: "UNKNOWN",
        message: "Wystąpił nieznany błąd podczas pobierania lokalizacji.",
      };
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<GeolocationPermissionStatus>("prompt");
  
  // Sprawdź czy Geolocation API jest dostępne
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;
  
  // Ref do śledzenia czy komponent jest zamontowany
  const isMountedRef = useRef(true);

  /**
   * Sprawdź status uprawnień używając Permissions API
   */
  const checkPermission = useCallback(async (): Promise<GeolocationPermissionStatus> => {
    if (!isSupported) {
      setPermissionStatus("unavailable");
      return "unavailable";
    }

    // Permissions API może nie być dostępne we wszystkich przeglądarkach
    if (!navigator.permissions) {
      // Fallback: zakładamy "prompt" jeśli Permissions API niedostępne
      setPermissionStatus("prompt");
      return "prompt";
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      const status = result.state as GeolocationPermissionStatus;
      
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }

      // Nasłuchuj na zmiany uprawnień
      result.addEventListener("change", () => {
        if (isMountedRef.current) {
          setPermissionStatus(result.state as GeolocationPermissionStatus);
        }
      });

      return status;
    } catch {
      // Fallback dla przeglądarek które nie wspierają query dla geolocation
      if (isMountedRef.current) {
        setPermissionStatus("prompt");
      }
      return "prompt";
    }
  }, [isSupported]);

  /**
   * Pobierz aktualną pozycję
   */
  const getCurrentPosition = useCallback(async (): Promise<GeolocationCoordinates | null> => {
    if (!isSupported) {
      setError({
        code: "NOT_SUPPORTED",
        message: "Twoja przeglądarka nie wspiera geolokalizacji.",
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          const coords: GeolocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          if (isMountedRef.current) {
            setCoordinates(coords);
            setIsLoading(false);
            setPermissionStatus("granted");
          }
          resolve(coords);
        },
        // Error callback
        (positionError) => {
          const geoError = mapGeolocationError(positionError);
          
          if (isMountedRef.current) {
            setError(geoError);
            setIsLoading(false);
            
            if (positionError.code === positionError.PERMISSION_DENIED) {
              setPermissionStatus("denied");
            }
          }
          resolve(null);
        },
        // Options
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
    });
  }, [isSupported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  /**
   * Wyczyść błąd
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Wyczyść współrzędne
   */
  const clearCoordinates = useCallback(() => {
    setCoordinates(null);
  }, []);

  // Sprawdź uprawnienia przy montowaniu
  useEffect(() => {
    isMountedRef.current = true;
    
    if (opts.checkPermissionOnMount && isSupported) {
      checkPermission();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [opts.checkPermissionOnMount, isSupported, checkPermission]);

  return {
    coordinates,
    isLoading,
    error,
    permissionStatus,
    isSupported,
    getCurrentPosition,
    checkPermission,
    clearError,
    clearCoordinates,
  };
}
```

### 10.3 Zaktualizowany typ żądania API

Zmiana w `QuickStartTripCommand` - zamiast wysyłać tylko `use_gps: boolean`, wysyłamy opcjonalne współrzędne:

```typescript
// src/types.ts - zaktualizowany typ

/**
 * Command do szybkiego startu wyprawy
 */
interface QuickStartTripCommand {
  /** Opcjonalna lokalizacja GPS (jeśli użytkownik wyraził zgodę i lokalizacja dostępna) */
  location?: {
    lat: number;
    lng: number;
  };
  /** Czy skopiować sprzęt z ostatniej wyprawy */
  copy_equipment_from_last_trip: boolean;
}
```

### 10.4 Zaktualizowany hook `useQuickStart`

**Plik**: `src/components/quick-start/useQuickStart.ts`

```typescript
import { useState, useCallback, useEffect } from "react";
import { useGeolocation, type GeolocationCoordinates } from "@/hooks/useGeolocation";
import type { QuickStartTripCommand, QuickStartTripResponseDto } from "@/types";

interface QuickStartFormState {
  /** Czy użytkownik chce użyć GPS */
  useGps: boolean;
  /** Czy skopiować sprzęt z ostatniej wyprawy */
  copyEquipment: boolean;
}

interface UseQuickStartState {
  formState: QuickStartFormState;
  isLoading: boolean;
  isGettingLocation: boolean;
  error: string | null;
  gpsError: string | null;
  coordinates: GeolocationCoordinates | null;
  gpsPermissionStatus: "granted" | "denied" | "prompt" | "unavailable";
  isGpsSupported: boolean;
}

interface UseQuickStartActions {
  setField: <K extends keyof QuickStartFormState>(field: K, value: QuickStartFormState[K]) => void;
  submit: () => Promise<QuickStartTripResponseDto | null>;
  clearError: () => void;
  requestGpsPermission: () => Promise<boolean>;
}

export type UseQuickStartReturn = UseQuickStartState & UseQuickStartActions;

export function useQuickStart(): UseQuickStartReturn {
  // Geolocation hook
  const {
    coordinates,
    isLoading: isGettingLocation,
    error: geoError,
    permissionStatus: gpsPermissionStatus,
    isSupported: isGpsSupported,
    getCurrentPosition,
    clearError: clearGeoError,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000, // 15 sekund timeout dla GPS
    maximumAge: 60000, // Cache pozycji na 1 minutę
  });

  // Stan formularza
  const [formState, setFormState] = useState<QuickStartFormState>({
    // Domyślnie zaznaczony tylko jeśli GPS jest wspierany
    useGps: isGpsSupported && gpsPermissionStatus !== "denied",
    copyEquipment: true,
  });

  // Stan ładowania (wysyłanie do API)
  const [isLoading, setIsLoading] = useState(false);

  // Błąd API
  const [error, setError] = useState<string | null>(null);

  // Aktualizuj checkbox GPS gdy zmienia się status uprawnień
  useEffect(() => {
    if (gpsPermissionStatus === "denied" || !isGpsSupported) {
      setFormState((prev) => ({ ...prev, useGps: false }));
    }
  }, [gpsPermissionStatus, isGpsSupported]);

  // Aktualizacja pola formularza
  const setField = useCallback(
    <K extends keyof QuickStartFormState>(field: K, value: QuickStartFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Poproś o uprawnienia GPS (wywołuje getCurrentPosition co triggeruje prompt)
  const requestGpsPermission = useCallback(async (): Promise<boolean> => {
    const coords = await getCurrentPosition();
    return coords !== null;
  }, [getCurrentPosition]);

  // Wysłanie formularza
  const submit = useCallback(async (): Promise<QuickStartTripResponseDto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      let locationData: { lat: number; lng: number } | undefined;

      // Jeśli użytkownik chce użyć GPS
      if (formState.useGps) {
        // Sprawdź czy mamy już współrzędne w cache
        if (coordinates) {
          locationData = {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          };
        } else {
          // Spróbuj pobrać lokalizację
          const position = await getCurrentPosition();
          if (position) {
            locationData = {
              lat: position.latitude,
              lng: position.longitude,
            };
          }
          // Jeśli nie udało się pobrać lokalizacji, kontynuuj bez niej
          // (soft fail - użytkownik może edytować lokalizację później)
        }
      }

      const command: QuickStartTripCommand = {
        location: locationData,
        copy_equipment_from_last_trip: formState.copyEquipment,
      };

      const response = await fetch("/api/v1/trips/quick-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Wystąpił błąd podczas tworzenia wyprawy");
      }

      const data: QuickStartTripResponseDto = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formState, coordinates, getCurrentPosition]);

  // Reset błędów
  const clearError = useCallback(() => {
    setError(null);
    clearGeoError();
  }, [clearGeoError]);

  return {
    formState,
    isLoading,
    isGettingLocation,
    error,
    gpsError: geoError?.message ?? null,
    coordinates,
    gpsPermissionStatus,
    isGpsSupported,
    setField,
    submit,
    clearError,
    requestGpsPermission,
  };
}
```

### 10.5 Zaktualizowany komponent GPSCheckbox

**Plik**: `src/components/quick-start/GPSCheckbox.tsx`

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin, MapPinOff, Loader2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GPSCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  permissionStatus: "granted" | "denied" | "prompt" | "unavailable";
  isLoading?: boolean;
  error?: string | null;
  isSupported: boolean;
}

export function GPSCheckbox({
  checked,
  onCheckedChange,
  disabled,
  permissionStatus,
  isLoading,
  error,
  isSupported,
}: GPSCheckboxProps) {
  // Wyłącz checkbox jeśli GPS niedostępny lub odmówiono uprawnień
  const isDisabled = disabled || !isSupported || permissionStatus === "denied";

  // Tekst statusu
  const getStatusText = () => {
    if (!isSupported) return "GPS niedostępny w tej przeglądarce";
    if (permissionStatus === "denied") return "Dostęp do lokalizacji został zablokowany";
    if (error) return error;
    if (isLoading) return "Pobieranie lokalizacji...";
    if (permissionStatus === "granted" && checked) return "Lokalizacja zostanie pobrana";
    if (permissionStatus === "prompt") return "Przeglądarka zapyta o uprawnienia";
    return null;
  };

  const statusText = getStatusText();

  // Ikona statusu
  const StatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (!isSupported || permissionStatus === "denied" || error) {
      return <MapPinOff className="h-4 w-4 text-destructive" />;
    }
    return <MapPin className="h-4 w-4 text-primary" />;
  };

  const checkboxContent = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center space-x-3">
        <Checkbox
          id="use-gps"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={isDisabled}
        />
        <Label
          htmlFor="use-gps"
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            isDisabled && "cursor-not-allowed opacity-50"
          )}
        >
          <StatusIcon />
          Użyj mojej lokalizacji GPS
        </Label>
      </div>
      
      {/* Status/Error message */}
      {statusText && (
        <p
          className={cn(
            "text-xs ml-7 flex items-center gap-1",
            error || permissionStatus === "denied" || !isSupported
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {(error || permissionStatus === "denied" || !isSupported) && (
            <AlertCircle className="h-3 w-3" />
          )}
          {statusText}
        </p>
      )}
    </div>
  );

  // Wrap w tooltip tylko gdy disabled z powodu denied/unsupported
  if (permissionStatus === "denied") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{checkboxContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Aby używać lokalizacji, włącz uprawnienia w ustawieniach przeglądarki.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return checkboxContent;
}
```

### 10.6 Zaktualizowany QuickStartSheet

**Plik**: `src/components/quick-start/QuickStartSheet.tsx`

```tsx
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";
import { useQuickStart } from "./useQuickStart";
import { GPSCheckbox } from "./GPSCheckbox";
import { CopyEquipmentCheckbox } from "./CopyEquipmentCheckbox";
import { StartButton } from "./StartButton";
import type { QuickStartTripResponseDto } from "@/types";

interface QuickStartSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (response: QuickStartTripResponseDto) => void;
}

export function QuickStartSheet({ isOpen, onOpenChange, onSuccess }: QuickStartSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const {
    formState,
    isLoading,
    isGettingLocation,
    error,
    gpsError,
    coordinates,
    gpsPermissionStatus,
    isGpsSupported,
    setField,
    submit,
    clearError,
  } = useQuickStart();

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      onSuccess(result);
      onOpenChange(false);
    }
  };

  // Pokaż aktualną lokalizację jeśli dostępna
  const LocationPreview = () => {
    if (!coordinates || !formState.useGps) return null;
    
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
        <MapPin className="h-3 w-3" />
        <span>
          Lokalizacja: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </span>
        <span className="text-muted-foreground/60">
          (±{Math.round(coordinates.accuracy)}m)
        </span>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col gap-4">
      <div className="space-y-4 py-4">
        <GPSCheckbox
          checked={formState.useGps}
          onCheckedChange={(checked) => setField("useGps", checked)}
          permissionStatus={gpsPermissionStatus}
          isLoading={isGettingLocation}
          error={gpsError}
          isSupported={isGpsSupported}
        />
        
        <LocationPreview />

        <CopyEquipmentCheckbox
          checked={formState.copyEquipment}
          onCheckedChange={(checked) => setField("copyEquipment", checked)}
        />

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <StartButton
        onClick={handleSubmit}
        isLoading={isLoading || isGettingLocation}
        disabled={isLoading || isGettingLocation}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>Nowa wyprawa</SheetTitle>
            <SheetDescription>
              Rozpocznij nową wyprawę wędkarską jednym kliknięciem
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowa wyprawa</DialogTitle>
          <DialogDescription>
            Rozpocznij nową wyprawę wędkarską jednym kliknięciem
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

### 10.7 Scenariusze GPS i Fallback

| Scenariusz | Zachowanie | Fallback |
|------------|------------|----------|
| GPS wspierany, uprawnienia `granted` | Automatyczne pobranie lokalizacji przy submit | - |
| GPS wspierany, uprawnienia `prompt` | Przeglądarka pokaże dialog uprawnień przy submit | Kontynuuj bez lokalizacji jeśli user odmówi |
| GPS wspierany, uprawnienia `denied` | Checkbox wyłączony, informacja dla użytkownika | Wyprawa bez lokalizacji |
| GPS niewspierany | Checkbox ukryty/wyłączony | Wyprawa bez lokalizacji |
| Timeout przy pobieraniu GPS | Wyświetl błąd, pozwól kontynuować bez lokalizacji | Soft fail - utworzenie wyprawy bez GPS |
| Błąd POSITION_UNAVAILABLE | Wyświetl komunikat, kontynuuj bez lokalizacji | Soft fail |
| Użytkownik odznaczył GPS | Nie pobieraj lokalizacji | Wyprawa bez lokalizacji |

### 10.8 Obsługa uprawnień przeglądarki

```typescript
// Wykrywanie stanu uprawnień przy montowaniu komponentu
useEffect(() => {
  const checkAndHandlePermissions = async () => {
    // Sprawdź Permissions API
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        
        // Nasłuchuj na zmiany uprawnień (np. user zmieni w ustawieniach)
        result.addEventListener("change", () => {
          if (result.state === "denied") {
            setFormState(prev => ({ ...prev, useGps: false }));
          }
        });
      } catch {
        // Fallback dla przeglądarek bez wsparcia
      }
    }
  };
  
  checkAndHandlePermissions();
}, []);
```

### 10.9 Komunikaty użytkownika

| Stan | Komunikat PL |
|------|--------------|
| Pobieranie lokalizacji | "Pobieranie lokalizacji..." |
| Sukces | "Lokalizacja: 52.2297°N, 21.0122°E (±10m)" |
| PERMISSION_DENIED | "Dostęp do lokalizacji został zablokowany. Włącz uprawnienia w ustawieniach przeglądarki." |
| POSITION_UNAVAILABLE | "Lokalizacja jest obecnie niedostępna. Sprawdź czy GPS jest włączony." |
| TIMEOUT | "Upłynął limit czasu pobierania lokalizacji. Spróbuj ponownie." |
| NOT_SUPPORTED | "Twoja przeglądarka nie wspiera geolokalizacji." |

### 10.10 Testowanie integracji GPS

#### Testy manualne

| Test | Kroki | Oczekiwany rezultat |
|------|-------|---------------------|
| Happy path - uprawnienia granted | 1. Otwórz modal, 2. Zaznacz GPS, 3. Kliknij "Rozpocznij" | Lokalizacja pobrana, wyprawa utworzona z współrzędnymi |
| Prompt - akceptacja | 1. Wyczść uprawnienia, 2. Otwórz modal, 3. Kliknij "Rozpocznij", 4. Zaakceptuj prompt | Lokalizacja pobrana po akceptacji |
| Prompt - odmowa | 1. Wyczść uprawnienia, 2. Otwórz modal, 3. Kliknij "Rozpocznij", 4. Odmów w prompt | Wyprawa utworzona bez lokalizacji |
| Denied - permanent | 1. Zablokuj geolocation w ustawieniach, 2. Otwórz modal | Checkbox GPS wyłączony, tooltip z instrukcją |
| Timeout | 1. Symuluj słabe GPS (DevTools), 2. Otwórz modal, 3. Rozpocznij | Po 15s timeout, wyprawa bez lokalizacji |
| Brak wsparcia | 1. Nadpisz navigator.geolocation = undefined | Checkbox GPS ukryty/wyłączony |

#### DevTools - symulacja lokalizacji

```
Chrome DevTools > Sensors > Location:
- Berlin: 52.520008, 13.404954
- Tokyo: 35.689487, 139.691711
- Custom: wpisz własne współrzędne
- Location unavailable: symulacja błędu
```

#### Testy jednostkowe (Vitest)

```typescript
// src/hooks/useGeolocation.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGeolocation } from "./useGeolocation";

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should detect when geolocation is not supported", () => {
    // @ts-expect-error - mocking navigator
    vi.spyOn(navigator, "geolocation", "get").mockReturnValue(undefined);

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.permissionStatus).toBe("unavailable");
  });

  it("should get current position successfully", async () => {
    const mockPosition = {
      coords: {
        latitude: 52.2297,
        longitude: 21.0122,
        accuracy: 10,
      },
      timestamp: Date.now(),
    };

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => success(mockPosition)),
    };

    // @ts-expect-error - mocking navigator
    vi.spyOn(navigator, "geolocation", "get").mockReturnValue(mockGeolocation);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentPosition();
    });

    expect(result.current.coordinates).toEqual({
      latitude: 52.2297,
      longitude: 21.0122,
      accuracy: 10,
      timestamp: expect.any(Number),
    });
  });

  it("should handle permission denied error", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) =>
        error({
          code: 1, // PERMISSION_DENIED
          message: "User denied geolocation",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      ),
    };

    // @ts-expect-error - mocking navigator
    vi.spyOn(navigator, "geolocation", "get").mockReturnValue(mockGeolocation);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentPosition();
    });

    expect(result.current.error?.code).toBe("PERMISSION_DENIED");
    expect(result.current.permissionStatus).toBe("denied");
  });

  it("should handle timeout error", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) =>
        error({
          code: 3, // TIMEOUT
          message: "Timeout",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      ),
    };

    // @ts-expect-error - mocking navigator
    vi.spyOn(navigator, "geolocation", "get").mockReturnValue(mockGeolocation);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentPosition();
    });

    expect(result.current.error?.code).toBe("TIMEOUT");
  });
});
```

## 11. Obsługa błędów

### 11.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia internetowego | Wyświetlenie komunikatu "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie." |
| Timeout żądania | Wyświetlenie komunikatu "Upłynął limit czasu. Spróbuj ponownie." |
| Błąd parsowania odpowiedzi | Wyświetlenie komunikatu "Wystąpił nieoczekiwany błąd. Spróbuj ponownie." |

### 11.2 Błędy autoryzacji

| Scenariusz | Obsługa |
|------------|---------|
| 401 Unauthorized | Przekierowanie na `/auth/login` z zachowaniem intencji powrotu |
| Wygasła sesja | Wyświetlenie snackbara "Sesja wygasła. Zaloguj się ponownie." |

### 11.3 Błędy GPS

| Scenariusz | Obsługa |
|------------|---------|
| Użytkownik odmówił dostępu do GPS | Odznaczenie i wyłączenie checkboxa GPS, wyświetlenie informacji |
| GPS niedostępny na urządzeniu | Ukrycie lub wyłączenie checkboxa GPS |
| Timeout lokalizacji | Kontynuacja bez lokalizacji, informacja dla użytkownika |

### 11.4 Wyświetlanie błędów

Błędy wyświetlane są wewnątrz modalu jako:
- Alert z czerwonym tłem i ikoną błędu
- Tekst komunikatu błędu
- Przycisk "Spróbuj ponownie" (opcjonalnie)

```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Błąd</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## 12. Kroki implementacji

### Krok 1: Utworzenie struktury plików

```
src/hooks/
├── useGeolocation.ts           # Hook obsługi Geolocation API
├── useGeolocation.test.ts      # Testy hooka GPS
└── useMediaQuery.ts            # Hook wykrywania rozmiaru ekranu

src/components/quick-start/
├── index.ts                    # Eksporty publiczne
├── types.ts                    # Typy ViewModel
├── useQuickStart.ts            # Custom hook (integruje useGeolocation)
├── QuickStartSheet.tsx         # Główny komponent modalny
├── QuickStartTrigger.tsx       # Przycisk FAB
├── GPSCheckbox.tsx             # Checkbox GPS z obsługą stanów
├── CopyEquipmentCheckbox.tsx   # Checkbox kopiowania sprzętu
└── StartButton.tsx             # Przycisk akcji
```

### Krok 2: Implementacja typów

Utworzenie pliku `src/components/quick-start/types.ts` z definicjami typów ViewModel opisanymi w sekcji 5.2.

### Krok 3: Implementacja hooka `useGeolocation`

Utworzenie pliku `src/hooks/useGeolocation.ts` z pełną implementacją obsługi Geolocation API zgodnie z sekcją 10.2. Hook odpowiada za:
- Sprawdzanie dostępności Geolocation API w przeglądarce
- Pobieranie statusu uprawnień (Permissions API)
- Pobieranie aktualnej pozycji GPS
- Obsługę błędów (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
- Cachowanie ostatniej znanej lokalizacji

```typescript
// Przykład użycia:
const { 
  coordinates, 
  isLoading, 
  error, 
  permissionStatus, 
  isSupported,
  getCurrentPosition 
} = useGeolocation({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
});
```

### Krok 4: Implementacja custom hooka `useQuickStart`

Utworzenie pliku `src/components/quick-start/useQuickStart.ts` z logiką zarządzania stanem, komunikacji z API i integracją z `useGeolocation` (sekcja 10.4).

### Krok 5: Implementacja komponentów checkboxów

Utworzenie komponentów `GPSCheckbox.tsx` (z pełną obsługą stanów GPS - sekcja 10.5) i `CopyEquipmentCheckbox.tsx` z wykorzystaniem Shadcn Checkbox.

```tsx
// GPSCheckbox.tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

export function GPSCheckbox({ checked, onCheckedChange, disabled }: GPSCheckboxProps) {
  return (
    <div className="flex items-center space-x-3">
      <Checkbox 
        id="use-gps" 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label htmlFor="use-gps" className="flex items-center gap-2 cursor-pointer">
        <MapPin className="h-4 w-4" />
        Użyj mojej lokalizacji GPS
      </Label>
    </div>
  );
}
```

### Krok 6: Implementacja StartButton

Utworzenie komponentu `StartButton.tsx` z obsługą stanu ładowania.

```tsx
// StartButton.tsx
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function StartButton({ onClick, isLoading, disabled }: StartButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      disabled={disabled || isLoading}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Tworzenie wyprawy...
        </>
      ) : (
        "Rozpocznij wyprawę"
      )}
    </Button>
  );
}
```

### Krok 7: Implementacja QuickStartSheet

Utworzenie głównego komponentu modalnego z responsywnym zachowaniem (Sheet na mobile, Dialog na desktop).

```tsx
// QuickStartSheet.tsx
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuickStart } from "./useQuickStart";
import { GPSCheckbox } from "./GPSCheckbox";
import { CopyEquipmentCheckbox } from "./CopyEquipmentCheckbox";
import { StartButton } from "./StartButton";

export function QuickStartSheet({ isOpen, onOpenChange, onSuccess }: QuickStartSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { formState, isLoading, error, setField, submit, clearError } = useQuickStart();

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      onSuccess(result);
      onOpenChange(false);
    }
  };

  const content = (
    <>
      <div className="space-y-4 py-4">
        <GPSCheckbox 
          checked={formState.useGps}
          onCheckedChange={(checked) => setField("useGps", checked)}
        />
        <CopyEquipmentCheckbox 
          checked={formState.copyEquipment}
          onCheckedChange={(checked) => setField("copyEquipment", checked)}
        />
        {error && <ErrorAlert message={error} onDismiss={clearError} />}
      </div>
      <StartButton onClick={handleSubmit} isLoading={isLoading} />
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Nowa wyprawa</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowa wyprawa</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

### Krok 8: Implementacja QuickStartTrigger (FAB)

Utworzenie komponentu przycisku FAB do integracji z Dashboard.

### Krok 9: Integracja z Dashboard

Dodanie komponentu QuickStartSheet do strony Dashboard z obsługą stanu i nawigacji.

```tsx
// W Dashboard.tsx lub pages/app/index.astro
const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

const handleQuickStartSuccess = (response: QuickStartTripResponseDto) => {
  // Wyświetl snackbar
  toast.success("Wyprawa rozpoczęta!");
  // Przekieruj do szczegółów wyprawy
  navigate(`/app/trips/${response.trip.id}`);
};

return (
  <>
    {/* ... reszta Dashboard */}
    <QuickStartTrigger onClick={() => setIsQuickStartOpen(true)} />
    <QuickStartSheet 
      isOpen={isQuickStartOpen}
      onOpenChange={setIsQuickStartOpen}
      onSuccess={handleQuickStartSuccess}
    />
  </>
);
```

### Krok 10: Implementacja hooka useMediaQuery

Jeśli nie istnieje, utworzenie hooka do wykrywania rozmiaru ekranu.

```typescript
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
```

### Krok 11: Stylowanie i dostępność

- Dodanie odpowiednich klas Tailwind dla stylowania MD3
- Ustawienie `aria-label` dla wszystkich interaktywnych elementów
- Zapewnienie poprawnej nawigacji klawiaturowej (Tab, Enter, Escape)
- Ustawienie `focus-visible` dla widoczności focusu

### Krok 12: Testowanie

- Testy manualne na różnych rozdzielczościach (360px, 768px, 1920px)
- Testy z odmową uprawnień GPS (patrz sekcja 10.10)
- Testy obsługi błędów API
- Testy dostępności (screen reader, keyboard navigation)
- Testy jednostkowe hooka `useGeolocation` (Vitest)
- Testy integracyjne flow GPS (symulacja w DevTools)

