# API Endpoint Implementation Plan: Trip Equipment Assignment

## 1. Przegląd punktu końcowego

Endpointy zarządzają przypisaniem sprzętu (wędek, przynęt, zanęt) do wypraw wędkarskich poprzez tabele pośrednie (`trip_rods`, `trip_lures`, `trip_groundbaits`). Snapshoty nazw sprzętu są automatycznie wypełniane przez triggery bazodanowe w momencie tworzenia przypisania.

**Obsługiwane operacje:**
- **GET** - pobierz listę przypisanego sprzętu dla wyprawy
- **PUT** - zamień całą selekcję sprzętu (idempotentne)
- **POST** - dodaj pojedynczy element sprzętu do selekcji
- **DELETE** - usuń pojedynczy element z selekcji

**Zasoby:**
- `/api/v1/trips/{tripId}/rods` - wędki
- `/api/v1/trips/{tripId}/lures` - przynęty
- `/api/v1/trips/{tripId}/groundbaits` - zanęty

---

## 2. Szczegóły żądania

### 2.1 GET `/trips/{tripId}/rods`

| Element | Wartość |
|---------|---------|
| Metoda HTTP | GET |
| URL | `/api/v1/trips/{tripId}/rods` |
| Autoryzacja | Bearer JWT (wymagany) |

**Path Parameters:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| tripId | UUID | Tak | Identyfikator wyprawy |

**Query Parameters:** Brak

**Request Body:** Brak

---

### 2.2 PUT `/trips/{tripId}/rods`

| Element | Wartość |
|---------|---------|
| Metoda HTTP | PUT |
| URL | `/api/v1/trips/{tripId}/rods` |
| Autoryzacja | Bearer JWT (wymagany) |
| Content-Type | application/json |

**Path Parameters:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| tripId | UUID | Tak | Identyfikator wyprawy |

**Request Body:**

```json
{
  "rod_ids": ["uuid", "uuid"]
}
```

| Pole | Typ | Wymagany | Walidacja |
|------|-----|----------|-----------|
| rod_ids | UUID[] | Tak | Tablica UUID; brak duplikatów; max 50 elementów |

---

### 2.3 POST `/trips/{tripId}/rods`

| Element | Wartość |
|---------|---------|
| Metoda HTTP | POST |
| URL | `/api/v1/trips/{tripId}/rods` |
| Autoryzacja | Bearer JWT (wymagany) |
| Content-Type | application/json |

**Path Parameters:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| tripId | UUID | Tak | Identyfikator wyprawy |

**Request Body:**

```json
{
  "rod_id": "uuid"
}
```

| Pole | Typ | Wymagany | Walidacja |
|------|-----|----------|-----------|
| rod_id | UUID | Tak | Poprawny format UUID |

---

### 2.4 DELETE `/trips/{tripId}/rods/{assignmentId}`

| Element | Wartość |
|---------|---------|
| Metoda HTTP | DELETE |
| URL | `/api/v1/trips/{tripId}/rods/{assignmentId}` |
| Autoryzacja | Bearer JWT (wymagany) |

**Path Parameters:**

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| tripId | UUID | Tak | Identyfikator wyprawy |
| assignmentId | UUID | Tak | Identyfikator rekordu junction table (`trip_rods.id`) |

**Request Body:** Brak

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy z `src/types.ts`

**DB Row Types:**
```typescript
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

**Response DTOs:**
```typescript
type TripRodDto = Pick<TripRodRow, "id" | "rod_id" | "rod_name_snapshot" | "created_at">;
type TripLureDto = Pick<TripLureRow, "id" | "lure_id" | "lure_name_snapshot" | "created_at">;
type TripGroundbaitDto = Pick<TripGroundbaitRow, "id" | "groundbait_id" | "groundbait_name_snapshot" | "created_at">;

interface TripRodsListResponseDto { data: TripRodDto[]; }
interface TripLuresListResponseDto { data: TripLureDto[]; }
interface TripGroundbaitsListResponseDto { data: TripGroundbaitDto[]; }

