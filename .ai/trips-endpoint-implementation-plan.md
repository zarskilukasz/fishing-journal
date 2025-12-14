# API Endpoint Implementation Plan: Trips (CRUD + Lifecycle)

## 1. Przegląd punktu końcowego

Ten plan opisuje implementację zestawu endpointów zarządzania **wyprawami wędkarskimi (trips)**. Wyprawy są centralnym elementem aplikacji, łączącym użytkownika ze sprzętem, połowami i danymi pogodowymi.

### Funkcjonalności:
- Listowanie wypraw z filtrowaniem, paginacją i sortowaniem
- Tworzenie nowej wyprawy z opcjonalnym kopiowaniem sprzętu z ostatniej wyprawy
- Szybkie rozpoczęcie wyprawy jednym kliknięciem (Quick Start)
- Pobieranie szczegółów wyprawy z opcjonalnymi relacjami (catches, equipment, weather)
- Aktualizacja wyprawy (częściowa)
- Zamykanie wyprawy (lifecycle operation)
- Soft-delete wyprawy

### Endpointy:

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/trips` | Lista wypraw (dashboard) |
| POST | `/api/v1/trips` | Utwórz wyprawę |
| POST | `/api/v1/trips/quick-start` | Szybkie rozpoczęcie wyprawy |
| GET | `/api/v1/trips/{id}` | Pobierz szczegóły wyprawy |
| PATCH | `/api/v1/trips/{id}` | Aktualizuj wyprawę |
| POST | `/api/v1/trips/{id}/close` | Zakończ wyprawę |
| DELETE | `/api/v1/trips/{id}` | Soft-delete wyprawy |

---

## 2. Szczegóły żądania

### 2.1 GET `/api/v1/trips` (Lista)

**Parametry zapytania (query params):**

| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `status` | enum | Nie | - | Filtr statusu: `draft`, `active`, `closed` |
| `from` | ISO date | Nie | - | Początek zakresu dat (na `started_at`) |
| `to` | ISO date | Nie | - | Koniec zakresu dat (na `started_at`) |
| `include_deleted` | boolean | Nie | `false` | Czy uwzględnić soft-deleted wyprawy |
| `limit` | number | Nie | `20` | Liczba wyników (1-100) |
| `cursor` | string | Nie | - | Kursor paginacji (opaque string) |
| `sort` | enum | Nie | `started_at` | Pole sortowania: `started_at`, `created_at`, `updated_at` |
| `order` | enum | Nie | `desc` | Kierunek sortowania: `asc`, `desc` |

### 2.2 POST `/api/v1/trips` (Tworzenie)

**Request Body:**
```json
{
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": null,
  "status": "active",
  "location": {
    "lat": 52.1,
    "lng": 21.0,
    "label": "Lake XYZ"
  },
  "copy_equipment_from_last_trip": true
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `started_at` | ISO datetime | Tak | Data i czas rozpoczęcia |
| `ended_at` | ISO datetime | Nie | Data i czas zakończenia (null jeśli trwa) |
| `status` | enum | Tak | Status: `draft`, `active`, `closed` |
| `location` | object/null | Nie | Lokalizacja wyprawy |
| `location.lat` | number | Warunkowy | Szerokość geograficzna (-90 do 90) |
| `location.lng` | number | Warunkowy | Długość geograficzna (-180 do 180) |
| `location.label` | string | Nie | Nazwa miejsca (max 255 znaków) |
| `copy_equipment_from_last_trip` | boolean | Nie | Kopiuj sprzęt z ostatniej wyprawy |

### 2.3 POST `/api/v1/trips/quick-start` (Szybkie rozpoczęcie)

**Request Body:**
```json
{
  "use_gps": true,
  "copy_equipment_from_last_trip": true
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `use_gps` | boolean | Tak | Czy używać współrzędnych GPS (do uzupełnienia przez frontend) |
| `copy_equipment_from_last_trip` | boolean | Tak | Kopiuj sprzęt z ostatniej wyprawy |

### 2.4 GET `/api/v1/trips/{id}` (Szczegóły)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator wyprawy |

**Parametry zapytania:**
| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `include` | CSV string | Nie | - | Relacje do dołączenia: `catches,rods,lures,groundbaits,weather_current` |

### 2.5 PATCH `/api/v1/trips/{id}` (Aktualizacja)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator wyprawy |

**Request Body (częściowy):**
```json
{
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": "2025-12-12T14:00:00Z",
  "status": "closed",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Updated label" }
}
```

### 2.6 POST `/api/v1/trips/{id}/close` (Zamknięcie)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator wyprawy |

**Request Body:**
```json
{
  "ended_at": "2025-12-12T14:00:00Z"
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `ended_at` | ISO datetime | Tak | Data i czas zakończenia (musi być >= started_at) |

### 2.7 DELETE `/api/v1/trips/{id}` (Soft-delete)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator wyprawy |

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy z `src/types.ts`

**Entity Row Types (DB):**
```typescript
// Zdefiniowane w src/types.ts
type TripStatus = "draft" | "active" | "closed";

interface TripRow {
  id: UUID;
  user_id: UUID;
  started_at: ISODateTime;
  ended_at: ISODateTime | null;
  status: TripStatus;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

interface TripRodRow {
  id: UUID;
  trip_id: UUID;
  rod_id: UUID;
  rod_name_snapshot: string;
  created_at: ISODateTime;
}

interface TripLureRow {
  id: UUID;
  trip_id: UUID;
  lure_id: UUID;
  lure_name_snapshot: string;
  created_at: ISODateTime;
}

interface TripGroundbaitRow {
  id: UUID;
  trip_id: UUID;
  groundbait_id: UUID;
  groundbait_name_snapshot: string;
  created_at: ISODateTime;
}
```

**DTOs (Response):**
```typescript
// Zdefiniowane w src/types.ts
interface TripLocationDto {
  lat: number;
  lng: number;
  label?: string | null;
}

type TripDto = Omit<TripRow, "user_id" | "location_lat" | "location_lng" | "location_label"> & {
  location: TripLocationDto | null;
};

interface TripSummaryDto {
  catch_count: number;
}

type TripListItemDto = TripDto & {
  summary: TripSummaryDto;
};

type TripListResponseDto = ListResponse<TripListItemDto>;

type TripInclude = "catches" | "rods" | "lures" | "groundbaits" | "weather_current";

type TripGetResponseDto = TripDto & {
  equipment?: TripEquipmentDto;
  catches?: CatchInTripDto[];
  weather_current?: TripWeatherCurrentDto | null;
};
```

**Command Models (Request):**
```typescript
// Zdefiniowane w src/types.ts
interface CreateTripCommand {
  started_at: TripRow["started_at"];
  ended_at: TripRow["ended_at"];
  status: TripRow["status"];
  location: TripLocationDto | null;
  copy_equipment_from_last_trip?: boolean;
}

interface QuickStartTripCommand {
  use_gps: boolean;
  copy_equipment_from_last_trip: boolean;
}

interface QuickStartTripResponseDto {
  trip: TripDto;
  copied_equipment: {
    rod_ids: UUID[];
    lure_ids: UUID[];
    groundbait_ids: UUID[];
  };
}

type UpdateTripCommand = Partial<{
  started_at: TripRow["started_at"];
  ended_at: TripRow["ended_at"];
  status: TripRow["status"];
  location: TripLocationDto | null;
}>;

interface CloseTripCommand {
  ended_at: TripRow["ended_at"];
}
```

### 3.2 Nowe typy do utworzenia

**Plik: `src/lib/schemas/trip.schema.ts`**

```typescript
import { z } from "zod";

// Status enum
export const tripStatusSchema = z.enum(["draft", "active", "closed"]);

// Location schema (reusable)
export const tripLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().max(255).nullish(),
}).nullable();

// Query params dla listy
export const tripListQuerySchema = z.object({
  status: tripStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  include_deleted: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("false"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sort: z.enum(["started_at", "created_at", "updated_at"]).optional().default("started_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type TripListQuery = z.infer<typeof tripListQuerySchema>;

// Path param dla ID
export const tripIdParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

// Query params dla GET /{id}
export const tripIncludeSchema = z.enum([
  "catches",
  "rods",
  "lures",
  "groundbaits",
  "weather_current",
]);

export const tripGetQuerySchema = z.object({
  include: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()))
    .pipe(z.array(tripIncludeSchema))
    .optional(),
});

export type TripGetQuery = z.infer<typeof tripGetQuerySchema>;

// Body dla tworzenia
export const createTripSchema = z.object({
  started_at: z.string().datetime("Invalid datetime format"),
  ended_at: z.string().datetime("Invalid datetime format").nullable().optional(),
  status: tripStatusSchema,
  location: tripLocationSchema.optional().default(null),
  copy_equipment_from_last_trip: z.boolean().optional().default(false),
}).refine(
  (data) => {
    if (data.ended_at && data.started_at) {
      return new Date(data.ended_at) >= new Date(data.started_at);
    }
    return true;
  },
  { message: "ended_at must be greater than or equal to started_at", path: ["ended_at"] }
).refine(
  (data) => {
    if (data.status === "closed" && !data.ended_at) {
      return false;
    }
    return true;
  },
  { message: "ended_at is required when status is 'closed'", path: ["ended_at"] }
);

// Body dla quick-start
export const quickStartTripSchema = z.object({
  use_gps: z.boolean(),
  copy_equipment_from_last_trip: z.boolean(),
});

// Body dla aktualizacji (partial)
export const updateTripSchema = z.object({
  started_at: z.string().datetime("Invalid datetime format").optional(),
  ended_at: z.string().datetime("Invalid datetime format").nullable().optional(),
  status: tripStatusSchema.optional(),
  location: tripLocationSchema.optional(),
}).refine(
  (data) => {
    if (data.ended_at && data.started_at) {
      return new Date(data.ended_at) >= new Date(data.started_at);
    }
    return true;
  },
  { message: "ended_at must be greater than or equal to started_at", path: ["ended_at"] }
);

// Body dla zamknięcia
export const closeTripSchema = z.object({
  ended_at: z.string().datetime("Invalid datetime format"),
});
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET (Lista) - 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "started_at": "2025-12-12T10:00:00Z",
      "ended_at": null,
      "status": "active",
      "location": {
        "lat": 52.1,
        "lng": 21.0,
        "label": "Lake XYZ"
      },
      "summary": {
        "catch_count": 3
      },
      "deleted_at": null,
      "created_at": "2025-12-12T10:00:00Z",
      "updated_at": "2025-12-12T10:00:00Z"
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": "eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9"
  }
}
```

### 4.2 POST (Tworzenie) - 201 Created

```json
{
  "id": "uuid",
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": null,
  "status": "active",
  "location": {
    "lat": 52.1,
    "lng": 21.0,
    "label": "Lake XYZ"
  },
  "deleted_at": null,
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T10:00:00Z"
}
```

### 4.3 POST (Quick Start) - 201 Created

```json
{
  "trip": {
    "id": "uuid",
    "started_at": "2025-12-12T10:00:00Z",
    "ended_at": null,
    "status": "active",
    "location": null,
    "deleted_at": null,
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z"
  },
  "copied_equipment": {
    "rod_ids": ["uuid1", "uuid2"],
    "lure_ids": ["uuid3"],
    "groundbait_ids": ["uuid4", "uuid5"]
  }
}
```

### 4.4 GET (Szczegóły) - 200 OK

```json
{
  "id": "uuid",
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": null,
  "status": "active",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Lake XYZ" },
  "equipment": {
    "rods": [{ "id": "uuid", "name_snapshot": "Rod A" }],
    "lures": [{ "id": "uuid", "name_snapshot": "Lure A" }],
    "groundbaits": [{ "id": "uuid", "name_snapshot": "Groundbait A" }]
  },
  "catches": [
    {
      "id": "uuid",
      "caught_at": "2025-12-12T11:00:00Z",
      "species": { "id": "uuid", "name": "Pike" },
      "lure": { "id": "uuid", "name_snapshot": "Lure A" },
      "groundbait": { "id": "uuid", "name_snapshot": "Groundbait A" },
      "weight_g": 1200,
      "length_mm": 650,
      "photo": { "path": "user_id/catch_id.jpg", "url": null }
    }
  ],
  "weather_current": {
    "snapshot_id": "uuid",
    "source": "api"
  },
  "deleted_at": null,
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T10:00:00Z"
}
```

### 4.5 PATCH (Aktualizacja) - 200 OK

```json
{
  "id": "uuid",
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": "2025-12-12T14:00:00Z",
  "status": "closed",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Updated label" },
  "deleted_at": null,
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T14:30:00Z"
}
```

### 4.6 POST (Close) - 200 OK

```json
{
  "id": "uuid",
  "started_at": "2025-12-12T10:00:00Z",
  "ended_at": "2025-12-12T14:00:00Z",
  "status": "closed",
  "location": { "lat": 52.1, "lng": 21.0, "label": "Lake XYZ" },
  "deleted_at": null,
  "created_at": "2025-12-12T10:00:00Z",
  "updated_at": "2025-12-12T14:30:00Z"
}
```

### 4.7 DELETE (Soft-delete) - 204 No Content

Brak ciała odpowiedzi.

### 4.8 Błędy

```json
{
  "error": {
    "code": "validation_error",
    "message": "ended_at must be greater than or equal to started_at",
    "details": {
      "field": "ended_at",
      "reason": "must be >= started_at"
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
│         src/pages/api/v1/trips/[...path].ts                 │
├─────────────────────────────────────────────────────────────┤
│                    Validation Layer                          │
│              src/lib/schemas/trip.schema.ts                 │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│              src/lib/services/trip.service.ts               │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                            │
│                  Supabase Client (RLS)                       │
│                   src/db/supabase.client.ts                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Przepływ dla GET (Lista)

```
1. Request → Astro Route Handler
2. Walidacja query params (Zod)
3. Ekstrakcja user ID z context.locals.supabase
4. TripService.list(supabase, query)
   a. Budowanie zapytania SELECT z JOINem do catches (COUNT)
   b. Filtrowanie (status, from/to, include_deleted)
   c. Sortowanie (sort, order)
   d. Paginacja (cursor, limit)
5. Transformacja do DTO (grupowanie lokalizacji, dodanie summary)
6. Response 200 + JSON
```

### 5.3 Przepływ dla POST (Tworzenie)

```
1. Request → Astro Route Handler
2. Walidacja body (Zod + custom refinements)
3. Ekstrakcja user ID z context.locals.supabase
4. TripService.create(supabase, userId, data)
   a. INSERT do tabeli trips
   b. Jeśli copy_equipment_from_last_trip:
      i. Znajdź ostatnią nie-usuniętą wyprawę
      ii. Skopiuj wpisy z trip_rods, trip_lures, trip_groundbaits
5. Transformacja do DTO
6. Response 201 + JSON
```

### 5.4 Przepływ dla POST (Quick Start)

```
1. Request → Astro Route Handler
2. Walidacja body (Zod)
3. Ekstrakcja user ID z context.locals.supabase
4. TripService.quickStart(supabase, userId, data)
   a. Utworzenie wyprawy: started_at = now(), status = active
   b. Jeśli copy_equipment_from_last_trip:
      i. Znajdź ostatnią nie-usuniętą wyprawę
      ii. Skopiuj sprzęt
   c. Zwróć trip + listę skopiowanych ID
5. Response 201 + JSON
```

### 5.5 Przepływ dla GET (Szczegóły)

```
1. Request → Astro Route Handler
2. Walidacja path param i query params (Zod)
3. TripService.getById(supabase, id, includes)
   a. SELECT trip WHERE id = ?
   b. RLS automatycznie filtruje po user_id
   c. Jeśli include zawiera:
      - 'rods': JOIN trip_rods
      - 'lures': JOIN trip_lures
      - 'groundbaits': JOIN trip_groundbaits
      - 'catches': JOIN catches + fish_species
      - 'weather_current': JOIN weather_snapshots (najnowszy)
4. Sprawdzenie czy znaleziono (404 jeśli nie)
5. Transformacja do DTO
6. Response 200 + JSON
```

### 5.6 Przepływ dla PATCH (Aktualizacja)

```
1. Request → Astro Route Handler
2. Walidacja path param i body (Zod)
3. TripService.update(supabase, id, data)
   a. Pobierz istniejący rekord (dla walidacji ended_at >= started_at)
   b. Walidacja business rules:
      - status = 'closed' wymaga ended_at
      - ended_at >= started_at (uwzględniając istniejące wartości)
   c. UPDATE z automatycznym updated_at (trigger)
4. Obsługa błędów DB constraints (CHECK violations)
5. Transformacja do DTO
6. Response 200 + JSON
```

### 5.7 Przepływ dla POST (Close)

```
1. Request → Astro Route Handler
2. Walidacja path param i body (Zod)
3. TripService.close(supabase, id, ended_at)
   a. Pobierz wyprawę
   b. Sprawdź czy ended_at >= started_at
   c. UPDATE: status = 'closed', ended_at = ?
4. Transformacja do DTO
5. Response 200 + JSON
```

### 5.8 Przepływ dla DELETE (Soft-delete)

```
1. Request → Astro Route Handler
2. Walidacja path param (Zod UUID)
3. TripService.softDelete(supabase, id)
   a. UPDATE SET deleted_at = now() WHERE id = ?
   b. RLS automatycznie sprawdza user_id
4. Sprawdzenie czy zaktualizowano (404 jeśli nie)
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
- Polityki RLS sprawdzają `user_id = auth.uid()` dla tabeli `trips`
- Junction tables (trip_rods, trip_lures, trip_groundbaits) mają polityki sprawdzające właściciela przez JOIN z trips
- Użytkownik widzi tylko swoje dane
- Próba dostępu do cudzych zasobów → 404 Not Found (nie 403, dla bezpieczeństwa)

### 6.3 Walidacja danych wejściowych

| Pole | Walidacja |
|------|-----------|
| `id` | Format UUID v4 |
| `started_at` | ISO 8601 datetime string |
| `ended_at` | ISO 8601 datetime string, >= started_at |
| `status` | Enum: `draft`, `active`, `closed` |
| `location.lat` | Number -90 do 90 |
| `location.lng` | Number -180 do 180 |
| `location.label` | String max 255 znaków |
| `limit` | Integer 1-100 |
| `sort` | Enum: `started_at`, `created_at`, `updated_at` |
| `order` | Enum: `asc`, `desc` |
| `include` | CSV z dozwolonych wartości |

### 6.4 Walidacja biznesowa (DB constraints)

- `ended_at IS NULL OR ended_at >= started_at` (CHECK)
- `status != 'closed' OR ended_at IS NOT NULL` (CHECK)
- `(location_lat IS NULL) = (location_lng IS NULL)` (CHECK - oba lub żaden)

### 6.5 Ochrona przed atakami

| Zagrożenie | Mitygacja |
|------------|-----------|
| SQL Injection | Parametryzowane zapytania przez Supabase Client |
| XSS | Dane zwracane jako JSON, bez renderowania HTML |
| CSRF | Brak cookies sesyjnych, JWT w nagłówku |
| Mass Assignment | Explicite wybieranie pól do aktualizacji przez Zod schema |
| IDOR | RLS + walidacja właściciela na poziomie DB |

---

## 7. Obsługa błędów

### 7.1 Tabela błędów

| Scenariusz | HTTP Status | Kod błędu | Wiadomość |
|------------|-------------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | `unauthorized` | Authentication required |
| Nieprawidłowy token | 401 | `unauthorized` | Invalid or expired token |
| Nieprawidłowy format UUID | 400 | `validation_error` | Invalid UUID format |
| Nieprawidłowy format daty | 400 | `validation_error` | Invalid datetime format |
| ended_at < started_at | 400 | `validation_error` | ended_at must be >= started_at |
| status=closed bez ended_at | 400 | `validation_error` | ended_at is required when status is 'closed' |
| Nieprawidłowy status | 400 | `validation_error` | Invalid status value |
| lat bez lng (lub odwrotnie) | 400 | `validation_error` | Both lat and lng must be provided |
| lat poza zakresem | 400 | `validation_error` | lat must be between -90 and 90 |
| lng poza zakresem | 400 | `validation_error` | lng must be between -180 and 180 |
| Nieprawidłowy parametr include | 400 | `validation_error` | Invalid include value |
| Wyprawa nie znaleziona | 404 | `not_found` | Trip not found |
| Naruszenie DB constraint | 400 | `validation_error` | Database constraint violation |
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
    return { code: "not_found", message: "Trip not found", status: 404 };
  }
  
  // RLS violation (no rows affected)
  if (error.code === "42501") {
    return { code: "not_found", message: "Trip not found", status: 404 };
  }
  
  // Default
  return { code: "internal_error", message: "Internal server error", status: 500 };
}
```

### 7.4 Logowanie błędów

- Błędy 5xx logowane z pełnym stack trace i request ID
- Błędy 4xx logowane jako info z request ID
- Użycie `console.error` dla błędów krytycznych
- Sanityzacja danych użytkownika przed logowaniem

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

Zgodnie z `db-plan.md`, wykorzystywane są następujące indeksy:

```sql
-- Dashboard: ostatnie wyprawy użytkownika (główny use case)
CREATE INDEX idx_trips_user_started 
    ON trips (user_id, started_at DESC) 
    WHERE deleted_at IS NULL;

