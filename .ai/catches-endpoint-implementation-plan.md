# API Endpoint Implementation Plan: Catches (Połowy / Trofea)

## 1. Przegląd punktu końcowego

Ten plan opisuje implementację zestawu endpointów zarządzania **połowami (catches)** w ramach wypraw wędkarskich. Catches są centralnym elementem aplikacji, reprezentującym pojedyncze złowione ryby z powiązanym sprzętem, gatunkiem i opcjonalnym zdjęciem.

### Funkcjonalności:
- Listowanie połowów dla konkretnej wyprawy z filtrowaniem, paginacją i sortowaniem
- Tworzenie nowego połowu z automatycznym snapshotem nazw sprzętu (przez DB trigger)
- Pobieranie szczegółów pojedynczego połowu
- Aktualizacja połowu (częściowa, bez możliwości zmiany snapshotów)
- Usunięcie połowu (hard delete)

### Kluczowe aspekty implementacji:
- **Snapshoty nazw sprzętu**: `lure_name_snapshot` i `groundbait_name_snapshot` są automatycznie wypełniane przez triggery bazy danych - API NIE przyjmuje tych wartości od klienta
- **Walidacja cross-user**: DB triggery odrzucają użycie sprzętu (lures/groundbaits) należącego do innego użytkownika lub soft-deleted
- **Walidacja caught_at**: API (nie DB) waliduje czy `caught_at` mieści się w zakresie `started_at` do `ended_at` wyprawy
- **Hard delete**: Tabela `catches` nie ma kolumny `deleted_at` - połowy są fizycznie usuwane