interface TripRodsPutResponseDto { data: TripRodDto[]; }
interface TripLuresPutResponseDto { data: TripLureDto[]; }
interface TripGroundbaitsPutResponseDto { data: TripGroundbaitDto[]; }
```

**Command Models:**
```typescript
interface PutTripRodsCommand { rod_ids: UUID[]; }
interface PostTripRodsCommand { rod_id: UUID; }

interface PutTripLuresCommand { lure_ids: UUID[]; }
interface PostTripLuresCommand { lure_id: UUID; }

interface PutTripGroundbaitsCommand { groundbait_ids: UUID[]; }
interface PostTripGroundbaitsCommand { groundbait_id: UUID; }
```

### 3.2 Nowe schematy walidacji Zod (do utworzenia)

**Plik: `src/lib/schemas/trip-equipment.schema.ts`**

```typescript
import { z } from "zod";

const MAX_EQUIPMENT_PER_TRIP = 50;

const uuidSchema = z.string().uuid("Nieprawidłowy format UUID");

// Rods
export const putTripRodsSchema = z.object({
  rod_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} wędek`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: "Duplikaty w liście rod_ids" }
    ),
});

export const postTripRodsSchema = z.object({
  rod_id: uuidSchema,
});

// Lures
export const putTripLuresSchema = z.object({
  lure_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} przynęt`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: "Duplikaty w liście lure_ids" }
    ),
});

export const postTripLuresSchema = z.object({
  lure_id: uuidSchema,
});

// Groundbaits
export const putTripGroundbaitsSchema = z.object({
  groundbait_ids: z
    .array(uuidSchema)
    .max(MAX_EQUIPMENT_PER_TRIP, `Maksymalnie ${MAX_EQUIPMENT_PER_TRIP} zanęt`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: "Duplikaty w liście groundbait_ids" }
    ),
});

export const postTripGroundbaitsSchema = z.object({
  groundbait_id: uuidSchema,
});

// Path params
export const tripIdParamSchema = z.object({
  tripId: uuidSchema,
});

export const equipmentAssignmentParamsSchema = z.object({
  tripId: uuidSchema,
  assignmentId: uuidSchema,
});
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET `/trips/{tripId}/rods`

**Sukces (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "rod_id": "uuid",
      "rod_name_snapshot": "Rod A",
      "created_at": "2025-12-12T10:05:00Z"
    }
  ]
}
```

### 4.2 PUT `/trips/{tripId}/rods`

**Sukces (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "rod_id": "uuid",
      "rod_name_snapshot": "Rod A",
      "created_at": "2025-12-12T10:05:00Z"
    }
  ]
}
```

### 4.3 POST `/trips/{tripId}/rods`

**Sukces (201):**
```json
{
  "id": "uuid",
  "rod_id": "uuid",
  "rod_name_snapshot": "Rod A",
  "created_at": "2025-12-12T10:05:00Z"
}
```

### 4.4 DELETE `/trips/{tripId}/rods/{assignmentId}`

**Sukces (204):** Brak treści