-- Filtrowanie po statusie
CREATE INDEX idx_trips_user_status 
    ON trips (user_id, status) 
    WHERE deleted_at IS NULL;

-- Junction tables: lookup by trip
CREATE INDEX idx_trip_rods_trip ON trip_rods (trip_id);
CREATE INDEX idx_trip_lures_trip ON trip_lures (trip_id);
CREATE INDEX idx_trip_groundbaits_trip ON trip_groundbaits (trip_id);

-- Catches per trip
CREATE INDEX idx_catches_trip_caught ON catches (trip_id, caught_at);
```

### 8.2 Optymalizacja zapytań

#### Lista wypraw z catch_count

```sql
SELECT 
  t.id, t.started_at, t.ended_at, t.status,
  t.location_lat, t.location_lng, t.location_label,
  t.deleted_at, t.created_at, t.updated_at,
  COALESCE(c.catch_count, 0) AS catch_count
FROM trips t
LEFT JOIN (
  SELECT trip_id, COUNT(*) AS catch_count
  FROM catches
  GROUP BY trip_id
) c ON c.trip_id = t.id
WHERE t.user_id = auth.uid()
  AND (t.deleted_at IS NULL OR :include_deleted = true)
  AND (:status IS NULL OR t.status = :status)
  AND (:from IS NULL OR t.started_at >= :from)
  AND (:to IS NULL OR t.started_at <= :to)
