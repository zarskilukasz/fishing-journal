# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard (Ekran główny) to centralny widok aplikacji Dziennik Wędkarski, dostępny dla zalogowanych użytkowników. Głównym celem jest prezentacja listy ostatnich wypraw wędkarskich posortowanych chronologicznie oraz zapewnienie szybkiego dostępu do tworzenia nowej wyprawy poprzez przycisk FAB (Floating Action Button).

Widok realizuje wymagania z user story US-007 (Przegląd historii wypraw), prezentując podsumowanie każdej wyprawy z liczbą połowów. Dashboard działa w trybie responsywnym (RWD) z różnym układem nawigacji dla urządzeń mobilnych (BottomNavigation) i desktopowych (NavigationRail).

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app` |
| **Plik** | `src/pages/app/index.astro` |
| **Ochrona** | Zalogowani użytkownicy (middleware sprawdza sesję) |
| **Redirect** | Niezalogowani → `/auth/login` |

## 3. Struktura komponentów

```
DashboardPage (Astro)
└── AppLayout
    ├── TopAppBar
    │   ├── AppLogo
    │   └── UserAvatarMenu
    ├── NavigationRail (desktop, ≥840px)
    ├── MainContent
    │   ├── ActiveTripBanner (warunkowy - gdy istnieje aktywna wyprawa)
    │   └── TripListSection
    │       ├── TripList
    │       │   ├── TripCard[] (gdy są wyprawy)
    │       │   ├── TripCardSkeleton[] (podczas ładowania)
    │       │   ├── LoadMoreButton (desktop)
    │       │   └── InfiniteScrollTrigger (mobile)
    │       └── EmptyState (gdy brak wypraw)
    ├── QuickStartFAB
    ├── BottomNavigation (mobile, <840px)
    └── QuickStartSheet (modal bottom sheet / dialog)
```

## 4. Szczegóły komponentów

### 4.1 DashboardPage (Astro)

- **Opis**: Strona Astro renderująca dashboard z komponentami React jako "wyspy". Sprawdza sesję użytkownika i przekazuje dane do komponentów React.
- **Główne elementy**: 
  - `<Layout>` wrapper
  - `<AppLayout client:load>` z React
- **Obsługiwane interakcje**: Brak (kontener)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak dodatkowych
- **Propsy**: Brak

### 4.2 AppLayout

- **Opis**: Wrapper layoutu dla wszystkich stron w strefie `/app`. Zawiera nawigację główną (TopAppBar, BottomNavigation/NavigationRail) oraz slot na zawartość.
- **Główne elementy**:
  - `<TopAppBar />` - nagłówek
  - `<NavigationRail />` - nawigacja boczna (desktop)
  - `<main>` - kontener treści
  - `<BottomNavigation />` - nawigacja dolna (mobile)
- **Obsługiwane interakcje**: 
  - Kliknięcie elementów nawigacji → nawigacja do odpowiedniej strony
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak dodatkowych
- **Propsy**:
  ```typescript
  interface AppLayoutProps {
    children: React.ReactNode;
    activeNavItem?: "trips" | "equipment" | "profile";
  }
  ```

### 4.3 TopAppBar

- **Opis**: Nagłówek aplikacji w stylu Material Design 3 z logo i menu użytkownika.
- **Główne elementy**:
  - Logo/nazwa aplikacji
  - `<UserAvatarMenu />` - avatar z rozwijanym menu
- **Obsługiwane interakcje**:
  - Kliknięcie logo → nawigacja do `/app`
  - Kliknięcie avatar → otwarcie menu
  - Kliknięcie "Wyloguj" w menu → wylogowanie
- **Obsługiwana walidacja**: Brak
- **Typy**: `SessionUserDto`
- **Propsy**:
  ```typescript
  interface TopAppBarProps {
    user: SessionUserDto;
  }
  ```

### 4.4 NavigationRail

- **Opis**: Nawigacja boczna dla ekranów desktopowych (≥840px) zgodna z MD3 Navigation Rail.
- **Główne elementy**:
  - Ikona + label "Wyprawy" (aktywna na dashboardzie)
  - Ikona + label "Sprzęt"
  - Ikona + label "Profil"
- **Obsługiwane interakcje**:
  - Kliknięcie elementu → nawigacja do odpowiedniej strony
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface NavigationRailProps {
    activeItem: "trips" | "equipment" | "profile";
  }
  ```

