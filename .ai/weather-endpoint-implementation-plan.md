# API Endpoint Implementation Plan: Weather Snapshots & Timeline

## 1. Przegląd punktu końcowego

Ten plan opisuje implementację zestawu endpointów zarządzania **snapshotami pogodowymi** dla wypraw wędkarskich. Snapshoty przechowują niezmienne historyczne dane pogodowe, umożliwiając analizę warunków panujących podczas połowu.

### Funkcjonalności:
- Listowanie snapshotów pogodowych dla wyprawy z filtrowaniem i paginacją
- Pobieranie szczegółów snapshotu z opcjonalnymi danymi godzinowymi
- Wyznaczanie "aktualnego" snapshotu (preferuj manual, potem najnowszy API)
- Automatyczne pobieranie pogody z zewnętrznego API (AccuWeather)
- Ręczne wprowadzanie danych pogodowych przez użytkownika
- Usuwanie snapshotów (z kaskadowym usunięciem hours)

### Endpointy:

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/trips/{tripId}/weather/snapshots` | Lista snapshotów dla wyprawy |
| GET | `/api/v1/weather/snapshots/{snapshotId}` | Szczegóły snapshotu |
| GET | `/api/v1/trips/{tripId}/weather/current` | Aktualnie wybrany snapshot |
| POST | `/api/v1/trips/{tripId}/weather/refresh` | Pobierz pogodę z API |
| POST | `/api/v1/trips/{tripId}/weather/manual` | Utwórz ręczny snapshot |
| DELETE | `/api/v1/weather/snapshots/{snapshotId}` | Usuń snapshot |

---

## 2. Szczegóły żądania

### 2.1 GET `/api/v1/trips/{tripId}/weather/snapshots` (Lista)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

**Parametry zapytania (query params):**

| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `source` | enum | Nie | - | Filtr źródła: `api`, `manual` |
| `limit` | number | Nie | `20` | Liczba wyników (1-100) |
| `cursor` | string | Nie | - | Kursor paginacji (opaque string) |
| `sort` | enum | Nie | `fetched_at` | Pole sortowania: `fetched_at`, `created_at` |
| `order` | enum | Nie | `desc` | Kierunek sortowania: `asc`, `desc` |

### 2.2 GET `/api/v1/weather/snapshots/{snapshotId}` (Szczegóły)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `snapshotId` | UUID | Tak | Identyfikator snapshotu |

**Parametry zapytania:**

| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `include_hours` | boolean | Nie | `false` | Czy dołączyć dane godzinowe |

### 2.3 GET `/api/v1/trips/{tripId}/weather/current` (Aktualny)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

Brak parametrów zapytania.

### 2.4 POST `/api/v1/trips/{tripId}/weather/refresh` (Odświeżenie z API)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

**Request Body:**

```json
{
  "period_start": "2025-12-12T10:00:00Z",
  "period_end": "2025-12-12T14:00:00Z",
  "force": false
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `period_start` | ISO datetime | Tak | Początek okresu pogodowego |
| `period_end` | ISO datetime | Tak | Koniec okresu pogodowego |
| `force` | boolean | Nie | Wymuś pobranie dla starszych wypraw (domyślnie `false`) |

### 2.5 POST `/api/v1/trips/{tripId}/weather/manual` (Ręczne wprowadzenie)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

**Request Body:**

```json
{
  "fetched_at": "2025-12-12T12:00:00Z",
  "period_start": "2025-12-12T10:00:00Z",
  "period_end": "2025-12-12T14:00:00Z",
  "hours": [
    {
      "observed_at": "2025-12-12T10:00:00Z",
      "temperature_c": 10.5,
      "pressure_hpa": 1015,
      "wind_speed_kmh": 12.0,
      "wind_direction": 180,
      "humidity_percent": 70,
      "precipitation_mm": 0.0,
      "cloud_cover": 30,
      "weather_icon": "cloud",
      "weather_text": "Cloudy"
    }
  ]
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `fetched_at` | ISO datetime | Tak | Czas pobrania/wprowadzenia danych |
| `period_start` | ISO datetime | Tak | Początek okresu pogodowego |
| `period_end` | ISO datetime | Tak | Koniec okresu pogodowego |
| `hours` | array | Tak | Tablica danych godzinowych (min. 1 element) |

**Struktura obiektu `hours[]`:**

| Pole | Typ | Wymagany | Constraints | Opis |
|------|-----|----------|-------------|------|
| `observed_at` | ISO datetime | Tak | - | Czas obserwacji |
| `temperature_c` | number | Nie | -100 do 100 | Temperatura w °C |
| `pressure_hpa` | integer | Nie | 800 do 1200 | Ciśnienie w hPa |
| `wind_speed_kmh` | number | Nie | >= 0 | Prędkość wiatru w km/h |
| `wind_direction` | integer | Nie | 0 do 360 | Kierunek wiatru w stopniach |
| `humidity_percent` | integer | Nie | 0 do 100 | Wilgotność w % |
| `precipitation_mm` | number | Nie | >= 0 | Opady w mm |
| `cloud_cover` | integer | Nie | 0 do 100 | Zachmurzenie w % |
| `weather_icon` | string | Nie | max 50 znaków | Ikona pogodowa |
| `weather_text` | string | Nie | max 255 znaków | Opis słowny pogody |

### 2.6 DELETE `/api/v1/weather/snapshots/{snapshotId}` (Usunięcie)

**Parametry ścieżki:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `snapshotId` | UUID | Tak | Identyfikator snapshotu |

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy z `src/types.ts`

**Entity Row Types (DB):**

```typescript
// Zdefiniowane w src/types.ts
type WeatherSnapshotSource = "api" | "manual";

interface WeatherSnapshotRow {
  id: UUID;
  trip_id: UUID;
  source: WeatherSnapshotSource;
  fetched_at: ISODateTime;
  period_start: ISODateTime;
  period_end: ISODateTime;
  created_at: ISODateTime;
}

interface WeatherHourRow {
  id: UUID;
  snapshot_id: UUID;
  observed_at: ISODateTime;
  temperature_c: number | null;
  pressure_hpa: number | null;
  wind_speed_kmh: number | null;
  wind_direction: number | null;
  humidity_percent: number | null;
  precipitation_mm: number | null;
  cloud_cover: number | null;
  weather_icon: string | null;
  weather_text: string | null;
  created_at: ISODateTime;
}
```

**DTOs (Response):**

```typescript
// Zdefiniowane w src/types.ts
type WeatherSnapshotDto = WeatherSnapshotRow;

type WeatherSnapshotListResponseDto = ListResponse<WeatherSnapshotDto>;

type WeatherSnapshotDetailDto = Pick<
  WeatherSnapshotRow,
  "id" | "trip_id" | "source" | "fetched_at" | "period_start" | "period_end"
>;

type WeatherHourDto = Omit<WeatherHourRow, "id" | "snapshot_id" | "created_at">;

interface WeatherSnapshotGetResponseDto {
  snapshot: WeatherSnapshotDetailDto;
  hours: WeatherHourDto[];
}

type TripWeatherCurrentResponseDto = {
  snapshot_id: UUID;
  source: WeatherSnapshotSource;
};

interface WeatherRefreshResponseDto {
  snapshot_id: UUID;
}

interface WeatherManualResponseDto {
  snapshot_id: UUID;
}
```

**Command Models (Request):**

```typescript
// Zdefiniowane w src/types.ts
interface WeatherRefreshCommand {
  period_start: ISODateTime;
  period_end: ISODateTime;
  force: boolean;
}

type WeatherManualHourCommand = Pick<
  WeatherHourDto,
  | "observed_at"
  | "temperature_c"
  | "pressure_hpa"
  | "wind_speed_kmh"
  | "wind_direction"
  | "humidity_percent"
  | "precipitation_mm"
  | "cloud_cover"
  | "weather_icon"
  | "weather_text"
>;

interface WeatherManualCommand {
  fetched_at: ISODateTime;
  period_start: ISODateTime;
  period_end: ISODateTime;
  hours: WeatherManualHourCommand[];
}
```

### 3.2 Nowe typy do utworzenia

**Plik: `src/lib/schemas/weather.schema.ts`**

```typescript
import { z } from "zod";

// Source enum
export const weatherSnapshotSourceSchema = z.enum(["api", "manual"]);

// Path params
export const tripIdParamSchema = z.object({
  tripId: z.string().uuid("Invalid trip UUID format"),
});

export const snapshotIdParamSchema = z.object({
  snapshotId: z.string().uuid("Invalid snapshot UUID format"),
});

// Query params dla listy snapshotów
export const weatherSnapshotListQuerySchema = z.object({
  source: weatherSnapshotSourceSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sort: z.enum(["fetched_at", "created_at"]).optional().default("fetched_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type WeatherSnapshotListQuery = z.infer<typeof weatherSnapshotListQuerySchema>;

// Query params dla szczegółów snapshotu
export const weatherSnapshotGetQuerySchema = z.object({
  include_hours: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("false"),
});

export type WeatherSnapshotGetQuery = z.infer<typeof weatherSnapshotGetQuerySchema>;

// Weather hour schema z constraints
export const weatherHourSchema = z.object({
  observed_at: z.string().datetime("Invalid datetime format for observed_at"),
  temperature_c: z.number().min(-100).max(100).nullable().optional(),
  pressure_hpa: z.number().int().min(800).max(1200).nullable().optional(),
  wind_speed_kmh: z.number().min(0).nullable().optional(),
  wind_direction: z.number().int().min(0).max(360).nullable().optional(),
  humidity_percent: z.number().int().min(0).max(100).nullable().optional(),
  precipitation_mm: z.number().min(0).nullable().optional(),
  cloud_cover: z.number().int().min(0).max(100).nullable().optional(),
  weather_icon: z.string().max(50).nullable().optional(),
  weather_text: z.string().max(255).nullable().optional(),
});

// Body dla refresh
export const weatherRefreshCommandSchema = z
  .object({
    period_start: z.string().datetime("Invalid datetime format for period_start"),
    period_end: z.string().datetime("Invalid datetime format for period_end"),
    force: z.boolean().optional().default(false),
  })
  .refine(
    (data) => new Date(data.period_end) >= new Date(data.period_start),
    { message: "period_end must be >= period_start", path: ["period_end"] }
  );

// Body dla manual
export const weatherManualCommandSchema = z
  .object({
    fetched_at: z.string().datetime("Invalid datetime format for fetched_at"),
    period_start: z.string().datetime("Invalid datetime format for period_start"),
    period_end: z.string().datetime("Invalid datetime format for period_end"),
    hours: z.array(weatherHourSchema).min(1, "At least one hour entry is required"),
  })
  .refine(
    (data) => new Date(data.period_end) >= new Date(data.period_start),
    { message: "period_end must be >= period_start", path: ["period_end"] }
  );
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET (Lista snapshotów) - 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "trip_id": "uuid",
      "source": "api",
      "fetched_at": "2025-12-12T12:00:00Z",
      "period_start": "2025-12-12T10:00:00Z",
      "period_end": "2025-12-12T14:00:00Z",
      "created_at": "2025-12-12T12:00:01Z"
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": "eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9"
  }
}
```

### 4.2 GET (Szczegóły snapshotu) - 200 OK

**Bez hours (domyślnie):**

```json
{
  "snapshot": {
    "id": "uuid",
    "trip_id": "uuid",
    "source": "manual",
    "fetched_at": "2025-12-12T12:00:00Z",
    "period_start": "2025-12-12T10:00:00Z",
    "period_end": "2025-12-12T14:00:00Z"
  },
  "hours": []
}
```

**Z hours (include_hours=true):**

```json
{
  "snapshot": {
    "id": "uuid",
    "trip_id": "uuid",
    "source": "manual",
    "fetched_at": "2025-12-12T12:00:00Z",
    "period_start": "2025-12-12T10:00:00Z",
    "period_end": "2025-12-12T14:00:00Z"
  },
  "hours": [
    {
      "observed_at": "2025-12-12T10:00:00Z",
      "temperature_c": 10.5,
      "pressure_hpa": 1015,
      "wind_speed_kmh": 12.0,
      "wind_direction": 180,
      "humidity_percent": 70,
      "precipitation_mm": 0.0,
      "cloud_cover": 30,
      "weather_icon": "cloud",
      "weather_text": "Cloudy"
    }
  ]
}
```

### 4.3 GET (Current snapshot) - 200 OK

```json
{
  "snapshot_id": "uuid",
  "source": "manual"
}
```

### 4.4 POST (Refresh) - 201 Created

```json
{
  "snapshot_id": "uuid"
}
```

### 4.5 POST (Manual) - 201 Created

```json
{
  "snapshot_id": "uuid"
}
```

### 4.6 DELETE - 204 No Content

Brak ciała odpowiedzi.

### 4.7 Błędy

```json
{
  "error": {
    "code": "validation_error",
    "message": "period_end must be >= period_start",
    "details": {
      "field": "period_end",
      "reason": "period_end must be >= period_start"
    }
  }
}
```

---

## 5. Przepływ danych

### 5.1 Architektura warstw

```
┌─────────────────────────────────────────────────────────────┐
│                    Astro API Routes                          │
│  src/pages/api/v1/trips/[tripId]/weather/...                │
│  src/pages/api/v1/weather/snapshots/[snapshotId]/...        │
├─────────────────────────────────────────────────────────────┤
│                    Validation Layer                          │
│              src/lib/schemas/weather.schema.ts              │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│              src/lib/services/weather.service.ts            │
├─────────────────────────────────────────────────────────────┤
│                Weather Provider Adapter                      │
│          src/lib/services/weather-provider.service.ts       │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                            │
│                  Supabase Client (RLS)                       │
│                   src/db/supabase.client.ts                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Przepływ dla GET (Lista snapshotów)

```
1. Request → Astro Route Handler
2. Walidacja path param (tripId) i query params (Zod)
3. Ekstrakcja user ID z context.locals.supabase
4. WeatherService.listSnapshots(supabase, tripId, query)
   a. Sprawdzenie czy trip istnieje i należy do użytkownika
   b. SELECT z weather_snapshots WHERE trip_id = ?
   c. Filtrowanie (source)
   d. Sortowanie (sort, order)
   e. Paginacja (cursor, limit)
5. Transformacja do DTO
6. Response 200 + JSON
```

### 5.3 Przepływ dla GET (Szczegóły snapshotu)

```
1. Request → Astro Route Handler
2. Walidacja path param (snapshotId) i query param (include_hours)
3. WeatherService.getSnapshotById(supabase, snapshotId, includeHours)
   a. SELECT snapshot WHERE id = ?
   b. RLS automatycznie weryfikuje właściciela przez JOIN z trips
   c. Jeśli include_hours: JOIN weather_hours
4. Sprawdzenie czy znaleziono (404 jeśli nie)
5. Transformacja do DTO
6. Response 200 + JSON
```

### 5.4 Przepływ dla GET (Current snapshot)

```
1. Request → Astro Route Handler
2. Walidacja path param (tripId)
3. WeatherService.getCurrentSnapshot(supabase, tripId)
   a. Sprawdzenie czy trip istnieje i należy do użytkownika
   b. SELECT snapshot WHERE trip_id = ? AND source = 'manual' 
      ORDER BY fetched_at DESC LIMIT 1
   c. Jeśli brak manual: SELECT WHERE source = 'api' 
      ORDER BY fetched_at DESC LIMIT 1
   d. Jeśli brak żadnego: 404 not_found
4. Response 200 + JSON { snapshot_id, source }
```

### 5.5 Przepływ dla POST (Refresh)

```
1. Request → Astro Route Handler
2. Walidacja path param (tripId) i body (Zod)
3. WeatherService.refreshWeather(supabase, tripId, command)
   a. Sprawdzenie czy trip istnieje i należy do użytkownika
   b. Sprawdzenie czy trip nie jest zbyt stary (24h) 
      chyba że force=true
   c. Pobranie lokalizacji z trips (location_lat, location_lng)
   d. Wywołanie WeatherProviderService.fetchWeather(location, period)
   e. Obsługa błędów zewnętrznego API (429, 502)
   f. INSERT do weather_snapshots (source='api')
   g. INSERT do weather_hours (dane godzinowe)
4. Response 201 + { snapshot_id }
```

### 5.6 Przepływ dla POST (Manual)

```
1. Request → Astro Route Handler
2. Walidacja path param (tripId) i body (Zod + hours constraints)
3. WeatherService.createManualSnapshot(supabase, tripId, command)
   a. Sprawdzenie czy trip istnieje i należy do użytkownika
   b. INSERT do weather_snapshots (source='manual')
   c. INSERT do weather_hours (dane godzinowe)
4. Response 201 + { snapshot_id }
```

### 5.7 Przepływ dla DELETE (Usunięcie)

```
1. Request → Astro Route Handler
2. Walidacja path param (snapshotId)
3. WeatherService.deleteSnapshot(supabase, snapshotId)
   a. DELETE FROM weather_snapshots WHERE id = ?
   b. RLS weryfikuje właściciela przez JOIN z trips
   c. CASCADE automatycznie usuwa weather_hours
4. Sprawdzenie czy usunięto (404 jeśli nie)
5. Response 204 No Content
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie

- Wszystkie endpointy wymagają ważnego tokenu JWT Supabase
- Token przekazywany w nagłówku `Authorization: Bearer <token>`
- Walidacja tokenu przez Supabase Client automatycznie
- Brak tokenu → 401 Unauthorized

### 6.2 Autoryzacja

- **Row Level Security (RLS)** na poziomie bazy danych
- Polityki RLS dla `weather_snapshots` sprawdzają właściciela przez JOIN z `trips`:
  ```sql
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = weather_snapshots.trip_id 
      AND trips.user_id = auth.uid()
      AND trips.deleted_at IS NULL
  )
  ```
- Polityki RLS dla `weather_hours` sprawdzają przez JOIN z `weather_snapshots` → `trips`
- Użytkownik widzi tylko swoje dane
- Próba dostępu do cudzych zasobów → 404 Not Found (nie 403, dla bezpieczeństwa)

### 6.3 Walidacja danych wejściowych

| Pole | Walidacja |
|------|-----------|
| `tripId` | Format UUID v4 |
| `snapshotId` | Format UUID v4 |
| `source` | Enum: `api`, `manual` |
| `period_start` | ISO 8601 datetime |
| `period_end` | ISO 8601 datetime, >= period_start |
| `fetched_at` | ISO 8601 datetime |
| `observed_at` | ISO 8601 datetime |
| `temperature_c` | Number -100 do 100 |
| `pressure_hpa` | Integer 800 do 1200 |
| `wind_speed_kmh` | Number >= 0 |
| `wind_direction` | Integer 0 do 360 |
| `humidity_percent` | Integer 0 do 100 |
| `precipitation_mm` | Number >= 0 |
| `cloud_cover` | Integer 0 do 100 |
| `weather_icon` | String max 50 |
| `weather_text` | String max 255 |
| `limit` | Integer 1-100 |
| `sort` | Enum: `fetched_at`, `created_at` |
| `order` | Enum: `asc`, `desc` |
| `hours` | Array min 1 element |

### 6.4 Walidacja biznesowa

- `period_end >= period_start` (CHECK constraint + Zod)
- Wyprawa musi istnieć i nie być soft-deleted
- Dla refresh: wyprawa w ciągu ostatnich 24h (chyba że force=true)
- Dla refresh: wyprawa musi mieć lokalizację (lat/lng)

### 6.5 Ochrona przed atakami

| Zagrożenie | Mitygacja |
|------------|-----------|
| SQL Injection | Parametryzowane zapytania przez Supabase Client |
| XSS | Dane zwracane jako JSON, bez renderowania HTML |
| CSRF | Brak cookies sesyjnych, JWT w nagłówku |
| Mass Assignment | Explicite wybieranie pól przez Zod schema |
| IDOR | RLS + walidacja właściciela na poziomie DB |
| Rate Limit Bypass | Rate limiting na poziomie API (zewnętrzny provider) |
| DoS przez refresh | Limit zapytań do zewnętrznego API + caching |

### 6.6 Ochrona zewnętrznego API

- Rate limiting zapytań do AccuWeather (np. max 1 refresh/min/user)
- Caching odpowiedzi (opcjonalnie)
- Graceful degradation przy niedostępności API (502)
- Timeout dla zapytań zewnętrznych (np. 10s)

---

## 7. Obsługa błędów

### 7.1 Tabela błędów

| Scenariusz | HTTP Status | Kod błędu | Wiadomość |
|------------|-------------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | `unauthorized` | Authentication required |
| Nieprawidłowy token | 401 | `unauthorized` | Invalid or expired token |
| Nieprawidłowy format UUID (tripId) | 400 | `validation_error` | Invalid trip UUID format |
| Nieprawidłowy format UUID (snapshotId) | 400 | `validation_error` | Invalid snapshot UUID format |
| Nieprawidłowy format daty | 400 | `validation_error` | Invalid datetime format |
| period_end < period_start | 400 | `validation_error` | period_end must be >= period_start |
| Nieprawidłowy source | 400 | `validation_error` | Invalid source value |
| temperature_c poza zakresem | 400 | `validation_error` | temperature_c must be between -100 and 100 |
| pressure_hpa poza zakresem | 400 | `validation_error` | pressure_hpa must be between 800 and 1200 |
| Pusta tablica hours | 400 | `validation_error` | At least one hour entry is required |
| Trip nie znaleziony | 404 | `not_found` | Trip not found |
| Snapshot nie znaleziony | 404 | `not_found` | Weather snapshot not found |
| Brak snapshotów dla current | 404 | `not_found` | No weather snapshots found for this trip |
| Trip zbyt stary dla auto-fetch | 400 | `validation_error` | Trip is older than 24h, use force=true or manual entry |
| Trip bez lokalizacji dla refresh | 400 | `validation_error` | Trip must have location for weather refresh |
| Rate limit zewnętrznego API | 429 | `rate_limited` | Weather provider rate limit exceeded |
| Błąd zewnętrznego API | 502 | `bad_gateway` | Weather provider error |
| Błąd serwera | 500 | `internal_error` | Internal server error |

### 7.2 Format odpowiedzi błędu

```typescript
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      field?: string;
      reason?: string;
    };
  };
}
```

### 7.3 Mapowanie błędów Supabase

```typescript
function mapSupabaseError(error: PostgrestError): { code: string; message: string; status: number } {
  // Constraint violations
  if (error.code === "23514") { // CHECK violation
    return { code: "validation_error", message: "Database constraint violation", status: 400 };
  }
  
  // Not found (single row expected)
  if (error.code === "PGRST116") {
    return { code: "not_found", message: "Resource not found", status: 404 };
  }
  
  // RLS violation (no rows affected/returned)
  if (error.code === "42501") {
    return { code: "not_found", message: "Resource not found", status: 404 };
  }
  
  // Foreign key violation
  if (error.code === "23503") {
    return { code: "validation_error", message: "Referenced resource not found", status: 400 };
  }
  
  // Default
  return { code: "internal_error", message: "Internal server error", status: 500 };
}
```

### 7.4 Mapowanie błędów Weather Provider

```typescript
function mapWeatherProviderError(error: WeatherProviderError): { code: string; message: string; status: number } {
  if (error.status === 429) {
    return { code: "rate_limited", message: "Weather provider rate limit exceeded", status: 429 };
  }
  
  if (error.status >= 500) {
    return { code: "bad_gateway", message: "Weather provider error", status: 502 };
  }
  
  if (error.status === 401 || error.status === 403) {
    // Config error - log and return generic error
    console.error("Weather API authentication error:", error);
    return { code: "bad_gateway", message: "Weather provider configuration error", status: 502 };
  }
  
  return { code: "bad_gateway", message: "Weather provider error", status: 502 };
}
```

### 7.5 Logowanie błędów

- Błędy 5xx logowane z pełnym stack trace i request ID
- Błędy 4xx logowane jako info z request ID
- Błędy zewnętrznego API logowane z context (endpoint, status, response)
- Użycie `console.error` dla błędów krytycznych
- Sanityzacja danych użytkownika przed logowaniem

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

Zgodnie z `db-plan.md`, wykorzystywane są następujące indeksy:

```sql
-- Weather snapshots: per wyprawa
CREATE INDEX idx_weather_snapshots_trip 
    ON weather_snapshots (trip_id);