ORDER BY t.started_at DESC
LIMIT :limit + 1;
```

#### Szczegóły z includes (N+1 prevention)

Zamiast osobnych zapytań dla każdej relacji, użyj Supabase nested selects:

```typescript
const { data } = await supabase
  .from("trips")
  .select(`
    *,
    trip_rods ( rod_id, rod_name_snapshot ),
    trip_lures ( lure_id, lure_name_snapshot ),
    trip_groundbaits ( groundbait_id, groundbait_name_snapshot ),
    catches (
      id, caught_at, weight_g, length_mm, photo_path,
      fish_species ( id, name ),
      lures ( id ),
      groundbaits ( id )
    ),
    weather_snapshots ( id, source )
  `)
  .eq("id", tripId)
  .single();
```

### 8.3 Paginacja kursorowa

- Używana dla list z potencjalnie dużą liczbą elementów
- Kursor koduje `{sortValue, id}` w base64
- Stabilna wydajność niezależnie od offsetu
- Wykorzystuje indeks `idx_trips_user_started`

### 8.4 Limity

| Parametr | Wartość | Uzasadnienie |
|----------|---------|--------------|
| Domyślny limit | 20 | Typowy rozmiar strony dashboard |
| Maksymalny limit | 100 | Ochrona przed DoS |
| Max label length | 255 | Rozsądna długość nazwy miejsca |

---

## 9. Etapy wdrożenia

### Etap 1: Struktura plików i konfiguracja

1. **Utworzenie struktury katalogów:**
   ```
   src/
   ├── lib/
   │   ├── schemas/
   │   │   └── trip.schema.ts
   │   └── services/
   │       └── trip.service.ts
   └── pages/
       └── api/
           └── v1/
               └── trips/
                   ├── index.ts          # GET /trips, POST /trips
                   ├── quick-start.ts    # POST /trips/quick-start
                   └── [id]/
                       ├── index.ts      # GET, PATCH, DELETE /trips/{id}
                       └── close.ts      # POST /trips/{id}/close
   ```

### Etap 2: Implementacja schematów walidacji

**Plik: `src/lib/schemas/trip.schema.ts`**

Utworzenie wszystkich schematów Zod opisanych w sekcji 3.2:
- `tripListQuerySchema`
- `tripIdParamSchema`
- `tripGetQuerySchema`
- `createTripSchema`
- `quickStartTripSchema`
- `updateTripSchema`
- `closeTripSchema`

### Etap 3: Implementacja serwisu

**Plik: `src/lib/services/trip.service.ts`**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { 
  TripDto, 
  TripListItemDto, 
  TripListResponseDto,
  TripGetResponseDto,
  QuickStartTripResponseDto,
  TripInclude
} from "@/types";

interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string; status: number };
}

export class TripService {
  constructor(private supabase: SupabaseClient) {}

  async list(params: TripListQuery): Promise<ServiceResult<TripListResponseDto>> {
    // Implementacja z catch_count, filtrowaniem, sortowaniem, paginacją
  }

  async getById(id: string, includes?: TripInclude[]): Promise<ServiceResult<TripGetResponseDto>> {
    // Implementacja z opcjonalnymi relacjami
  }

  async create(userId: string, data: CreateTripCommand): Promise<ServiceResult<TripDto>> {
    // Tworzenie + opcjonalne kopiowanie sprzętu
  }

  async quickStart(userId: string, data: QuickStartTripCommand): Promise<ServiceResult<QuickStartTripResponseDto>> {
    // Quick start z now() i kopiowaniem sprzętu
  }

  async update(id: string, data: UpdateTripCommand): Promise<ServiceResult<TripDto>> {
    // Częściowa aktualizacja z walidacją business rules
  }

  async close(id: string, endedAt: string): Promise<ServiceResult<TripDto>> {
    // Zamknięcie wyprawy
  }

  async softDelete(id: string): Promise<ServiceResult<void>> {
    // Soft delete
  }

  // Prywatne metody pomocnicze
  private async copyEquipmentFromLastTrip(
    userId: string, 
    newTripId: string
  ): Promise<{ rod_ids: string[]; lure_ids: string[]; groundbait_ids: string[] }> {
    // Znajdź ostatnią wyprawę i skopiuj sprzęt
  }

  private mapRowToDto(row: TripRow): TripDto {
    // Transformacja location_* na obiekt location
  }
}
```