### Endpointy:

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/trips/{tripId}/catches` | Lista połowów dla wyprawy |
| POST | `/api/v1/trips/{tripId}/catches` | Utwórz połów |
| GET | `/api/v1/catches/{id}` | Pobierz szczegóły połowu |
| PATCH | `/api/v1/catches/{id}` | Aktualizuj połów |
| DELETE | `/api/v1/catches/{id}` | Usuń połów (hard delete) |

---

## 2. Szczegóły żądania

### 2.1 GET `/api/v1/trips/{tripId}/catches` (Lista)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

**Parametry zapytania (query params):**

| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `from` | ISO datetime | Nie | - | Początek zakresu dat (na `caught_at`) |
| `to` | ISO datetime | Nie | - | Koniec zakresu dat (na `caught_at`) |
| `species_id` | UUID | Nie | - | Filtr po gatunku ryby |
| `limit` | number | Nie | `20` | Liczba wyników (1-100) |
| `cursor` | string | Nie | - | Kursor paginacji (opaque string) |
| `sort` | enum | Nie | `caught_at` | Pole sortowania: `caught_at`, `created_at` |
| `order` | enum | Nie | `desc` | Kierunek sortowania: `asc`, `desc` |

### 2.2 POST `/api/v1/trips/{tripId}/catches` (Tworzenie)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `tripId` | UUID | Tak | Identyfikator wyprawy |

**Request Body:**
```json
{
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "weight_g": 1200,
  "length_mm": 650
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `caught_at` | ISO datetime | Tak | Data i czas złowienia (musi być w zakresie wyprawy) |
| `species_id` | UUID | Tak | ID gatunku ryby z tabeli fish_species |
| `lure_id` | UUID | Tak | ID przynęty użytkownika (nie może być soft-deleted) |
| `groundbait_id` | UUID | Tak | ID zanęty użytkownika (nie może być soft-deleted) |
| `weight_g` | integer | Nie | Waga w gramach (> 0) |
| `length_mm` | integer | Nie | Długość w milimetrach (> 0) |

**⚠️ Pola NIE akceptowane (automatycznie uzupełniane przez DB trigger):**
- `lure_name_snapshot`
- `groundbait_name_snapshot`

### 2.3 GET `/api/v1/catches/{id}` (Szczegóły)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator połowu |

### 2.4 PATCH `/api/v1/catches/{id}` (Aktualizacja)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator połowu |

**Request Body (wszystkie pola opcjonalne):**
```json
{
  "caught_at": "2025-12-12T11:30:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "weight_g": 1100,
  "length_mm": 640,
  "photo_path": "user_id/catch_id.jpg"
}
```

| Pole | Typ | Wymagany | Opis |
|------|-----|----------|------|
| `caught_at` | ISO datetime | Nie | Data i czas złowienia |
| `species_id` | UUID | Nie | ID gatunku ryby |
| `lure_id` | UUID | Nie | ID przynęty (aktualizuje też snapshot przez trigger) |
| `groundbait_id` | UUID | Nie | ID zanęty (aktualizuje też snapshot przez trigger) |
| `weight_g` | integer/null | Nie | Waga w gramach (> 0 lub null) |
| `length_mm` | integer/null | Nie | Długość w milimetrach (> 0 lub null) |
| `photo_path` | string/null | Nie | Ścieżka do zdjęcia w Storage (lub null dla usunięcia) |

**⚠️ Pola NIE akceptowane:**
- `lure_name_snapshot` - aktualizowany automatycznie przez trigger przy zmianie `lure_id`
- `groundbait_name_snapshot` - aktualizowany automatycznie przez trigger przy zmianie `groundbait_id`

### 2.5 DELETE `/api/v1/catches/{id}` (Usunięcie)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator połowu |

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy z `src/types.ts`

**Entity Row Types (DB):**
```typescript
// Zdefiniowane w src/types.ts
interface CatchRow {
  id: UUID;
  trip_id: UUID;
  caught_at: ISODateTime;
  species_id: UUID;
  lure_id: UUID;
  groundbait_id: UUID;
  lure_name_snapshot: string;
  groundbait_name_snapshot: string;
  weight_g: number | null;
  length_mm: number | null;
  photo_path: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
```

**DTOs (Response):**
```typescript
// Zdefiniowane w src/types.ts
type CatchDto = CatchRow;
type CatchListResponseDto = ListResponse<CatchDto>;
type CatchGetResponseDto = CatchDto;
```

**Command Models (Request):**
```typescript
// Zdefiniowane w src/types.ts
type CatchMutableFields = Pick<
  CatchRow,
  "caught_at" | "species_id" | "lure_id" | "groundbait_id" | "weight_g" | "length_mm" | "photo_path"
>;

type CreateCatchCommand = Pick<CatchMutableFields, "caught_at" | "species_id" | "lure_id" | "groundbait_id"> &
  Partial<Pick<CatchMutableFields, "weight_g" | "length_mm">>;

type UpdateCatchCommand = Partial<CatchMutableFields>;
```

### 3.2 Nowe typy do utworzenia

**Plik: `src/lib/schemas/catch.schema.ts`**

```typescript
import { z } from "zod";

// Path param dla trip ID
export const tripIdParamSchema = z.object({
  tripId: z.string().uuid("Invalid trip UUID format"),
});

// Path param dla catch ID
export const catchIdParamSchema = z.object({
  id: z.string().uuid("Invalid catch UUID format"),
});

// Query params dla listy połowów
export const catchListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  species_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sort: z.enum(["caught_at", "created_at"]).optional().default("caught_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CatchListQuery = z.infer<typeof catchListQuerySchema>;

// Body dla tworzenia połowu
export const createCatchSchema = z.object({
  caught_at: z.string().datetime("Invalid datetime format for caught_at"),
  species_id: z.string().uuid("Invalid species_id UUID format"),
  lure_id: z.string().uuid("Invalid lure_id UUID format"),
  groundbait_id: z.string().uuid("Invalid groundbait_id UUID format"),
  weight_g: z
    .number()
    .int("weight_g must be an integer")
    .positive("weight_g must be greater than 0")
    .optional()
    .nullable(),
  length_mm: z
    .number()
    .int("length_mm must be an integer")
    .positive("length_mm must be greater than 0")
    .optional()
    .nullable(),
});

// Body dla aktualizacji połowu (wszystko opcjonalne, bez snapshots)
export const updateCatchSchema = z
  .object({
    caught_at: z.string().datetime("Invalid datetime format for caught_at").optional(),
    species_id: z.string().uuid("Invalid species_id UUID format").optional(),
    lure_id: z.string().uuid("Invalid lure_id UUID format").optional(),
    groundbait_id: z.string().uuid("Invalid groundbait_id UUID format").optional(),
    weight_g: z
      .number()
      .int("weight_g must be an integer")
      .positive("weight_g must be greater than 0")
      .nullable()
      .optional(),
    length_mm: z
      .number()
      .int("length_mm must be an integer")
      .positive("length_mm must be greater than 0")
      .nullable()
      .optional(),
    photo_path: z.string().nullable().optional(),
  })
  .strict(); // Strict mode odrzuci nieznane pola (np. snapshoty)

// Schema do walidacji, że snapshoty nie są przekazywane
export const rejectSnapshotFieldsSchema = z.object({
  lure_name_snapshot: z.undefined({
    invalid_type_error: "lure_name_snapshot cannot be set manually - it is computed by database",
  }),
  groundbait_name_snapshot: z.undefined({
    invalid_type_error: "groundbait_name_snapshot cannot be set manually - it is computed by database",
  }),
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
      "trip_id": "uuid",
      "caught_at": "2025-12-12T11:00:00Z",
      "species_id": "uuid",
      "lure_id": "uuid",
      "groundbait_id": "uuid",
      "lure_name_snapshot": "Lure A",
      "groundbait_name_snapshot": "Groundbait A",
      "weight_g": 1200,
      "length_mm": 650,
      "photo_path": "user_id/catch_id.jpg",
      "created_at": "2025-12-12T11:01:00Z",
      "updated_at": "2025-12-12T11:01:00Z"
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
  "trip_id": "uuid",
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "lure_name_snapshot": "Lure A",
  "groundbait_name_snapshot": "Groundbait A",
  "weight_g": 1200,
  "length_mm": 650,
  "photo_path": null,
  "created_at": "2025-12-12T11:01:00Z",
  "updated_at": "2025-12-12T11:01:00Z"
}
```

### 4.3 GET (Szczegóły) - 200 OK

```json
{
  "id": "uuid",
  "trip_id": "uuid",
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "lure_name_snapshot": "Lure A",
  "groundbait_name_snapshot": "Groundbait A",
  "weight_g": 1200,
  "length_mm": 650,
  "photo_path": "user_id/catch_id.jpg",
  "created_at": "2025-12-12T11:01:00Z",
  "updated_at": "2025-12-12T11:01:00Z"
}
```

### 4.4 PATCH (Aktualizacja) - 200 OK

```json
{
  "id": "uuid",
  "trip_id": "uuid",
  "caught_at": "2025-12-12T11:30:00Z",
  "species_id": "uuid",
  "lure_id": "uuid",
  "groundbait_id": "uuid",
  "lure_name_snapshot": "Updated Lure Name",
  "groundbait_name_snapshot": "Updated Groundbait Name",
  "weight_g": 1100,
  "length_mm": 640,
  "photo_path": null,
  "created_at": "2025-12-12T11:01:00Z",
  "updated_at": "2025-12-12T12:00:00Z"
}
```

### 4.5 DELETE (Usunięcie) - 204 No Content

Brak ciała odpowiedzi.

### 4.6 Błędy

**Format standardowy:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "caught_at must be within trip date range",
    "details": {
      "field": "caught_at",
      "reason": "caught_at is before trip started_at"
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
│     src/pages/api/v1/trips/[tripId]/catches/index.ts        │
│     src/pages/api/v1/catches/[id]/index.ts                  │
├─────────────────────────────────────────────────────────────┤
│                    Validation Layer                          │
│              src/lib/schemas/catch.schema.ts                │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│              src/lib/services/catch.service.ts              │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                            │
│          Supabase Client (RLS) + DB Triggers                │
│              src/db/supabase.client.ts                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Przepływ dla GET (Lista połowów wyprawy)

```
1. Request → Astro Route Handler
2. Walidacja path param tripId (Zod UUID)
3. Walidacja query params (Zod)
4. Ekstrakcja user z context.locals.supabase
5. CatchService.listByTripId(supabase, tripId, query)
   a. Sprawdzenie czy wyprawa istnieje i należy do użytkownika (RLS)
   b. Budowanie zapytania SELECT z catches WHERE trip_id = ?
   c. Filtrowanie (from/to na caught_at, species_id)
   d. Sortowanie (sort, order)
   e. Paginacja kursorowa (cursor, limit)
6. Jeśli trip nie istnieje → 404 not_found
7. Response 200 + JSON
```

### 5.3 Przepływ dla POST (Tworzenie połowu)

```
1. Request → Astro Route Handler
2. Walidacja path param tripId (Zod UUID)
3. Walidacja body (Zod) + sprawdzenie że nie ma snapshot fields
4. Ekstrakcja user z context.locals.supabase
5. CatchService.create(supabase, tripId, data)
   a. Pobranie wyprawy (started_at, ended_at) - RLS gwarantuje własność
   b. Jeśli trip nie istnieje → 404 not_found
   c. Walidacja business rule: caught_at w zakresie [started_at, ended_at]
   d. INSERT do catches (bez snapshot fields)
   e. DB trigger automatycznie:
      - Pobiera nazwy z lures i groundbaits
      - Weryfikuje że sprzęt należy do właściciela wyprawy
      - Weryfikuje że sprzęt nie jest soft-deleted
      - Wypełnia lure_name_snapshot i groundbait_name_snapshot
   f. Jeśli trigger odrzuci → mapowanie na 409 conflict
6. Response 201 + JSON (z utworzonym połowem wraz ze snapshotami)
```

### 5.4 Przepływ dla GET (Szczegóły pojedynczego połowu)

```
1. Request → Astro Route Handler
2. Walidacja path param id (Zod UUID)
3. CatchService.getById(supabase, id)
   a. SELECT catch WHERE id = ?
   b. RLS automatycznie sprawdza właściciela przez trip_id
4. Jeśli nie znaleziono → 404 not_found
5. Response 200 + JSON
```

### 5.5 Przepływ dla PATCH (Aktualizacja połowu)

```
1. Request → Astro Route Handler
2. Walidacja path param id (Zod UUID)
3. Walidacja body (Zod strict - odrzuca snapshot fields)
4. CatchService.update(supabase, id, data)
   a. Pobranie istniejącego połowu z trip info (started_at, ended_at)
   b. Jeśli nie znaleziono → 404 not_found
   c. Jeśli zmieniono caught_at → walidacja zakresu [started_at, ended_at]
   d. UPDATE catches (bez snapshot fields)
   e. DB trigger automatycznie aktualizuje snapshoty jeśli zmieniono lure_id lub groundbait_id
   f. Jeśli trigger odrzuci → 409 conflict
5. Response 200 + JSON (z zaktualizowanym połowem)
```

### 5.6 Przepływ dla DELETE (Usunięcie połowu)

```
1. Request → Astro Route Handler
2. Walidacja path param id (Zod UUID)
3. CatchService.delete(supabase, id)
   a. DELETE FROM catches WHERE id = ?
   b. RLS sprawdza właściciela przez trip_id
   c. Sprawdzenie czy usunięto (count > 0)
4. Jeśli nie usunięto (nie znaleziono) → 404 not_found
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
- Polityka `catches_select` sprawdza czy użytkownik jest właścicielem wyprawy
- Polityka `catches_insert` / `catches_update` / `catches_delete` sprawdza to samo
- **DB Trigger** (`check_catch_owner_consistency`) dodatkowo weryfikuje:
  - Czy `lure_id` należy do właściciela wyprawy
  - Czy `groundbait_id` należy do właściciela wyprawy
- Próba dostępu do cudzych zasobów → 404 Not Found (nie 403, dla bezpieczeństwa)

### 6.3 Walidacja danych wejściowych

| Pole | Walidacja |
|------|-----------|
| `tripId` | Format UUID v4 |
| `id` | Format UUID v4 |
| `caught_at` | ISO 8601 datetime, w zakresie wyprawy |
| `species_id` | Format UUID v4 |
| `lure_id` | Format UUID v4, nie soft-deleted, własność użytkownika |
| `groundbait_id` | Format UUID v4, nie soft-deleted, własność użytkownika |
| `weight_g` | Integer > 0 lub null |
| `length_mm` | Integer > 0 lub null |
| `photo_path` | String lub null |
| `limit` | Integer 1-100 |
| `sort` | Enum: `caught_at`, `created_at` |
| `order` | Enum: `asc`, `desc` |

### 6.4 Walidacja biznesowa

**Realizowana w API (nie DB):**
- `caught_at` musi być >= `trip.started_at`
- `caught_at` musi być <= `trip.ended_at` (jeśli ended_at istnieje)

**Realizowana przez DB trigger:**
- `lure_id` musi należeć do właściciela wyprawy
- `groundbait_id` musi należeć do właściciela wyprawy
- Sprzęt nie może być soft-deleted

**Realizowana przez DB constraints (CHECK):**
- `weight_g IS NULL OR weight_g > 0`
- `length_mm IS NULL OR length_mm > 0`

### 6.5 Ochrona przed snapshotami w request

- Schema Zod z `strict()` mode odrzuca nieznane pola
- Jawne sprawdzenie i odrzucenie `lure_name_snapshot` oraz `groundbait_name_snapshot` w body
- Te pola są ZAWSZE wypełniane przez DB trigger

### 6.6 Ochrona przed atakami

| Zagrożenie | Mitygacja |
|------------|-----------|
| SQL Injection | Parametryzowane zapytania przez Supabase Client |
| XSS | Dane zwracane jako JSON, bez renderowania HTML |
| CSRF | Brak cookies sesyjnych, JWT w nagłówku |
| Mass Assignment | Strict Zod schema + jawne odrzucanie snapshot fields |
| IDOR | RLS + DB trigger + walidacja właściciela |
| Cross-user equipment | DB trigger blokuje |

---

## 7. Obsługa błędów

### 7.1 Tabela błędów

| Scenariusz | HTTP Status | Kod błędu | Wiadomość |
|------------|-------------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | `unauthorized` | Authentication required |
| Nieprawidłowy token | 401 | `unauthorized` | Invalid or expired token |
| Nieprawidłowy format UUID (tripId) | 400 | `validation_error` | Invalid trip UUID format |
| Nieprawidłowy format UUID (id) | 400 | `validation_error` | Invalid catch UUID format |
| Nieprawidłowy format datetime | 400 | `validation_error` | Invalid datetime format for caught_at |
| Brak wymaganych pól | 400 | `validation_error` | Missing required field: {field} |
| weight_g ≤ 0 | 400 | `validation_error` | weight_g must be greater than 0 |
| length_mm ≤ 0 | 400 | `validation_error` | length_mm must be greater than 0 |
| Próba ustawienia snapshot fields | 400 | `validation_error` | lure_name_snapshot cannot be set manually - it is computed by database |
| caught_at przed started_at | 400 | `validation_error` | caught_at must be on or after trip started_at |
| caught_at po ended_at | 400 | `validation_error` | caught_at must be on or before trip ended_at |
| Wyprawa nie znaleziona | 404 | `not_found` | Trip not found |
| Połów nie znaleziony | 404 | `not_found` | Catch not found |
| Przynęta innego użytkownika | 409 | `equipment_owner_mismatch` | Lure belongs to another user |
| Zanęta innego użytkownika | 409 | `equipment_owner_mismatch` | Groundbait belongs to another user |
| Przynęta soft-deleted | 409 | `equipment_soft_deleted` | Lure has been deleted |
| Zanęta soft-deleted | 409 | `equipment_soft_deleted` | Groundbait has been deleted |
| Gatunek nie znaleziony | 400 | `validation_error` | Species not found |
| Błąd DB constraint | 400 | `validation_error` | Database constraint violation |
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

### 7.3 Mapowanie błędów Supabase i DB trigger

```typescript
function mapCatchError(error: PostgrestError): { code: ApiErrorCode; message: string; status: number } {
  // DB trigger errors (raised exceptions)
  if (error.message?.includes("Przynęta należy do innego użytkownika")) {
    return { code: "equipment_owner_mismatch", message: "Lure belongs to another user", status: 409 };
  }
  if (error.message?.includes("Zanęta należy do innego użytkownika")) {
    return { code: "equipment_owner_mismatch", message: "Groundbait belongs to another user", status: 409 };
  }
  
  // CHECK constraint violations
  if (error.code === "23514") {
    if (error.message?.includes("weight")) {
      return { code: "validation_error", message: "weight_g must be greater than 0", status: 400 };
    }
    if (error.message?.includes("length")) {
      return { code: "validation_error", message: "length_mm must be greater than 0", status: 400 };
    }
    return { code: "validation_error", message: "Database constraint violation", status: 400 };
  }
  
  // Foreign key violations
  if (error.code === "23503") {
    if (error.message?.includes("species_id")) {
      return { code: "validation_error", message: "Species not found", status: 400 };
    }
    if (error.message?.includes("lure_id")) {
      return { code: "validation_error", message: "Lure not found", status: 400 };
    }
    if (error.message?.includes("groundbait_id")) {
      return { code: "validation_error", message: "Groundbait not found", status: 400 };
    }
    return { code: "validation_error", message: "Referenced resource not found", status: 400 };
  }
  
  // Not found (PGRST116 = single row expected, none returned)
  if (error.code === "PGRST116") {
    return { code: "not_found", message: "Catch not found", status: 404 };
  }
  
  // RLS violation
  if (error.code === "42501") {
    return { code: "not_found", message: "Catch not found", status: 404 };
  }
  
  // Default
  console.error("Unhandled Supabase error:", error);
  return { code: "internal_error", message: "Internal server error", status: 500 };
}
```

### 7.4 Logowanie błędów

- Błędy 5xx logowane z pełnym stack trace i request ID
- Błędy 4xx logowane jako info z request ID
- Błędy DB trigger logowane z kontekstem operacji
- Sanityzacja danych użytkownika przed logowaniem

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

Zgodnie z `db-plan.md`, wykorzystywane są następujące indeksy:

```sql
-- Lista połowów per wyprawa (główny use case)
CREATE INDEX idx_catches_trip_caught 
    ON catches (trip_id, caught_at);

-- Statystyki per gatunek
CREATE INDEX idx_catches_species 
    ON catches (species_id);
```

### 8.2 Optymalizacja zapytań

#### Lista połowów z filtrowaniem

```sql
SELECT 
  c.id, c.trip_id, c.caught_at, c.species_id,
  c.lure_id, c.groundbait_id,
  c.lure_name_snapshot, c.groundbait_name_snapshot,
  c.weight_g, c.length_mm, c.photo_path,
  c.created_at, c.updated_at
FROM catches c
WHERE c.trip_id = :tripId
  AND (:from IS NULL OR c.caught_at >= :from)
  AND (:to IS NULL OR c.caught_at <= :to)
  AND (:species_id IS NULL OR c.species_id = :species_id)
ORDER BY c.caught_at DESC, c.id DESC
LIMIT :limit + 1;
```

Wykorzystuje indeks `idx_catches_trip_caught` dla filtrowania i sortowania.

#### Pobieranie pojedynczego połowu

```typescript
const { data } = await supabase
  .from("catches")
  .select("*")
  .eq("id", id)
  .single();
```

Wykorzystuje primary key index.

### 8.3 Paginacja kursorowa

- Używana dla list połowów
- Kursor koduje `{sortValue, id}` w base64
- Stabilna wydajność niezależnie od offsetu
- Wykorzystuje indeks `idx_catches_trip_caught`

### 8.4 Limity

| Parametr | Wartość | Uzasadnienie |
|----------|---------|--------------|
| Domyślny limit | 20 | Typowy rozmiar strony listy połowów |
| Maksymalny limit | 100 | Ochrona przed DoS |
| Max photo_path length | 255 | Rozsądna długość ścieżki Storage |

### 8.5 Uwagi o triggerach DB

Triggery `check_catch_owner_consistency` i trigger do snapshotów wykonują dodatkowe zapytania przy INSERT/UPDATE:
- 1x SELECT do trips (pobranie user_id)
- 1x SELECT do lures (pobranie user_id i name)
- 1x SELECT do groundbaits (pobranie user_id i name)

Są to zapytania na primary key, więc są szybkie, ale warto mieć świadomość tego overhead'u.

---

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie struktury plików

1. **Utworzenie struktury katalogów:**
   ```
   src/
   ├── lib/
   │   ├── schemas/
   │   │   └── catch.schema.ts
   │   └── services/
   │       └── catch.service.ts
   └── pages/
       └── api/
           └── v1/
               ├── trips/
               │   └── [tripId]/
               │       └── catches/
               │           └── index.ts    # GET /trips/{tripId}/catches, POST
               └── catches/
                   └── [id]/
                       └── index.ts        # GET, PATCH, DELETE /catches/{id}
   ```

### Etap 2: Implementacja schematów walidacji

**Plik: `src/lib/schemas/catch.schema.ts`**

Utworzenie wszystkich schematów Zod opisanych w sekcji 3.2:
- `tripIdParamSchema`
- `catchIdParamSchema`
- `catchListQuerySchema`
- `createCatchSchema`
- `updateCatchSchema`

### Etap 3: Implementacja serwisu

**Plik: `src/lib/services/catch.service.ts`**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  CatchDto,
  CatchListResponseDto,
  CatchGetResponseDto,
  CreateCatchCommand,
  UpdateCatchCommand,
} from "@/types";
import type { CatchListQuery } from "@/lib/schemas/catch.schema";

interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string; status: number; details?: { field?: string; reason?: string } };
}

export class CatchService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lista połowów dla danej wyprawy z filtrowaniem i paginacją
   */
  async listByTripId(tripId: string, params: CatchListQuery): Promise<ServiceResult<CatchListResponseDto>> {
    // 1. Sprawdź czy wyprawa istnieje (RLS automatycznie sprawdza właściciela)
    // 2. Buduj zapytanie z filtrami
    // 3. Sortuj i paginuj kursorowo
    // 4. Zwróć wyniki
  }

  /**
   * Pobierz pojedynczy połów
   */
  async getById(id: string): Promise<ServiceResult<CatchGetResponseDto>> {
    // 1. SELECT catch WHERE id = ?
    // 2. RLS sprawdza właściciela przez trip_id
    // 3. Zwróć wynik lub 404
  }

  /**
   * Utwórz nowy połów
   */
  async create(tripId: string, data: CreateCatchCommand): Promise<ServiceResult<CatchDto>> {
    // 1. Pobierz wyprawę (started_at, ended_at)
    // 2. Waliduj caught_at w zakresie wyprawy
    // 3. INSERT (bez snapshot fields - trigger je uzupełni)
    // 4. Obsłuż błędy triggera (cross-user, soft-deleted)
    // 5. Zwróć utworzony połów
  }

  /**
   * Aktualizuj połów
   */
  async update(id: string, data: UpdateCatchCommand): Promise<ServiceResult<CatchDto>> {
    // 1. Pobierz istniejący połów z trip info
    // 2. Jeśli zmieniono caught_at - waliduj zakres
    // 3. UPDATE (trigger zaktualizuje snapshoty jeśli zmieniono lure_id/groundbait_id)
    // 4. Obsłuż błędy triggera
    // 5. Zwróć zaktualizowany połów
  }

  /**
   * Usuń połów (hard delete)
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    // 1. DELETE WHERE id = ? (RLS sprawdza właściciela)
    // 2. Sprawdź czy usunięto
    // 3. Zwróć sukces lub 404
  }

  // Prywatne metody pomocnicze

  private async getTripDateRange(tripId: string): Promise<{
    started_at: string;
    ended_at: string | null;
  } | null> {
    // Pobierz zakres dat wyprawy dla walidacji caught_at
  }

  private validateCaughtAtInTripRange(
    caughtAt: string,
    tripStartedAt: string,
    tripEndedAt: string | null
  ): { valid: boolean; error?: { field: string; reason: string } } {
    // Walidacja czy caught_at mieści się w zakresie wyprawy
  }

  private mapSupabaseError(error: PostgrestError): { code: string; message: string; status: number } {
    // Mapowanie błędów Supabase/trigger na API error codes
  }
}
```

### Etap 4: Implementacja endpointów API

#### 4.1 GET/POST `/api/v1/trips/[tripId]/catches` (index.ts)

```typescript
import type { APIRoute } from "astro";
import { tripIdParamSchema, catchListQuerySchema, createCatchSchema } from "@/lib/schemas/catch.schema";
import { CatchService } from "@/lib/services/catch.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const GET: APIRoute = async ({ params, locals, url }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // Validate path param
  const tripIdResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!tripIdResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  // Validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const queryResult = catchListQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    const firstError = queryResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new CatchService(supabase);
  const result = await service.listByTripId(tripIdResult.data.tripId, queryResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status, result.error.details);
  }

  return createSuccessResponse(result.data);
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // Validate path param
  const tripIdResult = tripIdParamSchema.safeParse({ tripId: params.tripId });
  if (!tripIdResult.success) {
    return createErrorResponse("validation_error", "Invalid trip UUID format", 400, { field: "tripId" });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  // Check for forbidden snapshot fields
  if (typeof body === "object" && body !== null) {
    if ("lure_name_snapshot" in body) {
      return createErrorResponse(
        "validation_error",
        "lure_name_snapshot cannot be set manually - it is computed by database",
        400,
        { field: "lure_name_snapshot" }
      );
    }
    if ("groundbait_name_snapshot" in body) {
      return createErrorResponse(
        "validation_error",
        "groundbait_name_snapshot cannot be set manually - it is computed by database",
        400,
        { field: "groundbait_name_snapshot" }
      );
    }
  }

  const parseResult = createCatchSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  const service = new CatchService(supabase);
  const result = await service.create(tripIdResult.data.tripId, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status, result.error.details);
  }

  return createSuccessResponse(result.data, 201);
};
```

#### 4.2 GET/PATCH/DELETE `/api/v1/catches/[id]` (index.ts)

```typescript
import type { APIRoute } from "astro";
import { catchIdParamSchema, updateCatchSchema } from "@/lib/schemas/catch.schema";
import { CatchService } from "@/lib/services/catch.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/response";

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const idResult = catchIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid catch UUID format", 400, { field: "id" });
  }

  const service = new CatchService(supabase);
  const result = await service.getById(idResult.data.id);

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

  const idResult = catchIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid catch UUID format", 400, { field: "id" });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Invalid JSON body", 400);
  }

  // Check for forbidden snapshot fields
  if (typeof body === "object" && body !== null) {
    if ("lure_name_snapshot" in body) {
      return createErrorResponse(
        "validation_error",
        "lure_name_snapshot cannot be set manually - it is computed by database",
        400,
        { field: "lure_name_snapshot" }
      );
    }
    if ("groundbait_name_snapshot" in body) {
      return createErrorResponse(
        "validation_error",
        "groundbait_name_snapshot cannot be set manually - it is computed by database",
        400,
        { field: "groundbait_name_snapshot" }
      );
    }
  }

  const parseResult = updateCatchSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      firstError.message,
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  // Check if body is empty (no fields to update)
  if (Object.keys(parseResult.data).length === 0) {
    return createErrorResponse("validation_error", "No fields to update", 400);
  }

  const service = new CatchService(supabase);
  const result = await service.update(idResult.data.id, parseResult.data);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status, result.error.details);
  }

  return createSuccessResponse(result.data);
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  const idResult = catchIdParamSchema.safeParse({ id: params.id });
  if (!idResult.success) {
    return createErrorResponse("validation_error", "Invalid catch UUID format", 400, { field: "id" });
  }

  const service = new CatchService(supabase);
  const result = await service.delete(idResult.data.id);

  if (result.error) {
    return createErrorResponse(result.error.code, result.error.message, result.error.status);
  }

  return new Response(null, { status: 204 });
};
```

### Etap 5: Implementacja szczegółowej logiki serwisu

#### 5.1 Metoda `listByTripId`

```typescript
async listByTripId(tripId: string, params: CatchListQuery): Promise<ServiceResult<CatchListResponseDto>> {
  const { from, to, species_id, limit, cursor, sort, order } = params;

  // Verify trip exists and user has access (RLS handles ownership)
  const { data: trip, error: tripError } = await this.supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .is("deleted_at", null)
    .single();

  if (tripError || !trip) {
    return { error: { code: "not_found", message: "Trip not found", status: 404 } };
  }

  // Build query
  let query = this.supabase
    .from("catches")
    .select("*")
    .eq("trip_id", tripId);

  // Apply filters
  if (from) {
    query = query.gte("caught_at", from);
  }
  if (to) {
    query = query.lte("caught_at", to);
  }
  if (species_id) {
    query = query.eq("species_id", species_id);
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
    return { error: this.mapSupabaseError(error) };
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

#### 5.2 Metoda `create`

```typescript
async create(tripId: string, data: CreateCatchCommand): Promise<ServiceResult<CatchDto>> {
  // 1. Get trip date range
  const tripRange = await this.getTripDateRange(tripId);
  if (!tripRange) {
    return { error: { code: "not_found", message: "Trip not found", status: 404 } };
  }

  // 2. Validate caught_at is within trip range
  const rangeValidation = this.validateCaughtAtInTripRange(
    data.caught_at,
    tripRange.started_at,
    tripRange.ended_at
  );
  if (!rangeValidation.valid) {
    return {
      error: {
        code: "validation_error",
        message: `caught_at ${rangeValidation.error!.reason}`,
        status: 400,
        details: rangeValidation.error,
      },
    };
  }

  // 3. Insert catch (without snapshot fields - DB trigger fills them)
  const { data: createdCatch, error } = await this.supabase
    .from("catches")
    .insert({
      trip_id: tripId,
      caught_at: data.caught_at,
      species_id: data.species_id,
      lure_id: data.lure_id,
      groundbait_id: data.groundbait_id,
      weight_g: data.weight_g ?? null,
      length_mm: data.length_mm ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: this.mapSupabaseError(error) };
  }

  return { data: createdCatch };
}
```

#### 5.3 Metoda `update`

```typescript
async update(id: string, data: UpdateCatchCommand): Promise<ServiceResult<CatchDto>> {
  // 1. Get existing catch with trip info
  const { data: existingCatch, error: fetchError } = await this.supabase
    .from("catches")
    .select(`
      *,
      trips!inner ( started_at, ended_at )
    `)
    .eq("id", id)
    .single();

  if (fetchError || !existingCatch) {
    return { error: { code: "not_found", message: "Catch not found", status: 404 } };
  }

  // 2. If caught_at is being updated, validate range
  if (data.caught_at !== undefined) {
    const rangeValidation = this.validateCaughtAtInTripRange(
      data.caught_at,
      existingCatch.trips.started_at,
      existingCatch.trips.ended_at
    );
    if (!rangeValidation.valid) {
      return {
        error: {
          code: "validation_error",
          message: `caught_at ${rangeValidation.error!.reason}`,
          status: 400,
          details: rangeValidation.error,
        },
      };
    }
  }

  // 3. Prepare update payload (exclude undefined values)
  const updatePayload: Record<string, unknown> = {};
  if (data.caught_at !== undefined) updatePayload.caught_at = data.caught_at;
  if (data.species_id !== undefined) updatePayload.species_id = data.species_id;
  if (data.lure_id !== undefined) updatePayload.lure_id = data.lure_id;
  if (data.groundbait_id !== undefined) updatePayload.groundbait_id = data.groundbait_id;
  if (data.weight_g !== undefined) updatePayload.weight_g = data.weight_g;
  if (data.length_mm !== undefined) updatePayload.length_mm = data.length_mm;
  if (data.photo_path !== undefined) updatePayload.photo_path = data.photo_path;

  // 4. Update (DB trigger will update snapshots if lure_id/groundbait_id changed)
  const { data: updatedCatch, error } = await this.supabase
    .from("catches")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: this.mapSupabaseError(error) };
  }

  return { data: updatedCatch };
}
```

#### 5.4 Metody pomocnicze

```typescript
private async getTripDateRange(tripId: string): Promise<{
  started_at: string;
  ended_at: string | null;
} | null> {
  const { data, error } = await this.supabase
    .from("trips")
    .select("started_at, ended_at")
    .eq("id", tripId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    started_at: data.started_at,
    ended_at: data.ended_at,
  };
}

