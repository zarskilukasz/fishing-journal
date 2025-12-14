# Plan implementacji widoku szczegółów połowu

## 1. Przegląd

Widok szczegółów połowu (`CatchDetailView`) to strona prezentująca pełne informacje o złowionej rybie. Jest dostępna po kliknięciu w kartę połowu z listy połowów na szczegółach wyprawy. Widok prezentuje:

- Duże zdjęcie ryby (jeśli dostępne)
- Nazwę gatunku
- Wagę i wymiar
- Użytą przynętę i zanętę (z historycznych snapshotów)
- Czas złowienia
- Możliwość powrotu do wyprawy

Widok jest zgodny z Geist Design System i wykorzystuje ciemny motyw jako domyślny.

## 2. Routing widoku

**Ścieżka:** `/app/catches/[id]`

**Przykład:** `/app/catches/63e03970-8e60-49e3-aee0-3ddc0e63aefa`

**Plik Astro:** `src/pages/app/catches/[id].astro`

## 3. Struktura komponentów

```
src/pages/app/catches/[id].astro (Astro Page)
└── CatchDetailView (React Island - client:load)
    ├── CatchDetailLoading (stan ładowania)
    ├── CatchDetailError (stan błędu)
    └── CatchDetailContent (główna treść)
        ├── CatchPhotoSection
        │   ├── Duże zdjęcie (img) lub placeholder (ikona Fish)
        │   └── Gradient overlay (opcjonalny)
        ├── CatchInfoSection
        │   ├── SpeciesName (h1)
        │   ├── CaughtAtTime
        │   ├── WeightDisplay (jeśli dostępna)
        │   └── LengthDisplay (jeśli dostępna)
        └── EquipmentSection
            ├── LureInfo (z snapshot)
            └── GroundbaitInfo (z snapshot)
```

## 4. Szczegóły komponentów

### 4.1 Strona Astro: `[id].astro`

- **Opis:** Strona Astro renderująca layout aplikacji z React island dla interaktywności
- **Główne elementy:** 
  - `AppLayout` z `showBackButton={true}` i `title="Szczegóły połowu"`
  - `CatchDetailView` jako React island z `client:load`
- **Propsy przekazywane do CatchDetailView:** `catchId: string`

### 4.2 CatchDetailView

- **Opis:** Główny komponent React zarządzający stanem widoku. Obsługuje pobieranie danych, stany ładowania i błędów.
- **Główne elementy:**
  - `QueryProvider` (wrapper)
  - Warunkowe renderowanie: `CatchDetailLoading` | `CatchDetailError` | `CatchDetailContent`
- **Obsługiwane interakcje:**
  - Automatyczne pobieranie danych przy montowaniu
  - Retry przy błędzie
- **Obsługiwana walidacja:** Brak (widok tylko do odczytu)
- **Typy:** 
  - Props: `CatchDetailViewProps`
  - State: `CatchDetailState`
  - Hook: `UseCatchDetailReturn`
- **Propsy:**
  ```typescript
  interface CatchDetailViewProps {
    catchId: string;
  }
  ```

### 4.3 CatchDetailLoading

- **Opis:** Komponent skeleton wyświetlany podczas ładowania danych
- **Główne elementy:**
  - Skeleton dla zdjęcia (duży prostokąt)
  - Skeleton dla nazwy gatunku
  - Skeleton dla szczegółów (waga, długość)
  - Skeleton dla sprzętu
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak propsów
- **Propsy:** Brak

### 4.4 CatchDetailError

- **Opis:** Komponent błędu z opcją ponownej próby
- **Główne elementy:**
  - Ikona AlertCircle
  - Komunikat błędu
  - Przycisk "Spróbuj ponownie"
  - Link "Wróć do wypraw"
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku retry → wywołanie `onRetry()`
- **Obsługiwana walidacja:** Brak
- **Typy:** `CatchDetailErrorProps`
- **Propsy:**
  ```typescript
  interface CatchDetailErrorProps {
    error: CatchDetailError;
    onRetry?: () => void;
  }
  ```