### 4.5 BottomNavigation

- **Opis**: Nawigacja dolna dla urządzeń mobilnych (<840px) zgodna z MD3 Navigation Bar.
- **Główne elementy**:
  - Ikona + label "Wyprawy"
  - Ikona + label "Sprzęt"
  - Ikona + label "Profil"
- **Obsługiwane interakcje**:
  - Kliknięcie elementu → nawigacja do odpowiedniej strony
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface BottomNavigationProps {
    activeItem: "trips" | "equipment" | "profile";
  }
  ```

### 4.6 ActiveTripBanner

- **Opis**: Banner MD3 wyświetlany gdy użytkownik ma aktywną wyprawę (status="active"). Umożliwia szybki dostęp do trwającej wyprawy.
- **Główne elementy**:
  - Ikona statusu
  - Tekst "Trwa wyprawa: {lokalizacja lub data}"
  - Przycisk "Kontynuuj"
- **Obsługiwane interakcje**:
  - Kliknięcie bannera lub przycisku → nawigacja do `/app/trips/{id}`
- **Obsługiwana walidacja**: Brak
- **Typy**: `TripListItemDto`
- **Propsy**:
  ```typescript
  interface ActiveTripBannerProps {
    trip: TripListItemDto;
  }
  ```

### 4.7 TripListSection

- **Opis**: Sekcja zawierająca listę wypraw lub stan pusty. Zarządza logiką pobierania danych i stanami ładowania.
- **Główne elementy**:
  - `<TripList />` lub `<EmptyState />`
- **Obsługiwane interakcje**: Brak (deleguje do dzieci)
- **Obsługiwana walidacja**: Brak
- **Typy**: `TripListItemDto[]`, `PageInfo`
- **Propsy**: Brak (używa hooka `useTripList`)

### 4.8 TripList

- **Opis**: Lista kart wypraw z obsługą paginacji. Na mobile używa infinite scroll, na desktop pokazuje przycisk "Załaduj więcej".
- **Główne elementy**:
  - `<TripCard />[]` - karty wypraw
  - `<TripCardSkeleton />[]` - skeleton podczas ładowania
  - `<LoadMoreButton />` - przycisk paginacji (desktop)
  - `<InfiniteScrollTrigger />` - trigger infinite scroll (mobile)
- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do szczegółów wyprawy
  - Scroll do dołu (mobile) → pobranie następnej strony
  - Kliknięcie "Załaduj więcej" (desktop) → pobranie następnej strony
- **Obsługiwana walidacja**: Brak
- **Typy**: `TripListItemDto[]`, `PageInfo`
- **Propsy**:
  ```typescript
  interface TripListProps {
    trips: TripListItemDto[];
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    onLoadMore: () => void;
  }
  ```

### 4.9 TripCard

- **Opis**: Pojedyncza karta wyprawy w stylu MD3 Filled Card. Wyświetla podsumowanie wyprawy: datę, lokalizację, liczbę połowów i status.
- **Główne elementy**:
  - Ikona statusu (draft/active/closed)
  - Data rozpoczęcia (sformatowana)
  - Lokalizacja (label lub współrzędne)
  - Liczba połowów (catch_count)
  - Ikona pogody (opcjonalnie, jeśli dostępna)
- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do `/app/trips/{id}`
- **Obsługiwana walidacja**: Brak
- **Typy**: `TripListItemDto`, `TripCardViewModel`
- **Propsy**:
  ```typescript
  interface TripCardProps {
    trip: TripListItemDto;
    onClick?: () => void;
  }
  ```

### 4.10 TripCardSkeleton

- **Opis**: Skeleton loading dla karty wyprawy, zachowujący jej wymiary.
- **Główne elementy**:
  - Shadcn/ui Skeleton components
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**: Brak

### 4.11 EmptyState

- **Opis**: Stan pusty wyświetlany gdy użytkownik nie ma żadnych wypraw. Zawiera ilustrację i zachęcający komunikat z CTA.
- **Główne elementy**:
  - Ilustracja (SVG lub Lucide icon)
  - Nagłówek "Brak wypraw"
  - Opis "Rozpocznij swoją pierwszą wyprawę wędkarską"
  - Przycisk "Nowa wyprawa"
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku → otwarcie QuickStartSheet
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface EmptyStateProps {
    onCreateTrip: () => void;
  }
  ```