private validateCaughtAtInTripRange(
  caughtAt: string,
  tripStartedAt: string,
  tripEndedAt: string | null
): { valid: boolean; error?: { field: string; reason: string } } {
  const caught = new Date(caughtAt);
  const started = new Date(tripStartedAt);

  if (caught < started) {
    return {
      valid: false,
      error: {
        field: "caught_at",
        reason: "must be on or after trip started_at",
      },
    };
  }

  if (tripEndedAt !== null) {
    const ended = new Date(tripEndedAt);
    if (caught > ended) {
      return {
        valid: false,
        error: {
          field: "caught_at",
          reason: "must be on or before trip ended_at",
        },
      };
    }
  }

  return { valid: true };
}
```

### Etap 6: Utworzenie helpera do obsługi odpowiedzi API

**Plik: `src/lib/api/response.ts`** (jeśli nie istnieje)

```typescript
import type { ApiErrorCode, ApiErrorDetails } from "@/types";

export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetails
): Response {
  const body = {
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
```

### Etap 7: Utworzenie helperów do paginacji kursorowej

**Plik: `src/lib/api/pagination.ts`** (jeśli nie istnieje)

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
      return data as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}
```

### Etap 8: Aktualizacja DB trigger (jeśli potrzebne)

Sprawdzić czy istniejący trigger `check_catch_owner_consistency` również:
1. Wypełnia `lure_name_snapshot` i `groundbait_name_snapshot`
2. Sprawdza czy sprzęt nie jest soft-deleted

Jeśli nie, dodać nowy trigger lub zmodyfikować istniejący:

```sql
-- Aktualizacja triggera dla snapshotów i walidacji soft-delete
CREATE OR REPLACE FUNCTION set_catch_snapshots_and_validate()
RETURNS TRIGGER AS $$
DECLARE
    v_lure_record RECORD;
    v_groundbait_record RECORD;
BEGIN
    -- Pobierz przynętę
    SELECT user_id, name, deleted_at INTO v_lure_record 
    FROM lures WHERE id = NEW.lure_id;
    
    -- Pobierz zanętę
    SELECT user_id, name, deleted_at INTO v_groundbait_record 
    FROM groundbaits WHERE id = NEW.groundbait_id;
    
    -- Sprawdź soft-delete
    IF v_lure_record.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Przynęta została usunięta';
    END IF;
    
    IF v_groundbait_record.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Zanęta została usunięta';
    END IF;
    
    -- Ustaw snapshoty
    NEW.lure_name_snapshot := v_lure_record.name;
    NEW.groundbait_name_snapshot := v_groundbait_record.name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Etap 9: Testowanie

**Scenariusze testowe:**

**Lista połowów:**
- ✅ Zwraca listę połowów dla danej wyprawy
- ✅ Filtruje po zakresie dat (from/to na caught_at)
- ✅ Filtruje po species_id
- ✅ Sortuje po caught_at i created_at
- ✅ Paginacja kursorowa działa poprawnie
- ✅ Zwraca 404 dla nieistniejącej wyprawy
- ✅ Nie zwraca połowów z cudzych wypraw (RLS)

**Tworzenie połowu:**
- ✅ Tworzy połów z poprawnymi danymi → 201
- ✅ Automatycznie uzupełnia snapshoty
- ✅ Odmawia gdy caught_at < trip.started_at → 400
- ✅ Odmawia gdy caught_at > trip.ended_at → 400
- ✅ Odmawia gdy lure/groundbait należy do innego użytkownika → 409
- ✅ Odmawia gdy lure/groundbait jest soft-deleted → 409
- ✅ Odmawia gdy przekazano snapshot fields → 400
- ✅ Akceptuje weight_g i length_mm jako null

**Pobieranie pojedynczego połowu:**
- ✅ Zwraca połów dla właściciela
- ✅ Zwraca 404 dla nieistniejącego połowu
- ✅ Zwraca 404 dla cudzego połowu (RLS)

**Aktualizacja połowu:**
- ✅ Aktualizuje dozwolone pola
- ✅ Aktualizuje snapshoty przy zmianie lure_id/groundbait_id
- ✅ Waliduje caught_at w zakresie wyprawy
- ✅ Odmawia aktualizacji snapshotów bezpośrednio → 400
- ✅ Pozwala ustawić weight_g/length_mm na null
- ✅ Pozwala ustawić photo_path na null (usunięcie)

**Usuwanie połowu:**
- ✅ Usuwa połów (hard delete) → 204
- ✅ Zwraca 404 dla nieistniejącego połowu
- ✅ Zwraca 404 dla cudzego połowu (RLS)

---

## 10. Podsumowanie

Plan implementacji obejmuje kompletny zestaw endpointów zarządzania połowami (catches) w aplikacji dziennika wędkarskiego. Kluczowe aspekty:

- **Automatyczne snapshoty**: Nazwy sprzętu są automatycznie zapisywane przez DB trigger, co zapewnia spójność danych historycznych nawet po zmianie nazw sprzętu
- **Wielowarstwowa walidacja**: Zod (API) + DB triggers + RLS + CHECK constraints
- **Bezpieczeństwo cross-user**: DB trigger + RLS gwarantują, że użytkownik nie może użyć cudzego sprzętu
- **Elastyczna walidacja dat**: caught_at walidowany w API (nie DB) dla lepszego UX
- **Hard delete**: Połowy są fizycznie usuwane (bez soft-delete)

**Estymowany czas implementacji:** 2-3 dni dla doświadczonego developera

**Zależności:**
- Wymaga wcześniejszej implementacji middleware Supabase (`src/db/supabase.client.ts`)
- Wymaga helperów API response i pagination (z trips-endpoints lub własne)
- Wymaga istniejących tabel DB (catches, trips, lures, groundbaits, fish_species)
- Wymaga działających triggerów DB dla snapshotów i walidacji cross-user