### 4.5 CatchDetailContent

- **Opis:** Główna treść widoku szczegółów połowu
- **Główne elementy:**
  - `CatchPhotoSection`
  - `CatchInfoSection`
  - `EquipmentSection`
- **Obsługiwane interakcje:** Brak (widok tylko do odczytu)
- **Obsługiwana walidacja:** Brak
- **Typy:** `CatchDetailContentProps`
- **Propsy:**
  ```typescript
  interface CatchDetailContentProps {
    catch: CatchDetailViewModel;
  }
  ```

### 4.6 CatchPhotoSection

- **Opis:** Sekcja prezentująca duże zdjęcie połowu lub placeholder
- **Główne elementy:**
  - Kontener z aspect-ratio 4:3
  - `<img>` tag z lazy loading (gdy zdjęcie dostępne)
  - Gradient overlay (opcjonalnie, dla lepszej czytelności tekstu)
  - Placeholder z ikoną `Fish` (gdy brak zdjęcia)
- **Obsługiwane interakcje:**
  - Kliknięcie w zdjęcie → możliwość powiększenia (opcjonalne, v2)
- **Obsługiwana walidacja:** Brak
- **Typy:** `CatchPhotoSectionProps`
- **Propsy:**
  ```typescript
  interface CatchPhotoSectionProps {
    photoUrl: string | null;
    speciesName: string; // dla alt text
  }
  ```

### 4.7 CatchInfoSection

- **Opis:** Sekcja prezentująca główne informacje o połowie
- **Główne elementy:**
  - `<h1>` z nazwą gatunku
  - Czas złowienia (ikona Clock + sformatowana data/godzina)
  - Waga (ikona Scale + sformatowana wartość, np. "1.2 kg")
  - Długość (ikona Ruler + sformatowana wartość, np. "65 cm")
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** `CatchInfoSectionProps`
- **Propsy:**
  ```typescript
  interface CatchInfoSectionProps {
    speciesName: string;
    caughtAt: string; // ISO datetime
    weightG: number | null;
    lengthMm: number | null;
  }
  ```

### 4.8 EquipmentSection

- **Opis:** Sekcja prezentująca użyty sprzęt (przynęta i zanęta)
- **Główne elementy:**
  - Nagłówek sekcji "Sprzęt"
  - Chip/badge dla przynęty (ikona Anchor lub Fish)
  - Chip/badge dla zanęty (ikona Package)
  - Pusta wiadomość jeśli brak sprzętu
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** `EquipmentSectionProps`
- **Propsy:**
  ```typescript
  interface EquipmentSectionProps {
    lureName: string | null;
    groundbaitName: string | null;
  }
  ```

## 5. Typy

### 5.1 Typy widoku (nowe)