### 4.5 Odpowiedzi błędów

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human-readable message",
    "details": {
      "field": "rod_ids",
      "reason": "Duplikaty w liście"
    }
  }
}
```

---

## 5. Przepływ danych

### 5.1 Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Astro Route                               │
│  src/pages/api/v1/trips/[tripId]/rods/[...path].ts              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TripEquipmentService                          │
│  src/lib/services/trip-equipment.service.ts                     │
│  - listTripRods(supabase, tripId)                               │
│  - replaceTripRods(supabase, tripId, rodIds)                    │
│  - addTripRod(supabase, tripId, rodId)                          │
│  - removeTripRod(supabase, tripId, assignmentId)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Client (from context.locals)               │
│  - RLS: trip.user_id = auth.uid() AND deleted_at IS NULL        │
│  - Triggers: check_trip_equipment_owner                          │
│              fill_*_name_snapshot                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL (Supabase)                             │
│  Tables: trips, trip_rods, trip_lures, trip_groundbaits, rods   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Sekwencja operacji PUT (zamiana selekcji)

1. Walidacja `tripId` (UUID)
2. Walidacja request body (Zod schema)
3. Weryfikacja istnienia tripu (RLS automatycznie)
4. Transakcja:
   a. DELETE wszystkich istniejących przypisań dla tripId
   b. INSERT nowych przypisań (bez `rod_name_snapshot` - trigger wypełnia)
5. SELECT nowo utworzonych rekordów (z wypełnionymi snapshotami)
6. Zwrócenie odpowiedzi

### 5.3 Diagram sekwencji GET

```
Client          Route Handler       Service          Supabase DB
  │                  │                  │                  │
  │ GET /trips/{id}/rods               │                  │
  │─────────────────>│                  │                  │
  │                  │ validate tripId  │                  │
  │                  │─────────────────>│                  │
  │                  │                  │ SELECT FROM      │
  │                  │                  │ trip_rods        │
  │                  │                  │ WHERE trip_id    │
  │                  │                  │─────────────────>│
  │                  │                  │    (RLS check)   │
  │                  │                  │<─────────────────│
  │                  │<─────────────────│                  │
  │   200 { data }   │                  │                  │
  │<─────────────────│                  │                  │
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie

- **Mechanizm:** Supabase Auth JWT w nagłówku `Authorization: Bearer <token>`
- **Weryfikacja:** Middleware Astro (`src/middleware/index.ts`) weryfikuje token i ustawia `context.locals.supabase`
- **Wymagane:** Wszystkie endpointy wymagają uwierzytelnienia

### 6.2 Autoryzacja

- **RLS (Row Level Security):** Polityki na `trip_rods`, `trip_lures`, `trip_groundbaits` sprawdzają:
  ```sql
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = trip_rods.trip_id 
      AND trips.user_id = auth.uid()
      AND trips.deleted_at IS NULL
  )
  ```

- **Trigger cross-user protection:** `check_trip_equipment_owner` blokuje przypisanie sprzętu należącego do innego użytkownika

### 6.3 Walidacja danych wejściowych

| Warstwa | Walidacja |
|---------|-----------|
| Route | Zod schema dla path params i body |
| Service | Dodatkowe sprawdzenia biznesowe |
| Database | CHECK constraints, UNIQUE constraints, triggers |

### 6.4 Ochrona przed atakami

- **SQL Injection:** Supabase SDK parametryzuje zapytania
- **Mass Assignment:** Tylko pola zdefiniowane w Zod schema są akceptowane
- **Cross-user access:** RLS + trigger `check_trip_equipment_owner`
- **Soft-deleted equipment:** Trigger weryfikuje `deleted_at IS NULL`

---

## 7. Obsługa błędów

### 7.1 Kody błędów HTTP

| Kod HTTP | Kod błędu | Scenariusz |
|----------|-----------|------------|
| 400 | `validation_error` | Nieprawidłowy UUID, duplikaty, przekroczony limit |
| 401 | `unauthorized` | Brak lub nieprawidłowy token JWT |
| 404 | `not_found` | Trip nie istnieje, jest soft-deleted, lub assignment nie istnieje |
| 409 | `conflict` | Naruszenie UNIQUE (trip_id, rod_id) |
| 409 | `equipment_owner_mismatch` | Sprzęt należy do innego użytkownika (trigger) |
| 409 | `equipment_soft_deleted` | Sprzęt jest soft-deleted (trigger) |
| 500 | `internal_error` | Nieoczekiwany błąd serwera |

### 7.2 Mapowanie błędów Supabase

**Plik: `src/lib/errors/supabase-error-mapper.ts`**