-- Weather hours: per snapshot + czas
CREATE INDEX idx_weather_hours_snapshot_observed 
    ON weather_hours (snapshot_id, observed_at);

-- Unique constraint (also serves as index)
CONSTRAINT weather_hours_unique UNIQUE (snapshot_id, observed_at)
```

### 8.2 Optymalizacja zapytań

#### Lista snapshotów

```sql
SELECT 
  id, trip_id, source, fetched_at, period_start, period_end, created_at
FROM weather_snapshots
WHERE trip_id = :tripId
  AND (:source IS NULL OR source = :source)
ORDER BY fetched_at DESC, id DESC
LIMIT :limit + 1;
```

#### Szczegóły snapshotu z hours

Użyj Supabase nested select dla uniknięcia N+1:

```typescript
const { data } = await supabase
  .from("weather_snapshots")
  .select(`
    id, trip_id, source, fetched_at, period_start, period_end,
    weather_hours (
      observed_at, temperature_c, pressure_hpa, wind_speed_kmh,
      wind_direction, humidity_percent, precipitation_mm,
      cloud_cover, weather_icon, weather_text
    )
  `)
  .eq("id", snapshotId)
  .single();
```

#### Current snapshot (preferuj manual)

```typescript
// Najpierw szukaj manual
const { data: manual } = await supabase
  .from("weather_snapshots")
  .select("id, source")
  .eq("trip_id", tripId)
  .eq("source", "manual")
  .order("fetched_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (manual) return manual;

// Fallback do API
const { data: api } = await supabase
  .from("weather_snapshots")
  .select("id, source")
  .eq("trip_id", tripId)
  .eq("source", "api")
  .order("fetched_at", { ascending: false })
  .limit(1)
  .maybeSingle();

return api;
```

### 8.3 Paginacja kursorowa

- Używana dla listy snapshotów (potencjalnie wiele na wyprawę)
- Kursor koduje `{sortValue, id}` w base64
- Stabilna wydajność niezależnie od offsetu
- Wykorzystuje indeks `idx_weather_snapshots_trip`

### 8.4 Caching zewnętrznego API

- Opcjonalnie: cache odpowiedzi AccuWeather w pamięci/Redis
- TTL: np. 15 minut dla danych pogodowych
- Key: `weather:{lat}:{lng}:{period_start}:{period_end}`

### 8.5 Batch insert dla hours

```typescript
// Zamiast pojedynczych insertów
const hourInserts = command.hours.map((hour) => ({
  snapshot_id: snapshotId,
  ...hour,
}));

await supabase.from("weather_hours").insert(hourInserts);
```

### 8.6 Limity

| Parametr | Wartość | Uzasadnienie |
|----------|---------|--------------|
| Domyślny limit snapshotów | 20 | Typowy rozmiar strony |
| Maksymalny limit | 100 | Ochrona przed DoS |
| Max hours per snapshot | 168 | Tygodniowa wyprawa, dane godzinowe |
| Weather API timeout | 10s | Unikanie długich oczekiwań |
| Max trip age for auto-fetch | 24h | Ograniczenie API pogodowego |

---

## 9. Etapy wdrożenia

### Etap 1: Struktura plików i konfiguracja

1. **Utworzenie struktury katalogów:**

   ```
   src/
   ├── lib/
   │   ├── schemas/
   │   │   └── weather.schema.ts
   │   └── services/
   │       ├── weather.service.ts
   │       └── weather-provider.service.ts
   └── pages/
       └── api/
           └── v1/
               ├── trips/
               │   └── [tripId]/
               │       └── weather/
               │           ├── snapshots.ts     # GET list
               │           ├── current.ts       # GET current
               │           ├── refresh.ts       # POST refresh
               │           └── manual.ts        # POST manual
               └── weather/
                   └── snapshots/
                       └── [snapshotId]/
                           └── index.ts         # GET details, DELETE
   ```

### Etap 2: Implementacja schematów walidacji

**Plik: `src/lib/schemas/weather.schema.ts`**

Utworzenie wszystkich schematów Zod opisanych w sekcji 3.2:
- `weatherSnapshotSourceSchema`
- `tripIdParamSchema`
- `snapshotIdParamSchema`
- `weatherSnapshotListQuerySchema`
- `weatherSnapshotGetQuerySchema`
- `weatherHourSchema`
- `weatherRefreshCommandSchema`
- `weatherManualCommandSchema`

### Etap 3: Implementacja Weather Provider Service

**Plik: `src/lib/services/weather-provider.service.ts`**

```typescript
import type { WeatherHourDto } from "@/types";

interface WeatherProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

interface FetchWeatherParams {
  lat: number;
  lng: number;
  periodStart: string;
  periodEnd: string;
}

interface WeatherProviderResult {
  hours: WeatherHourDto[];
}

interface WeatherProviderError {
  status: number;
  message: string;
}

export class WeatherProviderService {
  private config: WeatherProviderConfig;

  constructor(config: WeatherProviderConfig) {
    this.config = config;
  }

  async fetchWeather(params: FetchWeatherParams): Promise<{
    data?: WeatherProviderResult;
    error?: WeatherProviderError;
  }> {
    // Implementacja integracji z AccuWeather API
    // 1. Pobierz location key dla współrzędnych
    // 2. Pobierz historical data dla location key
    // 3. Mapuj odpowiedź na WeatherHourDto[]
    // 4. Obsłuż błędy (rate limit, timeout, etc.)
  }

  private mapAccuWeatherResponse(response: AccuWeatherResponse): WeatherHourDto[] {
    // Mapowanie formatu AccuWeather na wewnętrzny format
  }
}

// Singleton dla współdzielenia konfiguracji
let instance: WeatherProviderService | null = null;

export function getWeatherProvider(): WeatherProviderService {
  if (!instance) {
    instance = new WeatherProviderService({
      apiKey: import.meta.env.ACCUWEATHER_API_KEY,
      baseUrl: import.meta.env.ACCUWEATHER_BASE_URL || "https://dataservice.accuweather.com",
      timeout: 10000,
    });
  }
  return instance;
}
```

### Etap 4: Implementacja serwisu Weather

**Plik: `src/lib/services/weather.service.ts`**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  WeatherSnapshotListResponseDto,
  WeatherSnapshotGetResponseDto,
  TripWeatherCurrentResponseDto,
  WeatherRefreshResponseDto,
  WeatherManualResponseDto,
  WeatherRefreshCommand,
  WeatherManualCommand,
} from "@/types";
import type { WeatherSnapshotListQuery } from "@/lib/schemas/weather.schema";
import { getWeatherProvider } from "./weather-provider.service";

interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string; status: number };
}

export class WeatherService {
  constructor(private supabase: SupabaseClient) {}

  async listSnapshots(
    tripId: string,
    params: WeatherSnapshotListQuery
  ): Promise<ServiceResult<WeatherSnapshotListResponseDto>> {
    // 1. Sprawdź czy trip istnieje (RLS automatycznie)
    // 2. Pobierz snapshoty z filtrowaniem
    // 3. Paginacja kursorowa
    // 4. Transformacja do DTO
  }

  async getSnapshotById(
    snapshotId: string,
    includeHours: boolean
  ): Promise<ServiceResult<WeatherSnapshotGetResponseDto>> {
    // 1. Pobierz snapshot (RLS przez trips)
    // 2. Opcjonalnie pobierz hours
    // 3. Transformacja do DTO
  }

  async getCurrentSnapshot(
    tripId: string
  ): Promise<ServiceResult<TripWeatherCurrentResponseDto>> {
    // 1. Sprawdź czy trip istnieje
    // 2. Szukaj manual snapshot
    // 3. Fallback do API snapshot
    // 4. Zwróć 404 jeśli brak
  }

  async refreshWeather(
    tripId: string,
    command: WeatherRefreshCommand
  ): Promise<ServiceResult<WeatherRefreshResponseDto>> {
    // 1. Pobierz trip (lokalizacja, daty)
    // 2. Walidacja: trip nie starszy niż 24h (chyba że force)
    // 3. Walidacja: trip ma lokalizację
    // 4. Wywołaj WeatherProviderService
    // 5. Zapisz snapshot + hours
    // 6. Zwróć snapshot_id
  }

  async createManualSnapshot(
    tripId: string,
    command: WeatherManualCommand
  ): Promise<ServiceResult<WeatherManualResponseDto>> {
    // 1. Sprawdź czy trip istnieje
    // 2. INSERT snapshot (source='manual')
    // 3. INSERT hours
    // 4. Zwróć snapshot_id
  }

  async deleteSnapshot(snapshotId: string): Promise<ServiceResult<void>> {
    // 1. DELETE snapshot (RLS + CASCADE)
    // 2. Sprawdź czy usunięto
  }

  // Private helpers
  private async verifyTripExists(tripId: string): Promise<{
    exists: boolean;
    trip?: { location_lat: number | null; location_lng: number | null; started_at: string };
  }> {
    // Weryfikacja istnienia i pobranie danych
  }

  private async verifyTripForRefresh(
    tripId: string,
    force: boolean
  ): Promise<ServiceResult<{ lat: number; lng: number }>> {
    // Weryfikacja lokalizacji i wieku
  }
}
```

### Etap 5: Implementacja endpointów API

#### 5.1 GET `/api/v1/trips/[tripId]/weather/snapshots.ts`

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, weatherSnapshotListQuerySchema } from "@/lib/schemas/weather.schema";
import { WeatherService } from "@/lib/services/weather.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // Validate path param
  const pathResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  // Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryResult = weatherSnapshotListQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    const firstError = queryResult.error.errors[0];
    return createErrorResponse("validation_error", firstError.message, 400, {
      field: firstError.path.join("."),
    });
  }

  const service = new WeatherService(supabase);
  const result = await service.listSnapshots(pathResult.data.tripId, queryResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};