```typescript
// src/components/catch-detail/types.ts

import type { CatchDto, FishSpeciesDto, CatchPhotoDownloadUrlResponseDto } from "@/types";

/**
 * Props dla głównego komponentu widoku
 */
export interface CatchDetailViewProps {
  catchId: string;
}

/**
 * Błąd w widoku szczegółów połowu
 */
export interface CatchDetailError {
  code: string;
  message: string;
}

/**
 * Stan widoku szczegółów połowu
 */
export interface CatchDetailState {
  catch: CatchDetailViewModel | null;
  isLoading: boolean;
  error: CatchDetailError | null;
}

/**
 * ViewModel dla szczegółów połowu - przetworzone dane gotowe do wyświetlenia
 */
export interface CatchDetailViewModel {
  id: string;
  tripId: string;
  caughtAt: string; // ISO datetime
  speciesName: string;
  lureName: string | null; // z snapshot
  groundbaitName: string | null; // z snapshot
  weightG: number | null;
  lengthMm: number | null;
  photoUrl: string | null;
  
  // Sformatowane wartości dla UI
  caughtAtFormatted: string; // np. "12 gru 2025, 14:30"
  weightFormatted: string | null; // np. "1.2 kg"
  lengthFormatted: string | null; // np. "65 cm"
}

/**
 * Wartość zwracana przez useCatchDetail hook
 */
export interface UseCatchDetailReturn {
  state: CatchDetailState;
  actions: {
    refresh: () => Promise<void>;
  };
}

/**
 * Props dla komponentu błędu
 */
export interface CatchDetailErrorProps {
  error: CatchDetailError;
  onRetry?: () => void;
}

/**
 * Props dla głównej treści
 */
export interface CatchDetailContentProps {
  catch: CatchDetailViewModel;
}

/**
 * Props dla sekcji zdjęcia
 */
export interface CatchPhotoSectionProps {
  photoUrl: string | null;
  speciesName: string;
}

/**
 * Props dla sekcji informacji
 */
export interface CatchInfoSectionProps {
  speciesName: string;
  caughtAt: string;
  caughtAtFormatted: string;
  weightG: number | null;
  weightFormatted: string | null;
  lengthMm: number | null;
  lengthFormatted: string | null;
}

/**
 * Props dla sekcji sprzętu
 */
export interface EquipmentSectionProps {
  lureName: string | null;
  groundbaitName: string | null;
}
```

### 5.2 Wykorzystywane typy z `src/types.ts`

- `CatchDto` (alias dla `CatchRow`) - odpowiedź z API GET /catches/{id}
- `FishSpeciesDto` - odpowiedź z API GET /fish-species/{id}
- `CatchPhotoDownloadUrlResponseDto` - odpowiedź z API GET /catches/{id}/photo/download-url
- `ApiErrorResponse` - standardowy format błędu API

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useCatchDetail`

Hook zarządza pobieraniem danych połowu, gatunku i URL zdjęcia.

**Plik:** `src/components/catch-detail/hooks/useCatchDetail.ts`

**Funkcjonalności:**
1. Pobiera dane połowu z `GET /api/v1/catches/{catchId}`
2. Pobiera nazwę gatunku z `GET /api/v1/fish-species/{speciesId}`
3. Pobiera URL zdjęcia z `GET /api/v1/catches/{catchId}/photo/download-url` (jeśli `photo_path` istnieje)
4. Łączy dane w `CatchDetailViewModel`
5. Obsługuje stany ładowania i błędów

**Implementacja:**

```typescript
// src/components/catch-detail/hooks/useCatchDetail.ts

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  CatchDto,
  FishSpeciesDto,
  CatchPhotoDownloadUrlResponseDto,
  ApiErrorResponse,
} from "@/types";
import type {
  CatchDetailState,
  CatchDetailError,
  CatchDetailViewModel,
  UseCatchDetailReturn,
} from "../types";

// Query keys
const catchDetailQueryKeys = {
  catch: (id: string) => ["catch", "detail", id] as const,
  species: (id: string) => ["fish-species", id] as const,
  photoUrl: (catchId: string) => ["catch", "photo-url", catchId] as const,
};