```typescript
import type { PostgrestError } from "@supabase/supabase-js";
import type { ApiErrorCode } from "@/types";

interface MappedError {
  code: ApiErrorCode;
  message: string;
  httpStatus: number;
}

export function mapSupabaseError(error: PostgrestError): MappedError {
  // Unique constraint violation
  if (error.code === "23505") {
    if (error.message.includes("trip_rods_unique") || 
        error.message.includes("trip_lures_unique") ||
        error.message.includes("trip_groundbaits_unique")) {
      return {
        code: "conflict",
        message: "Ten sprzęt jest już przypisany do wyprawy",
        httpStatus: 409,
      };
    }
  }

  // Trigger exceptions (P0001 = raise_exception)
  if (error.code === "P0001") {
    if (error.message.includes("innego użytkownika")) {
      return {
        code: "equipment_owner_mismatch",
        message: "Sprzęt należy do innego użytkownika",
        httpStatus: 409,
      };
    }
    if (error.message.includes("soft-deleted") || error.message.includes("usunięty")) {
      return {
        code: "equipment_soft_deleted",
        message: "Sprzęt został usunięty",
        httpStatus: 409,
      };
    }
  }

  // Foreign key violation
  if (error.code === "23503") {
    return {
      code: "not_found",
      message: "Powiązany zasób nie istnieje",
      httpStatus: 404,
    };
  }

  // RLS violation (row not found due to policy)
  if (error.code === "PGRST116") {
    return {
      code: "not_found",
      message: "Zasób nie został znaleziony",
      httpStatus: 404,
    };
  }

  // Default
  return {
    code: "internal_error",
    message: "Wystąpił błąd serwera",
    httpStatus: 500,
  };
}
```

### 7.3 Przykłady odpowiedzi błędów