```

#### 5.2 GET `/api/v1/trips/[tripId]/weather/current.ts`

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema } from "@/lib/schemas/weather.schema";
import { WeatherService } from "@/lib/services/weather.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const pathResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  const service = new WeatherService(supabase);
  const result = await service.getCurrentSnapshot(pathResult.data.tripId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};
```

#### 5.3 POST `/api/v1/trips/[tripId]/weather/refresh.ts`

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, weatherRefreshCommandSchema } from "@/lib/schemas/weather.schema";
import { WeatherService } from "@/lib/services/weather.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const POST: APIRoute = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const pathResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  const bodyResult = weatherRefreshCommandSchema.safeParse(body);
  if (!bodyResult.success) {
    const firstError = bodyResult.error.errors[0];
    return createErrorResponse("validation_error", firstError.message, 400, {
      field: firstError.path.join("."),
      reason: firstError.message,
    });
  }

  const service = new WeatherService(supabase);
  const result = await service.refreshWeather(pathResult.data.tripId, bodyResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data, 201);
};
```

#### 5.4 POST `/api/v1/trips/[tripId]/weather/manual.ts`

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, weatherManualCommandSchema } from "@/lib/schemas/weather.schema";
import { WeatherService } from "@/lib/services/weather.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const POST: APIRoute = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const pathResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  const bodyResult = weatherManualCommandSchema.safeParse(body);
  if (!bodyResult.success) {
    const firstError = bodyResult.error.errors[0];
    return createErrorResponse("validation_error", firstError.message, 400, {
      field: firstError.path.join("."),
      reason: firstError.message,
    });
  }

  const service = new WeatherService(supabase);
  const result = await service.createManualSnapshot(pathResult.data.tripId, bodyResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data, 201);
};
```