// Fetch functions
async function fetchCatch(catchId: string): Promise<CatchDto> {
  const response = await fetch(`/api/v1/catches/${catchId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as Partial<ApiErrorResponse>;
    throw new Error(errorData.error?.message || "Nie udało się pobrać danych połowu");
  }
  return response.json();
}

async function fetchSpecies(speciesId: string): Promise<FishSpeciesDto> {
  const response = await fetch(`/api/v1/fish-species/${speciesId}`);
  if (!response.ok) {
    throw new Error("Nie udało się pobrać danych gatunku");
  }
  return response.json();
}

async function fetchPhotoUrl(catchId: string): Promise<string | null> {
  const response = await fetch(`/api/v1/catches/${catchId}/photo/download-url`);
  if (response.status === 404) {
    return null; // Brak zdjęcia
  }
  if (!response.ok) {
    return null; // Ignoruj błędy zdjęcia
  }
  const data = await response.json() as CatchPhotoDownloadUrlResponseDto;
  return data.url;
}

// Formatting helpers
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeight(grams: number | null): string | null {
  if (grams === null) return null;
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

function formatLength(mm: number | null): string | null {
  if (mm === null) return null;
  if (mm >= 10) {
    return `${(mm / 10).toFixed(1)} cm`;
  }
  return `${mm} mm`;
}

export function useCatchDetail(catchId: string): UseCatchDetailReturn {
  // 1. Fetch catch data
  const catchQuery = useQuery({
    queryKey: catchDetailQueryKeys.catch(catchId),
    queryFn: () => fetchCatch(catchId),
    staleTime: 60000, // 1 minute
  });

  // 2. Fetch species (depends on catch data)
  const speciesQuery = useQuery({
    queryKey: catchDetailQueryKeys.species(catchQuery.data?.species_id ?? ""),
    queryFn: () => fetchSpecies(catchQuery.data!.species_id),
    enabled: !!catchQuery.data?.species_id,
    staleTime: 300000, // 5 minutes - species rarely change
  });

  // 3. Fetch photo URL (depends on catch having photo_path)
  const photoQuery = useQuery({
    queryKey: catchDetailQueryKeys.photoUrl(catchId),
    queryFn: () => fetchPhotoUrl(catchId),
    enabled: !!catchQuery.data?.photo_path,
    staleTime: 300000, // 5 minutes
  });

  // Combine errors
  const error = useMemo<CatchDetailError | null>(() => {
    if (catchQuery.error) {
      return {
        code: "fetch_error",
        message: catchQuery.error instanceof Error 
          ? catchQuery.error.message 
          : "Nieznany błąd",
      };
    }
    if (speciesQuery.error) {
      return {
        code: "species_error",
        message: "Nie udało się pobrać danych gatunku",
      };
    }
    return null;
  }, [catchQuery.error, speciesQuery.error]);

  // Build ViewModel
  const viewModel = useMemo<CatchDetailViewModel | null>(() => {
    if (!catchQuery.data || !speciesQuery.data) return null;

    const c = catchQuery.data;
    const s = speciesQuery.data;

    return {
      id: c.id,
      tripId: c.trip_id,
      caughtAt: c.caught_at,
      speciesName: s.name,
      lureName: c.lure_name_snapshot,
      groundbaitName: c.groundbait_name_snapshot,
      weightG: c.weight_g,
      lengthMm: c.length_mm,
      photoUrl: photoQuery.data ?? null,
      
      // Formatted values
      caughtAtFormatted: formatDateTime(c.caught_at),
      weightFormatted: formatWeight(c.weight_g),
      lengthFormatted: formatLength(c.length_mm),
    };
  }, [catchQuery.data, speciesQuery.data, photoQuery.data]);

  // Actions
  const refresh = useCallback(async () => {
    await Promise.all([
      catchQuery.refetch(),
      speciesQuery.refetch(),
      photoQuery.refetch(),
    ]);
  }, [catchQuery, speciesQuery, photoQuery]);

  // Determine loading state
  const isLoading = catchQuery.isLoading || 
    (catchQuery.isSuccess && speciesQuery.isLoading);

  const state: CatchDetailState = {
    catch: viewModel,
    isLoading,
    error,
  };

  return {
    state,
    actions: {
      refresh,
    },
  };
}
```

## 7. Integracja API

### 7.1 Endpointy wykorzystywane

| Endpoint | Metoda | Opis | Typ żądania | Typ odpowiedzi |
|----------|--------|------|-------------|----------------|
| `/api/v1/catches/{id}` | GET | Pobiera szczegóły połowu | - | `CatchDto` |
| `/api/v1/fish-species/{id}` | GET | Pobiera nazwę gatunku | - | `FishSpeciesDto` |
| `/api/v1/catches/{id}/photo/download-url` | GET | Pobiera signed URL zdjęcia | - | `CatchPhotoDownloadUrlResponseDto` |

### 7.2 Kolejność wywołań

1. **Równoległy start:** Pobierz dane połowu
2. **Po otrzymaniu połowu:** Równolegle:
   - Pobierz gatunek (na podstawie `species_id`)
   - Pobierz URL zdjęcia (jeśli `photo_path` istnieje)

### 7.3 Obsługa odpowiedzi

```typescript
// Sukces - CatchDto
{
  id: "uuid",
  trip_id: "uuid",
  caught_at: "2025-12-12T14:30:00Z",
  species_id: "uuid",
  lure_id: "uuid" | null,
  groundbait_id: "uuid" | null,
  lure_name_snapshot: "Twister 5cm" | null,
  groundbait_name_snapshot: "Zanęta karpiowa" | null,
  weight_g: 1200 | null,
  length_mm: 450 | null,
  photo_path: "user123/catch456.webp" | null,
  created_at: "...",
  updated_at: "..."
}

// Sukces - FishSpeciesDto
{
  id: "uuid",
  name: "Karp",
  created_at: "..."
}

// Sukces - CatchPhotoDownloadUrlResponseDto
{
  url: "https://storage.supabase.co/...",
  expires_in: 600
}
```

## 8. Interakcje użytkownika

| Interakcja | Element | Oczekiwany wynik |
|------------|---------|------------------|
| Wejście na stronę | URL `/app/catches/{id}` | Automatyczne pobranie i wyświetlenie danych połowu |
| Kliknięcie "Wróć" | BackButton w TopAppBar | Powrót do poprzedniej strony (szczegóły wyprawy) |
| Kliknięcie "Spróbuj ponownie" | Przycisk w stanie błędu | Ponowne pobranie danych |
| Kliknięcie "Wróć do wypraw" | Link w stanie błędu | Przekierowanie do `/app` |

## 9. Warunki i walidacja

### 9.1 Walidacja parametru URL

- **Warunek:** `catchId` musi być prawidłowym UUID
- **Komponent:** Strona Astro `[id].astro`
- **Efekt:** Jeśli `id` jest pusty, przekierowanie do `/app`

### 9.2 Walidacja autoryzacji

- **Warunek:** Użytkownik musi być zalogowany
- **Komponent:** `AppLayout` (server-side)
- **Efekt:** Przekierowanie do `/auth/login` jeśli niezalogowany

### 9.3 Walidacja dostępu do połowu

- **Warunek:** Połów musi należeć do wyprawy użytkownika
- **Komponent:** API + RLS na poziomie bazy danych
- **Efekt:** Błąd 404 jeśli połów nie istnieje lub nie należy do użytkownika

## 10. Obsługa błędów

### 10.1 Scenariusze błędów

| Scenariusz | Kod HTTP | Obsługa UI |
|------------|----------|------------|
| Brak autoryzacji | 401 | Przekierowanie do `/auth/login` |
| Połów nie znaleziony | 404 | Komunikat "Połów nie został znaleziony" + przycisk powrotu |
| Błąd sieciowy | - | Komunikat "Nie udało się pobrać danych" + przycisk retry |
| Błąd gatunku | 404/500 | Wyświetl "Nieznany gatunek" zamiast nazwy |
| Błąd zdjęcia | 404/500 | Wyświetl placeholder zamiast zdjęcia (silent fail) |

### 10.2 Komponent błędu

```tsx
function CatchDetailError({ error, onRetry }: CatchDetailErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-medium mb-2">Nie udało się załadować połowu</h2>
      <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
      <div className="flex gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        )}
        <Button variant="ghost" asChild>
          <a href="/app">Wróć do wypraw</a>
        </Button>
      </div>
    </div>
  );
}
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów

```
src/
├── pages/
│   └── app/
│       └── catches/
│           └── [id].astro           # NOWY
└── components/
    └── catch-detail/               # NOWY FOLDER
        ├── index.ts
        ├── types.ts
        ├── hooks/
        │   └── useCatchDetail.ts
        └── components/
            ├── CatchDetailView.tsx
            ├── CatchDetailLoading.tsx
            ├── CatchDetailError.tsx
            ├── CatchDetailContent.tsx
            ├── CatchPhotoSection.tsx
            ├── CatchInfoSection.tsx
            └── EquipmentSection.tsx
```

### Krok 2: Implementacja typów

1. Utworzyć plik `src/components/catch-detail/types.ts`
2. Zdefiniować wszystkie interfejsy opisane w sekcji 5

### Krok 3: Implementacja hooka `useCatchDetail`

1. Utworzyć plik `src/components/catch-detail/hooks/useCatchDetail.ts`
2. Zaimplementować pobieranie danych z trzech endpointów
3. Zaimplementować funkcje formatujące
4. Zaimplementować logikę łączenia danych w ViewModel

### Krok 4: Implementacja komponentów UI

1. **CatchDetailLoading** - szkielety ładowania
2. **CatchDetailError** - komunikat błędu z akcjami
3. **CatchPhotoSection** - duże zdjęcie lub placeholder
4. **CatchInfoSection** - gatunek, czas, waga, długość
5. **EquipmentSection** - przynęta i zanęta
6. **CatchDetailContent** - kompozycja powyższych
7. **CatchDetailView** - główny komponent z logiką stanu

### Krok 5: Implementacja strony Astro

1. Utworzyć plik `src/pages/app/catches/[id].astro`
2. Użyć `AppLayout` z odpowiednimi propsami
3. Renderować `CatchDetailView` jako React island

### Krok 6: Eksport komponentów

1. Utworzyć plik `src/components/catch-detail/index.ts`
2. Eksportować publiczne komponenty i typy

### Krok 7: Testowanie

1. Przetestować nawigację z listy połowów do szczegółów
2. Przetestować wyświetlanie wszystkich danych
3. Przetestować stany ładowania i błędów
4. Przetestować przypadek braku zdjęcia
5. Przetestować przypadek braku przynęty/zanęty (nullable)
6. Przetestować responsywność (mobile i desktop)
7. Przetestować przycisk powrotu

### Krok 8: Stylowanie zgodne z Geist Design System

1. Użyć klas `geist-card` dla kontenerów
2. Zastosować efekty `glow` dla interaktywnych elementów
3. Użyć tokenów kolorów z `global.css`
4. Zapewnić poprawne działanie w trybie ciemnym i jasnym

### Przykład końcowego wyglądu (pseudo-kod HTML):

```html
<div class="space-y-6 pb-24">
  <!-- Photo Section -->
  <div class="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary">
    <img src="..." alt="Karp" class="w-full h-full object-cover" />
  </div>

  <!-- Info Section -->
  <div class="geist-card p-6 space-y-4">
    <h1 class="text-2xl font-semibold">Karp</h1>
    
    <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span class="flex items-center gap-2">
        <Clock class="h-4 w-4" />
        12 gru 2025, 14:30
      </span>
      <span class="flex items-center gap-2">
        <Scale class="h-4 w-4" />
        1.2 kg
      </span>
      <span class="flex items-center gap-2">
        <Ruler class="h-4 w-4" />
        45 cm
      </span>
    </div>
  </div>

  <!-- Equipment Section -->
  <div class="geist-card p-6">
    <h2 class="text-lg font-medium mb-4">Sprzęt</h2>
    <div class="flex flex-wrap gap-2">
      <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <Anchor class="h-4 w-4" />
        Twister 5cm
      </span>
      <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <Package class="h-4 w-4" />
        Zanęta karpiowa
      </span>
    </div>
  </div>
</div>
```