### Etap 4: Implementacja endpointów API

#### 4.1 GET/POST `/api/v1/trips` (index.ts)

```typescript
import type { APIRoute } from "astro";
import { tripListQuerySchema, createTripSchema } from "@/lib/schemas/trip.schema";
import { TripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const GET: APIRoute = async ({ locals, url }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const queryParams = Object.fromEntries(url.searchParams);
  const parseResult = tripListQuerySchema.safeParse(queryParams);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new TripService(supabase);
  const result = await service.list(parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const body = await request.json();
  const parseResult = createTripSchema.safeParse(body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new TripService(supabase);
  const result = await service.create(user.id, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data, 201);
};
```

#### 4.2 POST `/api/v1/trips/quick-start` (quick-start.ts)

```typescript
import type { APIRoute } from "astro";
import { quickStartTripSchema } from "@/lib/schemas/trip.schema";
import { TripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const POST: APIRoute = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const body = await request.json();
  const parseResult = quickStartTripSchema.safeParse(body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new TripService(supabase);
  const result = await service.quickStart(user.id, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data, 201);
};
```

#### 4.3 GET/PATCH/DELETE `/api/v1/trips/[id]` ([id]/index.ts)

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, tripGetQuerySchema, updateTripSchema } from "@/lib/schemas/trip.schema";
import { TripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // Validate path param
  const idResult = tripIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid UUID format", 400, { field: "id" });
  }

  // Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryResult = tripGetQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    const firstError = queryResult.error.errors[0];
    return createErrorResponse("validation_error", firstError.message, 400);
  }

  const service = new TripService(supabase);
  const result = await service.getById(idResult.data.id, queryResult.data.include);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const idResult = tripIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid UUID format", 400, { field: "id" });
  }

  const body = await request.json();
  const parseResult = updateTripSchema.safeParse(body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new TripService(supabase);
  const result = await service.update(idResult.data.id, parseResult.data);

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

  const idResult = tripIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid UUID format", 400, { field: "id" });
  }

  const service = new TripService(supabase);
  const result = await service.softDelete(idResult.data.id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return new Response(null, { status: 204 });
};
```

#### 4.4 POST `/api/v1/trips/[id]/close` ([id]/close.ts)

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, closeTripSchema } from "@/lib/schemas/trip.schema";
import { TripService } from "@/lib/services/trip.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const POST: APIRoute = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const idResult = tripIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid UUID format", 400, { field: "id" });
  }

  const body = await request.json();
  const parseResult = closeTripSchema.safeParse(body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new TripService(supabase);
  const result = await service.close(idResult.data.id, parseResult.data.ended_at);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return createSuccessResponse(result.data);
};
```