#### 5.5 GET/DELETE `/api/v1/weather/snapshots/[snapshotId]/index.ts`

```typescript
import type { APIRoute } from "astro";
import { snapshotIdParamSchema, weatherSnapshotGetQuerySchema } from "@/lib/schemas/weather.schema";
import { WeatherService } from "@/lib/services/weather.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const pathResult = snapshotIdParamSchema.safeParse({ snapshotId: params.snapshotId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid snapshot UUID format", 400, { field: "snapshotId" });
  }

  const queryParams = Object.fromEntries(url.searchParams);
  const queryResult = weatherSnapshotGetQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    return createErrorResponse("validation_error", queryResult.error.errors[0].message, 400);
  }

  const service = new WeatherService(supabase);
  const result = await service.getSnapshotById(
    pathResult.data.snapshotId,
    queryResult.data.include_hours
  );

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const pathResult = snapshotIdParamSchema.safeParse({ snapshotId: params.snapshotId });
  if (!pathResult.success) {
    return createErrorResponse("validation_error", "Invalid snapshot UUID format", 400, { field: "snapshotId" });
  }

  const service = new WeatherService(supabase);
  const result = await service.deleteSnapshot(pathResult.data.snapshotId);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return new Response(null, { status: 204 });
};
```

### Etap 6: Implementacja szczegółowej logiki serwisu