### 4.12 QuickStartFAB

- **Opis**: Extended FAB w prawym dolnym rogu ekranu do szybkiego rozpoczęcia nowej wyprawy.
- **Główne elementy**:
  - Ikona "+"
  - Label "Nowa wyprawa"
- **Obsługiwane interakcje**:
  - Kliknięcie → otwarcie QuickStartSheet
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface QuickStartFABProps {
    onClick: () => void;
  }
  ```

### 4.13 QuickStartSheet

- **Opis**: Modal (Bottom Sheet na mobile, Dialog na desktop) z opcjami szybkiego rozpoczęcia wyprawy.
- **Główne elementy**:
  - Tytuł "Nowa wyprawa"
  - Checkbox "Użyj mojej lokalizacji GPS"
  - Checkbox "Kopiuj sprzęt z ostatniej wyprawy"
  - Przycisk "Rozpocznij wyprawę"
  - Przycisk "Anuluj"
- **Obsługiwane interakcje**:
  - Toggle checkboxów → zmiana stanu lokalnego
  - Kliknięcie "Rozpocznij" → wywołanie quick-start API
  - Kliknięcie "Anuluj" lub backdrop → zamknięcie modalu
- **Obsługiwana walidacja**: Brak (checkboxy są opcjonalne)
- **Typy**: `QuickStartTripCommand`, `QuickStartTripResponseDto`
- **Propsy**:
  ```typescript
  interface QuickStartSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (trip: TripDto) => void;
  }
  ```

### 4.14 LoadMoreButton

- **Opis**: Przycisk do ładowania kolejnej strony wyników (desktop).
- **Główne elementy**:
  - Button "Załaduj więcej"
  - Spinner podczas ładowania
- **Obsługiwane interakcje**:
  - Kliknięcie → wywołanie onLoadMore
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface LoadMoreButtonProps {
    onClick: () => void;
    isLoading: boolean;
    disabled?: boolean;
  }
  ```

### 4.15 InfiniteScrollTrigger

- **Opis**: Niewidoczny element na końcu listy używający IntersectionObserver do triggerowania paginacji.
- **Główne elementy**:
  - Div z ref dla IntersectionObserver
  - Opcjonalny spinner
- **Obsługiwane interakcje**:
  - Pojawienie się w viewport → wywołanie onIntersect
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface InfiniteScrollTriggerProps {
    onIntersect: () => void;
    disabled?: boolean;
  }
  ```

## 5. Typy

### 5.1 Typy z API (istniejące w `src/types.ts`)

```typescript
// Podstawowe typy
type UUID = string;
type ISODateTime = string;
type Cursor = string;
type TripStatus = "draft" | "active" | "closed";

// Lokalizacja
interface TripLocationDto {
  lat: number;
  lng: number;
  label?: string | null;
}