### Etap 5: Implementacja logiki serwisu

Szczegółowa implementacja metod `TripService`:

#### 5.1 Metoda `list`

```typescript
async list(params: TripListQuery): Promise<ServiceResult<TripListResponseDto>> {
  const { status, from, to, include_deleted, limit, cursor, sort, order } = params;

  // Subquery for catch counts
  let query = this.supabase
    .from("trips")
    .select(`
      id, started_at, ended_at, status,
      location_lat, location_lng, location_label,
      deleted_at, created_at, updated_at,
      catches ( count )
    `, { count: "exact" });

  // Filters
  if (!include_deleted) {
    query = query.is("deleted_at", null);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (from) {
    query = query.gte("started_at", from);
  }
  if (to) {
    query = query.lte("started_at", to);
  }

  // Sorting
  query = query
    .order(sort, { ascending: order === "asc" })
    .order("id", { ascending: order === "asc" });

  // Cursor pagination
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

  const mappedItems: TripListItemDto[] = items.map((row) => ({
    ...this.mapRowToDto(row),
    summary: {
      catch_count: row.catches?.[0]?.count ?? 0,
    },
  }));

  return {
    data: {
      data: mappedItems,
      page: { limit, next_cursor: nextCursor },
    },
  };
}
```

#### 5.2 Metoda `copyEquipmentFromLastTrip`