#### 6.1 Metoda `listSnapshots`

```typescript
async listSnapshots(
  tripId: string,
  params: WeatherSnapshotListQuery
): Promise<ServiceResult<WeatherSnapshotListResponseDto>> {
  const { source, limit, cursor, sort, order } = params;

  // Buduj zapytanie
  let query = this.supabase
    .from("weather_snapshots")
    .select("id, trip_id, source, fetched_at, period_start, period_end, created_at")
    .eq("trip_id", tripId);

  // Filtrowanie
  if (source) {
    query = query.eq("source", source);
  }

  // Sortowanie (z tiebreaker na id)
  query = query
    .order(sort, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" });

  // Paginacja kursorowa
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      return { error: { code: "validation_error", message: "Invalid cursor", status: 400 } };
    }
    const op = order === "asc" ? "gt" : "lt";
    query = query.or(
      `${sort}.${op}.${cursorData.sortValue},and(${sort}.eq.${cursorData.sortValue},id.${op}.${cursorData.id})`
    );
  }

  query = query.limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    // Brak danych = trip nie istnieje lub RLS odmowa
    if (error.code === "PGRST116") {
      return { error: { code: "not_found", message: "Trip not found", status: 404 } };
    }
    return { error: { code: "internal_error", message: error.message, status: 500 } };
  }

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor({
      sortValue: String(lastItem[sort]),
      id: lastItem.id,
    });
  }

  return {
    data: {
      data: items,
      page: { limit, next_cursor: nextCursor },
    },
  };
}
```