**400 - Validation Error:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "field": "rod_ids",
      "reason": "Duplikaty w liście rod_ids"
    }
  }
}
```

**409 - Conflict (duplicate assignment):**
```json
{
  "error": {
    "code": "conflict",
    "message": "Ten sprzęt jest już przypisany do wyprawy"
  }
}
```

**409 - Equipment Owner Mismatch:**
```json
{
  "error": {
    "code": "equipment_owner_mismatch",
    "message": "Sprzęt należy do innego użytkownika"
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazodanowe

Istniejące indeksy (z `db-plan.md`):
```sql
CREATE INDEX idx_trip_rods_trip ON trip_rods (trip_id);
CREATE INDEX idx_trip_lures_trip ON trip_lures (trip_id);
CREATE INDEX idx_trip_groundbaits_trip ON trip_groundbaits (trip_id);
```

### 8.2 Optymalizacja PUT (zamiana selekcji)

Zamiast DELETE + INSERT dla wszystkich elementów:

```typescript
async replaceTripRods(tripId: UUID, newRodIds: UUID[]): Promise<TripRodDto[]> {
  // 1. Pobierz aktualne przypisania
  const { data: current } = await supabase
    .from("trip_rods")
    .select("rod_id")
    .eq("trip_id", tripId);

  const currentIds = new Set(current?.map(r => r.rod_id) ?? []);
  const newIds = new Set(newRodIds);

  // 2. Oblicz różnicę
  const toDelete = [...currentIds].filter(id => !newIds.has(id));
  const toInsert = newRodIds.filter(id => !currentIds.has(id));

  // 3. Wykonaj operacje tylko dla zmian
  if (toDelete.length > 0) {
    await supabase
      .from("trip_rods")
      .delete()
      .eq("trip_id", tripId)
      .in("rod_id", toDelete);
  }

  if (toInsert.length > 0) {
    await supabase
      .from("trip_rods")
      .insert(toInsert.map(rod_id => ({ trip_id: tripId, rod_id })));
  }

  // 4. Pobierz zaktualizowaną listę
  return this.listTripRods(tripId);
}
```

### 8.3 Batch Insert

Supabase obsługuje batch insert:
```typescript
await supabase.from("trip_rods").insert([
  { trip_id: tripId, rod_id: rodId1 },
  { trip_id: tripId, rod_id: rodId2 },
]);
```

### 8.4 Limity

| Parametr | Limit | Uzasadnienie |
|----------|-------|--------------|
| Max rod_ids per PUT | 50 | Rozsądna liczba wędek na wyprawę |
| Max lure_ids per PUT | 50 | Rozsądna liczba przynęt |
| Max groundbait_ids per PUT | 50 | Rozsądna liczba zanęt |

---

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie infrastruktury

1. **Utworzenie schematu walidacji Zod**
   - Plik: `src/lib/schemas/trip-equipment.schema.ts`
   - Zawartość: schematy dla PUT/POST body i path params

2. **Utworzenie mappera błędów Supabase**
   - Plik: `src/lib/errors/supabase-error-mapper.ts`
   - Funkcja mapująca kody błędów PostgreSQL na odpowiedzi API

3. **Utworzenie helpera odpowiedzi HTTP**
   - Plik: `src/lib/api/response.ts`
   - Funkcje: `jsonResponse()`, `errorResponse()`, `noContentResponse()`

### Etap 2: Implementacja serwisu

4. **Utworzenie TripEquipmentService**
   - Plik: `src/lib/services/trip-equipment.service.ts`
   - Metody dla rods:
     - `listTripRods(supabase, tripId)`
     - `replaceTripRods(supabase, tripId, rodIds)`
     - `addTripRod(supabase, tripId, rodId)`
     - `removeTripRod(supabase, tripId, assignmentId)`
   - Analogiczne metody dla lures i groundbaits

5. **Helper weryfikacji istnienia tripu**
   - Funkcja `verifyTripExists(supabase, tripId)` w serwisie
   - Zwraca `true` lub rzuca 404

### Etap 3: Implementacja route handlers (Rods)

6. **GET /trips/[tripId]/rods**
   - Plik: `src/pages/api/v1/trips/[tripId]/rods/index.ts`
   - Eksportuje `GET` handler

7. **PUT /trips/[tripId]/rods**
   - W tym samym pliku eksportuje `PUT` handler

8. **POST /trips/[tripId]/rods**
   - W tym samym pliku eksportuje `POST` handler

9. **DELETE /trips/[tripId]/rods/[assignmentId]**
   - Plik: `src/pages/api/v1/trips/[tripId]/rods/[assignmentId].ts`
   - Eksportuje `DELETE` handler

### Etap 4: Implementacja route handlers (Lures)

10. **GET/PUT/POST /trips/[tripId]/lures**
    - Plik: `src/pages/api/v1/trips/[tripId]/lures/index.ts`

11. **DELETE /trips/[tripId]/lures/[assignmentId]**
    - Plik: `src/pages/api/v1/trips/[tripId]/lures/[assignmentId].ts`

### Etap 5: Implementacja route handlers (Groundbaits)

12. **GET/PUT/POST /trips/[tripId]/groundbaits**
    - Plik: `src/pages/api/v1/trips/[tripId]/groundbaits/index.ts`

13. **DELETE /trips/[tripId]/groundbaits/[assignmentId]**
    - Plik: `src/pages/api/v1/trips/[tripId]/groundbaits/[assignmentId].ts`

### Etap 6: Weryfikacja triggerów bazodanowych

14. **Sprawdzenie triggera snapshot fill**
    - Weryfikacja, że trigger `fill_rod_name_snapshot` (lub analogiczny) istnieje
    - Jeśli nie istnieje - utworzenie migracji

15. **Sprawdzenie triggera soft-delete protection**
    - Weryfikacja, że trigger blokuje przypisanie soft-deleted sprzętu
    - Jeśli nie istnieje - utworzenie migracji

### Etap 7: Testy i dokumentacja

16. **Testy integracyjne**
    - Test każdego endpointa
    - Test scenariuszy błędów
    - Test RLS i triggerów

17. **Aktualizacja dokumentacji API**
    - Dodanie przykładów curl/fetch
    - Opis kodów błędów

---

## 10. Przykłady implementacji

### 10.1 Route Handler (GET/PUT/POST rods)

**Plik: `src/pages/api/v1/trips/[tripId]/rods/index.ts`**

```typescript
import type { APIRoute } from "astro";
import { tripEquipmentService } from "@/lib/services/trip-equipment.service";
import { 
  tripIdParamSchema, 
  putTripRodsSchema, 
  postTripRodsSchema 
} from "@/lib/schemas/trip-equipment.schema";
import { jsonResponse, errorResponse, createdResponse } from "@/lib/api/response";
import type { TripRodsListResponseDto, TripRodsPutResponseDto, TripRodDto } from "@/types";

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return errorResponse(401, "unauthorized", "Wymagana autoryzacja");
  }

  const parseResult = tripIdParamSchema.safeParse(params);
  if (!parseResult.success) {
    return errorResponse(400, "validation_error", "Nieprawidłowy tripId", {
      field: "tripId",
      reason: parseResult.error.issues[0]?.message,
    });
  }

  const { tripId } = parseResult.data;

  const result = await tripEquipmentService.listTripRods(supabase, tripId);
  
  if (result.error) {
    return errorResponse(result.error.httpStatus, result.error.code, result.error.message);
  }

  const response: TripRodsListResponseDto = { data: result.data };
  return jsonResponse(200, response);
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return errorResponse(401, "unauthorized", "Wymagana autoryzacja");
  }

  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    return errorResponse(400, "validation_error", "Nieprawidłowy tripId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "validation_error", "Nieprawidłowy JSON");
  }

  const bodyParseResult = putTripRodsSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return errorResponse(400, "validation_error", "Nieprawidłowe dane wejściowe", {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { rod_ids } = bodyParseResult.data;

  const result = await tripEquipmentService.replaceTripRods(supabase, tripId, rod_ids);

  if (result.error) {
    return errorResponse(result.error.httpStatus, result.error.code, result.error.message);
  }

  const response: TripRodsPutResponseDto = { data: result.data };
  return jsonResponse(200, response);
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return errorResponse(401, "unauthorized", "Wymagana autoryzacja");
  }

  const paramParseResult = tripIdParamSchema.safeParse(params);
  if (!paramParseResult.success) {
    return errorResponse(400, "validation_error", "Nieprawidłowy tripId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "validation_error", "Nieprawidłowy JSON");
  }

  const bodyParseResult = postTripRodsSchema.safeParse(body);
  if (!bodyParseResult.success) {
    const issue = bodyParseResult.error.issues[0];
    return errorResponse(400, "validation_error", "Nieprawidłowe dane wejściowe", {
      field: issue?.path.join("."),
      reason: issue?.message,
    });
  }

  const { tripId } = paramParseResult.data;
  const { rod_id } = bodyParseResult.data;

  const result = await tripEquipmentService.addTripRod(supabase, tripId, rod_id);

  if (result.error) {
    return errorResponse(result.error.httpStatus, result.error.code, result.error.message);
  }

  return createdResponse<TripRodDto>(result.data);
};
```

### 10.2 TripEquipmentService (fragment)

**Plik: `src/lib/services/trip-equipment.service.ts`**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { UUID, TripRodDto } from "@/types";
import { mapSupabaseError } from "@/lib/errors/supabase-error-mapper";

type ServiceResult<T> = 
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; httpStatus: number } };