// Pojedyncza wyprawa (DTO)
type TripDto = {
  id: UUID;
  started_at: ISODateTime;
  ended_at: ISODateTime | null;
  status: TripStatus;
  location: TripLocationDto | null;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

// Podsumowanie wyprawy
interface TripSummaryDto {
  catch_count: number;
}

// Element listy wypraw (z podsumowaniem)
type TripListItemDto = TripDto & {
  summary: TripSummaryDto;
};

// Paginacja
interface PageInfo {
  limit: number;
  next_cursor: Cursor | null;
}

// Odpowiedź listy wypraw
interface TripListResponseDto {
  data: TripListItemDto[];
  page: PageInfo;
}

// Command dla quick-start
interface QuickStartTripCommand {
  /** Opcjonalna lokalizacja GPS (frontend pobiera przez Geolocation API) */
  location?: TripLocationDto | null;
  /** Czy skopiować sprzęt z ostatniej wyprawy */
  copy_equipment_from_last_trip: boolean;
}

// Odpowiedź quick-start
interface QuickStartTripResponseDto {
  trip: TripDto;
  copied_equipment: {
    rod_ids: UUID[];
    lure_ids: UUID[];
    groundbait_ids: UUID[];
  };
}

// Sesja użytkownika
interface SessionUserDto {
  id: UUID;
  email: string;
}
```

### 5.2 ViewModele (nowe, do utworzenia)

```typescript
// ViewModel dla karty wyprawy (transformacja TripListItemDto na dane wyświetlania)
interface TripCardViewModel {
  id: string;
  formattedStartDate: string;        // np. "12 gru 2025"
  formattedTimeRange: string | null; // np. "10:00 - 14:00" lub null
  locationLabel: string | null;      // location.label lub formatowane współrzędne
  catchCount: number;
  status: TripStatus;
  isActive: boolean;
  statusLabel: string;               // "Szkic" | "W trakcie" | "Zakończona"
}

// Stan listy wypraw (używany przez hook)
interface TripListState {
  trips: TripListItemDto[];
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  activeTrip: TripListItemDto | null;
}

// Parametry zapytania listy wypraw
interface TripListQueryParams {
  sort: "started_at" | "created_at" | "updated_at";
  order: "asc" | "desc";
  limit: number;
  cursor?: string;
  status?: TripStatus;
  include_deleted?: boolean;
}
```

### 5.3 Funkcje pomocnicze transformacji

```typescript
// Transformacja TripListItemDto → TripCardViewModel
function toTripCardViewModel(trip: TripListItemDto): TripCardViewModel;

// Formatowanie daty
function formatTripDate(isoDate: string): string;

// Formatowanie zakresu czasu
function formatTimeRange(startAt: string, endAt: string | null): string | null;

// Formatowanie lokalizacji
function formatLocation(location: TripLocationDto | null): string | null;

// Mapowanie statusu na label PL
function getStatusLabel(status: TripStatus): string;
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useTripList`

Hook oparty na TanStack Query (useInfiniteQuery) do zarządzania listą wypraw z paginacją kursorową.

```typescript
interface UseTripListOptions {
  limit?: number;
  sort?: "started_at" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}

interface UseTripListReturn {
  // Dane
  trips: TripListItemDto[];
  activeTrip: TripListItemDto | null;
  
  // Stany ładowania
  isLoading: boolean;
  isFetchingNextPage: boolean;
  
  // Paginacja
  hasNextPage: boolean;
  fetchNextPage: () => void;
  
  // Błędy
  error: Error | null;
  
  // Akcje
  refetch: () => void;
}

function useTripList(options?: UseTripListOptions): UseTripListReturn;
```

**Implementacja:**
- Używa `useInfiniteQuery` z TanStack Query
- Query key: `["trips", { sort, order }]`
- getNextPageParam: ekstrakcja `next_cursor` z odpowiedzi
- staleTime: 60000 (1 minuta)
- Automatyczna ekstrakcja `activeTrip` z listy (status === "active")

### 6.2 Custom Hook: `useQuickStartTrip`

Hook oparty na TanStack Query (useMutation) do tworzenia wyprawy przez quick-start.

```typescript
interface UseQuickStartTripReturn {
  quickStart: (command: QuickStartTripCommand) => void;
  isLoading: boolean;
  error: Error | null;
}

function useQuickStartTrip(options: {
  onSuccess?: (response: QuickStartTripResponseDto) => void;
  onError?: (error: Error) => void;
}): UseQuickStartTripReturn;
```

**Implementacja:**
- Używa `useMutation` z TanStack Query
- invalidateQueries: `["trips"]` przy sukcesie
- Obsługa błędów z mapowaniem na komunikaty PL

### 6.3 Custom Hook: `useMediaQuery`

Hook do detekcji responsywności (mobile vs desktop).

```typescript
function useMediaQuery(query: string): boolean;

// Użycie:
const isMobile = useMediaQuery("(max-width: 839px)");
const isDesktop = useMediaQuery("(min-width: 840px)");
```

### 6.4 Stan lokalny komponentów

**QuickStartSheet:**
```typescript
const [useGps, setUseGps] = useState(true);
const [copyEquipment, setCopyEquipment] = useState(true);
```

**TripListSection:**
```typescript
const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Dashboard używa **Supabase SDK** do autoryzacji zgodnie z ujednoliconą architekturą auth:

**Server-side (Astro middleware):**
```typescript
// Middleware automatycznie weryfikuje sesję dla /app/*
// Klient Supabase dostępny w Astro.locals.supabase
const supabase = Astro.locals.supabase;
const { data: { user } } = await supabase.auth.getUser();
```

**Client-side (React components):**
```typescript
import { createBrowserClient } from '@supabase/ssr';

// Dla operacji wymagających autoryzacji po stronie klienta
const supabase = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

**Konfiguracja zmiennych środowiskowych:**
- `PUBLIC_SUPABASE_URL` - URL projektu Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Publiczny klucz anon

### 7.1 GET `/api/v1/trips` - Lista wypraw

**Request:**
```typescript
// Query parameters
{
  sort: "started_at",
  order: "desc",
  limit: 20,
  cursor?: string // dla paginacji
}
```

**Response (200 OK):**
```typescript
interface TripListResponseDto {
  data: TripListItemDto[];
  page: {
    limit: number;
    next_cursor: string | null;
  };
}
```

**Użycie:**
```typescript
const fetchTrips = async (pageParam?: string): Promise<TripListResponseDto> => {
  const params = new URLSearchParams({
    sort: "started_at",
    order: "desc",
    limit: "20",
  });
  if (pageParam) params.set("cursor", pageParam);
  
  const response = await fetch(`/api/v1/trips?${params}`);
  if (!response.ok) throw new Error("Failed to fetch trips");
  return response.json();
};
```

### 7.2 POST `/api/v1/trips/quick-start` - Szybkie rozpoczęcie

**Request:**
```typescript
interface QuickStartTripCommand {
  /** Opcjonalna lokalizacja GPS (frontend pobiera przez Geolocation API) */
  location?: {
    lat: number;   // -90 do 90
    lng: number;   // -180 do 180
    label?: string | null;  // opcjonalna nazwa miejsca
  } | null;
  /** Czy skopiować sprzęt z ostatniej wyprawy */
  copy_equipment_from_last_trip: boolean;
}
```

**Response (201 Created):**
```typescript
interface QuickStartTripResponseDto {
  trip: TripDto;  // trip.location zawiera współrzędne jeśli były podane
  copied_equipment: {
    rod_ids: UUID[];
    lure_ids: UUID[];
    groundbait_ids: UUID[];
  };
}
```

**Użycie (z Geolocation API):**
```typescript
const quickStartTrip = async (
  copyEquipment: boolean,
  useGps: boolean
): Promise<QuickStartTripResponseDto> => {
  let location: { lat: number; lng: number } | undefined;
  
  // Pobierz lokalizację jeśli użytkownik wybrał GPS
  if (useGps && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });
      location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch {
      // Kontynuuj bez lokalizacji w przypadku błędu GPS
    }
  }
  
  const command: QuickStartTripCommand = {
    location,
    copy_equipment_from_last_trip: copyEquipment,
  };
  
  const response = await fetch("/api/v1/trips/quick-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create trip");
  }
  return response.json();
};
```

## 8. Interakcje użytkownika

### 8.1 Ładowanie strony

1. Użytkownik wchodzi na `/app`
2. Middleware sprawdza sesję (redirect do `/auth/login` jeśli brak)
3. Wyświetlane są skeleton karty (`TripCardSkeleton`)
4. Hook `useTripList` pobiera pierwszą stronę wypraw
5. Po załadowaniu:
   - Jeśli są wyprawy → wyświetlenie `TripList`
   - Jeśli brak wypraw → wyświetlenie `EmptyState`
   - Jeśli jest aktywna wyprawa → wyświetlenie `ActiveTripBanner`

### 8.2 Paginacja (mobile - infinite scroll)

1. Użytkownik scrolluje listę wypraw
2. `InfiniteScrollTrigger` wchodzi w viewport
3. Hook wywołuje `fetchNextPage()`
4. Wyświetlany jest spinner
5. Nowe wyprawy są dołączane do listy

### 8.3 Paginacja (desktop - load more)

1. Użytkownik klika "Załaduj więcej"
2. Przycisk przechodzi w stan loading
3. Hook wywołuje `fetchNextPage()`
4. Nowe wyprawy są dołączane do listy
5. Przycisk znika jeśli `hasNextPage === false`

### 8.4 Quick Start (tworzenie wyprawy)

1. Użytkownik klika FAB "Nowa wyprawa" lub przycisk w EmptyState
2. Otwiera się `QuickStartSheet`
3. Użytkownik może zmodyfikować checkboxy (domyślnie zaznaczone)
4. Użytkownik klika "Rozpocznij wyprawę"
5. Wyświetlany jest stan loading na przycisku
6. Wywołanie API `POST /trips/quick-start`
7. Przy sukcesie:
   - Zamknięcie modalu
   - Wyświetlenie snackbar "Wyprawa rozpoczęta"
   - Nawigacja do `/app/trips/{id}`
8. Przy błędzie:
   - Wyświetlenie snackbar z błędem
   - Modal pozostaje otwarty

### 8.5 Nawigacja do szczegółów wyprawy

1. Użytkownik klika na `TripCard`
2. Nawigacja do `/app/trips/{id}`

### 8.6 Nawigacja do aktywnej wyprawy

1. Użytkownik klika `ActiveTripBanner` lub przycisk "Kontynuuj"
2. Nawigacja do `/app/trips/{id}` aktywnej wyprawy

### 8.7 Nawigacja główna

1. Użytkownik klika element nawigacji (BottomNavigation lub NavigationRail)
2. Nawigacja do odpowiedniej strony (`/app`, `/app/equipment`, `/app/profile`)

## 9. Warunki i walidacja

### 9.1 Walidacja API (po stronie serwera)

| Endpoint | Warunek | Błąd |
|----------|---------|------|
| GET /trips | `limit` 1-100 | 400 validation_error |
| GET /trips | `sort` musi być dozwolony | 400 validation_error |
| GET /trips | `order` musi być asc/desc | 400 validation_error |
| GET /trips | `cursor` musi być valid | 400 validation_error |
| POST /quick-start | `location.lat` musi być w zakresie -90 do 90 | 400 validation_error |
| POST /quick-start | `location.lng` musi być w zakresie -180 do 180 | 400 validation_error |
| POST /quick-start | `location.label` max 255 znaków | 400 validation_error |
| POST /quick-start | `copy_equipment_from_last_trip` required boolean | 400 validation_error |

### 9.2 Walidacja UI

Dashboard nie wymaga walidacji formularzy ze względu na brak inputów tekstowych. Checkboxy w QuickStartSheet są zawsze poprawne (boolean).

**Warunki wyświetlania komponentów:**

| Komponent | Warunek wyświetlenia |
|-----------|---------------------|
| `ActiveTripBanner` | `activeTrip !== null` |
| `TripList` | `trips.length > 0 && !isLoading` |
| `EmptyState` | `trips.length === 0 && !isLoading && !error` |
| `TripCardSkeleton[]` | `isLoading` |
| `LoadMoreButton` | `isDesktop && hasNextPage && !isFetchingNextPage` |
| `InfiniteScrollTrigger` | `isMobile && hasNextPage` |
| `ErrorBanner` | `error !== null` |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Błąd ładowania listy | Wyświetl ErrorBanner z przyciskiem "Spróbuj ponownie" |
| Błąd paginacji | Wyświetl snackbar, zachowaj istniejące dane |
| Błąd quick-start | Wyświetl snackbar z komunikatem błędu, zachowaj modal otwarty |

### 10.2 Błędy autoryzacji

| HTTP Status | Obsługa |
|-------------|---------|
| 401 Unauthorized | Redirect do `/auth/login`, wyczyść sesję |

### 10.3 Mapowanie kodów błędów API na komunikaty

```typescript
const errorMessages: Record<string, string> = {
  "unauthorized": "Sesja wygasła. Zaloguj się ponownie.",
  "validation_error": "Nieprawidłowe dane.",
  "not_found": "Zasób nie został znaleziony.",
  "conflict": "Wystąpił konflikt. Spróbuj ponownie.",
  "rate_limited": "Zbyt wiele prób. Poczekaj chwilę.",
  "internal_error": "Wystąpił błąd serwera. Spróbuj ponownie.",
};
```

### 10.4 Retry logic

- Lista wypraw: automatyczny retry przez TanStack Query (3 próby)
- Quick-start: brak automatycznego retry (użytkownik decyduje)

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

```
src/
├── pages/
│   └── app/
│       └── index.astro          # Strona dashboard
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── TopAppBar.tsx
│   │   ├── NavigationRail.tsx
│   │   ├── BottomNavigation.tsx
│   │   └── UserAvatarMenu.tsx
│   ├── trips/
│   │   ├── TripListSection.tsx
│   │   ├── TripList.tsx
│   │   ├── TripCard.tsx
│   │   ├── TripCardSkeleton.tsx
│   │   ├── ActiveTripBanner.tsx
│   │   ├── QuickStartFAB.tsx
│   │   └── QuickStartSheet.tsx
│   └── common/
│       ├── EmptyState.tsx
│       ├── LoadMoreButton.tsx
│       ├── InfiniteScrollTrigger.tsx
│       └── ErrorBanner.tsx
├── lib/
│   ├── hooks/
│   │   ├── useTripList.ts
│   │   ├── useQuickStartTrip.ts
│   │   └── useMediaQuery.ts
│   ├── api/
│   │   └── trips.ts            # Funkcje fetch dla API wypraw
│   └── utils/
│       └── tripFormatters.ts   # Funkcje formatowania dat, lokalizacji
```

### Krok 2: Implementacja funkcji pomocniczych

1. Utworzenie `src/lib/utils/tripFormatters.ts`:
   - `formatTripDate()` - formatowanie daty na polski format
   - `formatTimeRange()` - formatowanie zakresu godzin
   - `formatLocation()` - formatowanie lokalizacji
   - `getStatusLabel()` - mapowanie statusu na label PL
   - `toTripCardViewModel()` - transformacja DTO na ViewModel

### Krok 3: Implementacja funkcji API

1. Utworzenie `src/lib/api/trips.ts`:
   - `fetchTrips()` - pobieranie listy wypraw z paginacją
   - `quickStartTrip()` - tworzenie wyprawy przez quick-start

### Krok 4: Implementacja hooków

1. Utworzenie `src/lib/hooks/useMediaQuery.ts`
2. Utworzenie `src/lib/hooks/useTripList.ts`:
   - Użycie `useInfiniteQuery`
   - Konfiguracja paginacji kursorowej
   - Ekstrakcja aktywnej wyprawy
3. Utworzenie `src/lib/hooks/useQuickStartTrip.ts`:
   - Użycie `useMutation`
   - Invalidacja cache po sukcesie

### Krok 5: Implementacja komponentów layoutu

1. `TopAppBar` - z logo i UserAvatarMenu
2. `NavigationRail` - nawigacja desktop
3. `BottomNavigation` - nawigacja mobile
4. `AppLayout` - wrapper łączący powyższe

### Krok 6: Implementacja komponentów listy wypraw

1. `TripCardSkeleton` - skeleton loading
2. `TripCard` - karta pojedynczej wyprawy
3. `InfiniteScrollTrigger` - trigger infinite scroll
4. `LoadMoreButton` - przycisk paginacji
5. `TripList` - lista kart z paginacją
6. `EmptyState` - stan pusty
7. `ActiveTripBanner` - banner aktywnej wyprawy
8. `TripListSection` - sekcja zarządzająca stanem

### Krok 7: Implementacja QuickStart

1. `QuickStartFAB` - przycisk FAB
2. `QuickStartSheet` - modal z opcjami

### Krok 8: Integracja w stronie Astro

1. Utworzenie `src/pages/app/index.astro`
2. Import i użycie `AppLayout` z `client:load`
3. Import i użycie `TripListSection` z `client:load`
4. Konfiguracja TanStack Query Provider

### Krok 9: Testy i poprawki

1. Test responsywności (mobile 360px, desktop 1920px)
2. Test infinite scroll na mobile
3. Test load more na desktop
4. Test quick-start flow
5. Test obsługi błędów
6. Test empty state
7. Test active trip banner

### Krok 10: Optymalizacja

1. Lazy loading komponentów
2. Memoizacja komponentów (React.memo)
3. Optymalizacja re-renderów
4. Prefetching następnej strony