#### 6.2 Metoda `getCurrentSnapshot`

```typescript
async getCurrentSnapshot(
  tripId: string
): Promise<ServiceResult<TripWeatherCurrentResponseDto>> {
  // Najpierw sprawdź czy trip istnieje
  const { data: trip, error: tripError } = await this.supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .is("deleted_at", null)
    .maybeSingle();

  if (tripError || !trip) {
    return { error: { code: "not_found", message: "Trip not found", status: 404 } };
  }

  // Szukaj manual snapshot
  const { data: manual } = await this.supabase
    .from("weather_snapshots")
    .select("id, source")
    .eq("trip_id", tripId)
    .eq("source", "manual")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (manual) {
    return {
      data: { snapshot_id: manual.id, source: manual.source },
    };
  }

  // Fallback do API snapshot
  const { data: apiSnapshot } = await this.supabase
    .from("weather_snapshots")
    .select("id, source")
    .eq("trip_id", tripId)
    .eq("source", "api")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (apiSnapshot) {
    return {
      data: { snapshot_id: apiSnapshot.id, source: apiSnapshot.source },
    };
  }

  return {
    error: { code: "not_found", message: "No weather snapshots found for this trip", status: 404 },
  };
}
```

#### 6.3 Metoda `refreshWeather`

```typescript
async refreshWeather(
  tripId: string,
  command: WeatherRefreshCommand
): Promise<ServiceResult<WeatherRefreshResponseDto>> {
  // 1. Pobierz trip z lokalizacją
  const { data: trip, error: tripError } = await this.supabase
    .from("trips")
    .select("id, location_lat, location_lng, started_at")
    .eq("id", tripId)
    .is("deleted_at", null)
    .maybeSingle();

  if (tripError || !trip) {
    return { error: { code: "not_found", message: "Trip not found", status: 404 } };
  }

  // 2. Sprawdź lokalizację
  if (trip.location_lat === null || trip.location_lng === null) {
    return {
      error: {
        code: "validation_error",
        message: "Trip must have location for weather refresh",
        status: 400,
      },
    };
  }

  // 3. Sprawdź wiek wyprawy (24h limit, chyba że force)
  const tripAge = Date.now() - new Date(trip.started_at).getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24h in ms

  if (tripAge > maxAge && !command.force) {
    return {
      error: {
        code: "validation_error",
        message: "Trip is older than 24h, use force=true or manual entry",
        status: 400,
      },
    };
  }

  // 4. Pobierz dane z Weather Provider
  const weatherProvider = getWeatherProvider();
  const weatherResult = await weatherProvider.fetchWeather({
    lat: trip.location_lat,
    lng: trip.location_lng,
    periodStart: command.period_start,
    periodEnd: command.period_end,
  });

  if (weatherResult.error) {
    return {
      error: mapWeatherProviderError(weatherResult.error),
    };
  }

  // 5. Zapisz snapshot
  const { data: snapshot, error: snapshotError } = await this.supabase
    .from("weather_snapshots")
    .insert({
      trip_id: tripId,
      source: "api",
      fetched_at: new Date().toISOString(),
      period_start: command.period_start,
      period_end: command.period_end,
    })
    .select("id")
    .single();

  if (snapshotError) {
    console.error("Failed to create weather snapshot:", snapshotError);
    return { error: { code: "internal_error", message: "Failed to save weather data", status: 500 } };
  }

  // 6. Zapisz hours (batch)
  if (weatherResult.data && weatherResult.data.hours.length > 0) {
    const hourInserts = weatherResult.data.hours.map((hour) => ({
      snapshot_id: snapshot.id,
      ...hour,
    }));

    const { error: hoursError } = await this.supabase.from("weather_hours").insert(hourInserts);

    if (hoursError) {
      console.error("Failed to create weather hours:", hoursError);
      // Snapshot został utworzony - loguj błąd, ale zwróć snapshot_id
    }
  }

  return {
    data: { snapshot_id: snapshot.id },
  };
}
```