```typescript
private async copyEquipmentFromLastTrip(
  userId: string,
  newTripId: string
): Promise<{ rod_ids: string[]; lure_ids: string[]; groundbait_ids: string[] }> {
  // Find last non-deleted trip
  const { data: lastTrip } = await this.supabase
    .from("trips")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("id", newTripId)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastTrip) {
    return { rod_ids: [], lure_ids: [], groundbait_ids: [] };
  }

  // Get equipment from last trip
  const [rods, lures, groundbaits] = await Promise.all([
    this.supabase.from("trip_rods").select("rod_id, rod_name_snapshot").eq("trip_id", lastTrip.id),
    this.supabase.from("trip_lures").select("lure_id, lure_name_snapshot").eq("trip_id", lastTrip.id),
    this.supabase.from("trip_groundbaits").select("groundbait_id, groundbait_name_snapshot").eq("trip_id", lastTrip.id),
  ]);

  // Copy to new trip
  const copied = { rod_ids: [] as string[], lure_ids: [] as string[], groundbait_ids: [] as string[] };

  if (rods.data?.length) {
    const rodInserts = rods.data.map((r) => ({
      trip_id: newTripId,
      rod_id: r.rod_id,
      rod_name_snapshot: r.rod_name_snapshot,
    }));
    await this.supabase.from("trip_rods").insert(rodInserts);
    copied.rod_ids = rods.data.map((r) => r.rod_id);
  }

  if (lures.data?.length) {
    const lureInserts = lures.data.map((l) => ({
      trip_id: newTripId,
      lure_id: l.lure_id,
      lure_name_snapshot: l.lure_name_snapshot,
    }));
    await this.supabase.from("trip_lures").insert(lureInserts);
    copied.lure_ids = lures.data.map((l) => l.lure_id);
  }

  if (groundbaits.data?.length) {
    const gbInserts = groundbaits.data.map((g) => ({
      trip_id: newTripId,
      groundbait_id: g.groundbait_id,
      groundbait_name_snapshot: g.groundbait_name_snapshot,
    }));
    await this.supabase.from("trip_groundbaits").insert(gbInserts);
    copied.groundbait_ids = groundbaits.data.map((g) => g.groundbait_id);
  }

  return copied;
}
```