export const tripEquipmentService = {
  async listTripRods(
    supabase: SupabaseClient,
    tripId: UUID
  ): Promise<ServiceResult<TripRodDto[]>> {
    // Weryfikacja istnienia tripu (RLS automatycznie sprawdzi ownership)
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (tripError || !trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    const { data, error } = await supabase
      .from("trip_rods")
      .select("id, rod_id, rod_name_snapshot, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data: data ?? [], error: null };
  },

  async replaceTripRods(
    supabase: SupabaseClient,
    tripId: UUID,
    rodIds: UUID[]
  ): Promise<ServiceResult<TripRodDto[]>> {
    // Weryfikacja istnienia tripu
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (tripError || !trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    // Transakcja: usuń wszystkie, wstaw nowe
    // Supabase nie ma natywnych transakcji w JS SDK, więc używamy RPC lub sekwencji
    
    // 1. Usuń istniejące
    const { error: deleteError } = await supabase
      .from("trip_rods")
      .delete()
      .eq("trip_id", tripId);

    if (deleteError) {
      const mapped = mapSupabaseError(deleteError);
      return { data: null, error: mapped };
    }

    // 2. Wstaw nowe (jeśli są)
    if (rodIds.length > 0) {
      const { error: insertError } = await supabase
        .from("trip_rods")
        .insert(rodIds.map(rod_id => ({ trip_id: tripId, rod_id })));

      if (insertError) {
        const mapped = mapSupabaseError(insertError);
        return { data: null, error: mapped };
      }
    }

    // 3. Pobierz zaktualizowaną listę
    return this.listTripRods(supabase, tripId);
  },

  async addTripRod(
    supabase: SupabaseClient,
    tripId: UUID,
    rodId: UUID
  ): Promise<ServiceResult<TripRodDto>> {
    // Weryfikacja istnienia tripu
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .is("deleted_at", null)
      .single();

    if (tripError || !trip) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Wyprawa nie została znaleziona",
          httpStatus: 404,
        },
      };
    }

    const { data, error } = await supabase
      .from("trip_rods")
      .insert({ trip_id: tripId, rod_id: rodId })
      .select("id, rod_id, rod_name_snapshot, created_at")
      .single();

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    return { data, error: null };
  },

  async removeTripRod(
    supabase: SupabaseClient,
    tripId: UUID,
    assignmentId: UUID
  ): Promise<ServiceResult<null>> {
    const { error, count } = await supabase
      .from("trip_rods")
      .delete()
      .eq("id", assignmentId)
      .eq("trip_id", tripId);

    if (error) {
      const mapped = mapSupabaseError(error);
      return { data: null, error: mapped };
    }

    // Supabase delete zwraca count=0 jeśli RLS lub warunek nie pasuje
    if (count === 0) {
      return {
        data: null,
        error: {
          code: "not_found",
          message: "Przypisanie nie zostało znalezione",
          httpStatus: 404,
        },
      };
    }

    return { data: null, error: null };
  },

  // Analogiczne metody dla lures i groundbaits...
};
```

### 10.3 Migracja triggera snapshot fill (jeśli brakuje)

**Plik: `supabase/migrations/YYYYMMDDHHMMSS_add_equipment_snapshot_triggers.sql`**

```sql
-- Trigger wypełniający rod_name_snapshot
CREATE OR REPLACE FUNCTION fill_trip_rod_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    SELECT name INTO NEW.rod_name_snapshot
    FROM rods
    WHERE id = NEW.rod_id;
    
    -- Sprawdź czy rod istnieje i nie jest soft-deleted
    IF NEW.rod_name_snapshot IS NULL THEN
        RAISE EXCEPTION 'Wędka nie istnieje lub została usunięta';
    END IF;
    
    -- Sprawdź soft-delete
    IF EXISTS (SELECT 1 FROM rods WHERE id = NEW.rod_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Wędka została usunięta (soft-deleted)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fill_trip_rod_snapshot_trigger
    BEFORE INSERT ON trip_rods
    FOR EACH ROW
    EXECUTE FUNCTION fill_trip_rod_snapshot();

-- Analogiczne triggery dla trip_lures i trip_groundbaits...
```

---

## 11. Checklist wdrożenia

- [ ] Utworzenie `src/lib/schemas/trip-equipment.schema.ts`
- [ ] Utworzenie `src/lib/errors/supabase-error-mapper.ts`
- [ ] Utworzenie `src/lib/api/response.ts`
- [ ] Utworzenie `src/lib/services/trip-equipment.service.ts`
- [ ] Implementacja route handlers dla rods
- [ ] Implementacja route handlers dla lures
- [ ] Implementacja route handlers dla groundbaits
- [ ] Weryfikacja/utworzenie triggerów bazodanowych
- [ ] Testy integracyjne
- [ ] Code review
- [ ] Deployment na środowisko testowe
- [ ] Testy akceptacyjne
- [ ] Deployment na produkcję