#### 6.4 Metoda `createManualSnapshot`

```typescript
async createManualSnapshot(
  tripId: string,
  command: WeatherManualCommand
): Promise<ServiceResult<WeatherManualResponseDto>> {
  // 1. Sprawdź czy trip istnieje
  const { data: trip, error: tripError } = await this.supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .is("deleted_at", null)
    .maybeSingle();

  if (tripError || !trip) {
    return { error: { code: "not_found", message: "Trip not found", status: 404 } };
  }

  // 2. Utwórz snapshot
  const { data: snapshot, error: snapshotError } = await this.supabase
    .from("weather_snapshots")
    .insert({
      trip_id: tripId,
      source: "manual",
      fetched_at: command.fetched_at,
      period_start: command.period_start,
      period_end: command.period_end,
    })
    .select("id")
    .single();

  if (snapshotError) {
    if (snapshotError.code === "23514") { // CHECK violation
      return {
        error: { code: "validation_error", message: "Invalid period range", status: 400 },
      };
    }
    console.error("Failed to create manual weather snapshot:", snapshotError);
    return { error: { code: "internal_error", message: "Failed to save weather data", status: 500 } };
  }

  // 3. Utwórz hours (batch)
  const hourInserts = command.hours.map((hour) => ({
    snapshot_id: snapshot.id,
    observed_at: hour.observed_at,
    temperature_c: hour.temperature_c ?? null,
    pressure_hpa: hour.pressure_hpa ?? null,
    wind_speed_kmh: hour.wind_speed_kmh ?? null,
    wind_direction: hour.wind_direction ?? null,
    humidity_percent: hour.humidity_percent ?? null,
    precipitation_mm: hour.precipitation_mm ?? null,
    cloud_cover: hour.cloud_cover ?? null,
    weather_icon: hour.weather_icon ?? null,
    weather_text: hour.weather_text ?? null,
  }));

  const { error: hoursError } = await this.supabase.from("weather_hours").insert(hourInserts);

  if (hoursError) {
    console.error("Failed to create manual weather hours:", hoursError);
    // Rollback: usuń snapshot
    await this.supabase.from("weather_snapshots").delete().eq("id", snapshot.id);
    
    if (hoursError.code === "23514") { // CHECK violation
      return {
        error: { code: "validation_error", message: "Invalid weather data values", status: 400 },
      };
    }
    return { error: { code: "internal_error", message: "Failed to save weather data", status: 500 } };
  }

  return {
    data: { snapshot_id: snapshot.id },
  };
}
```