### Etap 6: Testowanie

1. **Testy manualne:**
   - Weryfikacja wszystkich endpointów przez REST client (Postman/Insomnia)
   - Testowanie przypadków brzegowych
   - Weryfikacja RLS (próba dostępu do cudzych zasobów)

2. **Scenariusze testowe:**

   **Lista wypraw:**
   - ✅ Zwraca listę wypraw dla zalogowanego użytkownika
   - ✅ Filtruje po statusie
   - ✅ Filtruje po zakresie dat (from/to)
   - ✅ Uwzględnia/pomija soft-deleted (include_deleted)
   - ✅ Sortuje po started_at, created_at, updated_at
   - ✅ Paginacja kursorowa działa poprawnie
   - ✅ Zawiera poprawny catch_count

   **Tworzenie wyprawy:**
   - ✅ Tworzy wyprawę z poprawnymi danymi → 201
   - ✅ Odmawia gdy ended_at < started_at → 400
   - ✅ Odmawia gdy status=closed bez ended_at → 400
   - ✅ Kopiuje sprzęt gdy copy_equipment_from_last_trip=true
   - ✅ Waliduje lokalizację (lat/lng oba lub żaden)

   **Quick Start:**
   - ✅ Tworzy wyprawę ze started_at=now(), status=active
   - ✅ Kopiuje sprzęt z ostatniej wyprawy
   - ✅ Zwraca listę skopiowanych ID

   **Szczegóły wyprawy:**
   - ✅ Zwraca podstawowe dane wyprawy
   - ✅ Dołącza relacje zgodnie z parametrem include
   - ✅ Zwraca 404 dla nieistniejącej wyprawy

   **Aktualizacja:**
   - ✅ Aktualizuje dozwolone pola
   - ✅ Waliduje business rules przy zmianie statusu

   **Zamknięcie:**
   - ✅ Ustawia status=closed i ended_at
   - ✅ Odmawia gdy ended_at < started_at

   **Soft-delete:**
   - ✅ Ustawia deleted_at=now()
   - ✅ Zwraca 204 No Content
   - ✅ Zwraca 404 dla nieistniejącej wyprawy

---

## 10. Podsumowanie

Plan implementacji obejmuje kompletny zestaw endpointów zarządzania wyprawami wędkarskimi. Kluczowe aspekty:

- **Złożona logika biznesowa**: Obsługa lifecycle (draft → active → closed), kopiowanie sprzętu
- **Optymalizacja zapytań**: Agregacja catch_count, nested selects dla relacji
- **Bezpieczeństwo**: RLS + walidacja Zod + JWT + walidacja business rules
- **Elastyczność**: Opcjonalne includes, filtrowanie, sortowanie
- **Wydajność**: Indeksy DB + paginacja kursorowa

**Estymowany czas implementacji:** 4-5 dni dla doświadczonego developera

**Zależności:**
- Wymaga wcześniejszej implementacji middleware Supabase
- Wymaga helperów z equipment-endpoints (api-response, pagination)
- Wymaga istniejących tabel DB (trips, trip_rods, trip_lures, trip_groundbaits, catches)