### Etap 7: Helper funkcje

**Plik: `src/lib/api/response.ts`** (jeśli nie istnieje)

```typescript
import type { ApiErrorCode, ApiErrorResponse } from "@/types";

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: { field?: string; reason?: string }
): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Plik: `src/lib/utils/cursor.ts`**

```typescript
interface CursorData {
  sortValue: string;
  id: string;
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const data = JSON.parse(decoded);
    if (typeof data.sortValue === "string" && typeof data.id === "string") {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
```

### Etap 8: Konfiguracja zmiennych środowiskowych

**Plik: `.env.example`** (dodaj):

```env
# AccuWeather API
ACCUWEATHER_API_KEY=your_api_key_here
ACCUWEATHER_BASE_URL=https://dataservice.accuweather.com
```

**Plik: `src/env.d.ts`** (rozszerz):

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ACCUWEATHER_API_KEY: string;
  readonly ACCUWEATHER_BASE_URL?: string;
  // ... inne zmienne
}
```

### Etap 9: Testowanie

1. **Testy manualne:**
   - Weryfikacja wszystkich endpointów przez REST client (Postman/Insomnia)
   - Testowanie przypadków brzegowych
   - Weryfikacja RLS (próba dostępu do cudzych zasobów)
   - Testowanie integracji z AccuWeather (jeśli dostępne)

2. **Scenariusze testowe:**

   **Lista snapshotów:**
   - ✅ Zwraca listę snapshotów dla istniejącej wyprawy
   - ✅ Filtruje po source (api/manual)
   - ✅ Sortuje po fetched_at i created_at
   - ✅ Paginacja kursorowa działa poprawnie
   - ✅ Zwraca 404 dla nieistniejącej wyprawy

   **Szczegóły snapshotu:**
   - ✅ Zwraca snapshot bez hours (domyślnie)
   - ✅ Zwraca snapshot z hours (include_hours=true)
   - ✅ Zwraca 404 dla nieistniejącego snapshotu

   **Current snapshot:**
   - ✅ Preferuje manual nad api
   - ✅ Zwraca najnowszy snapshot danego typu
   - ✅ Zwraca 404 gdy brak snapshotów

   **Refresh:**
   - ✅ Tworzy snapshot + hours z API
   - ✅ Odmawia dla wyprawy bez lokalizacji
   - ✅ Odmawia dla wyprawy starszej niż 24h (bez force)
   - ✅ Akceptuje starą wyprawę z force=true
   - ✅ Obsługuje błędy zewnętrznego API (429, 502)

   **Manual:**
   - ✅ Tworzy snapshot z danymi użytkownika
   - ✅ Waliduje zakresy pól (temperature, pressure, etc.)
   - ✅ Odmawia pustej tablicy hours
   - ✅ Odmawia period_end < period_start

   **Delete:**
   - ✅ Usuwa snapshot i kaskadowo hours
   - ✅ Zwraca 204 No Content
   - ✅ Zwraca 404 dla nieistniejącego snapshotu

---

## 10. Podsumowanie

Plan implementacji obejmuje kompletny zestaw endpointów zarządzania snapshotami pogodowymi. Kluczowe aspekty:

- **Złożona integracja**: Komunikacja z zewnętrznym API pogodowym (AccuWeather)
- **Logika biznesowa**: Preferowanie manual snapshots, ograniczenia czasowe
- **Bezpieczeństwo**: RLS + walidacja Zod + JWT + izolacja danych
- **Wydajność**: Indeksy DB + batch insert + paginacja kursorowa
- **Odporność na błędy**: Graceful handling błędów zewnętrznego API

**Estymowany czas implementacji:** 3-4 dni dla doświadczonego developera

**Zależności:**
- Wymaga wcześniejszej implementacji middleware Supabase
- Wymaga helperów API response (może reużyć z innych modułów)
- Wymaga konfiguracji AccuWeather API key
- Wymaga istniejących tabel DB (trips, weather_snapshots, weather_hours)

**Priorytety implementacji:**
1. Schematy walidacji (weather.schema.ts)
2. Serwis Weather (weather.service.ts) - metody CRUD
3. Endpointy listy, szczegółów, current, manual, delete
4. Weather Provider Service (integracja AccuWeather)
5. Endpoint refresh (wymaga weather provider)
6. Testy i dokumentacja

