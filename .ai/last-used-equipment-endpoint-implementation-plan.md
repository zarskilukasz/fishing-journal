# API Endpoint Implementation Plan: GET /me/last-used-equipment

## 1. Przegląd punktu końcowego

Endpoint `GET /api/v1/me/last-used-equipment` to convenience endpoint, który zwraca wybór sprzętu z ostatniej nieusunietej (soft-delete) wyprawy użytkownika. Służy do wspierania funkcjonalności "zapamiętaj ostatni zestaw" przy tworzeniu nowej wyprawy, umożliwiając szybkie skopiowanie poprzednio użytego sprzętu.

**Główne funkcje:**
- Pobiera ostatnią (wg `started_at DESC`) wyprawę użytkownika, która nie została usunięta
- Zwraca listę wędek, przynęt i zanęt przypisanych do tej wyprawy
- Zawiera snapshot nazw sprzętu (historyczna nazwa w momencie przypisania)

---

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/v1/me/last-used-equipment`
- **Parametry:**
  - **Wymagane:** Brak
  - **Opcjonalne:** Brak
- **Request Body:** Brak (metoda GET)
- **Nagłówki wymagane:**
  - `Authorization: Bearer <supabase_jwt>` - token JWT użytkownika

---

## 3. Wykorzystywane typy

### 3.1. DTO odpowiedzi

Typ już zdefiniowany w `src/types.ts`:

```typescript
export interface LastUsedEquipmentResponseDto {
  source_trip_id: TripRow["id"];
  rods: Pick<TripRodRow, "rod_id" | "rod_name_snapshot">[];
  lures: Pick<TripLureRow, "lure_id" | "lure_name_snapshot">[];
  groundbaits: Pick<TripGroundbaitRow, "groundbait_id" | "groundbait_name_snapshot">[];
}
```

### 3.2. Typy z bazy danych (używane wewnętrznie)

```typescript
// Już zdefiniowane w src/types.ts
interface TripRow { ... }
interface TripRodRow { ... }
interface TripLureRow { ... }
interface TripGroundbaitRow { ... }
```

### 3.3. Schemat walidacji Zod (opcjonalny dla odpowiedzi)

```typescript
// src/lib/schemas/last-used-equipment.schema.ts
import { z } from "zod";

export const lastUsedEquipmentResponseSchema = z.object({
  source_trip_id: z.string().uuid(),
  rods: z.array(z.object({
    rod_id: z.string().uuid(),
    rod_name_snapshot: z.string()
  })),
  lures: z.array(z.object({
    lure_id: z.string().uuid(),
    lure_name_snapshot: z.string()
  })),
  groundbaits: z.array(z.object({
    groundbait_id: z.string().uuid(),
    groundbait_name_snapshot: z.string()
  }))
});
```

---

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

```json
{
  "source_trip_id": "uuid",
  "rods": [
    { "rod_id": "uuid", "rod_name_snapshot": "Rod A" }
  ],
  "lures": [
    { "lure_id": "uuid", "lure_name_snapshot": "Lure A" }
  ],
  "groundbaits": [
    { "groundbait_id": "uuid", "groundbait_name_snapshot": "Groundbait A" }
  ]
}
```

### 4.2. Błędy

| Status Code | Error Code | Opis |
|-------------|------------|------|
| 401 | `unauthorized` | Brak lub nieprawidłowy token JWT |
| 404 | `not_found` | Użytkownik nie ma żadnych wypraw |
| 500 | (internal) | Błąd serwera lub bazy danych |

**Format błędu:**

```json
{
  "error": {
    "code": "not_found",
    "message": "No trips found for user"
  }
}
```

---

## 5. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────┐
│                         Klient                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ GET /api/v1/me/last-used-equipment
                                │ Authorization: Bearer <jwt>
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Astro API Route                                     │
│              src/pages/api/v1/me/last-used-equipment.ts         │
│                                                                  │
│  1. Pobierz supabase client z context.locals                    │
│  2. Sprawdź autentykację (getUser())                            │
│  3. Wywołaj LastUsedEquipmentService.getLastUsedEquipment()     │
│  4. Zwróć odpowiedź lub błąd                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              LastUsedEquipmentService                            │
│              src/lib/services/last-used-equipment.service.ts    │
│                                                                  │
│  1. Zapytanie o ostatnią wyprawę użytkownika                    │
│  2. Zapytania o junction tables (trip_rods, trip_lures,         │
│     trip_groundbaits)                                           │
│  3. Formatowanie odpowiedzi                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                         │
│                                                                  │
│  Tabele:                                                        │
│  - trips (user_id, deleted_at IS NULL, ORDER BY started_at)     │
│  - trip_rods (trip_id, rod_id, rod_name_snapshot)               │
│  - trip_lures (trip_id, lure_id, lure_name_snapshot)            │
│  - trip_groundbaits (trip_id, groundbait_id,                    │
│    groundbait_name_snapshot)                                    │
│                                                                  │
│  RLS: Automatyczna izolacja danych per user                     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.1. Zapytania do bazy danych

**Zapytanie 1: Pobranie ostatniej wyprawy**

```sql
SELECT id
FROM trips
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
ORDER BY started_at DESC
LIMIT 1;
```

**Zapytanie 2: Pobranie sprzętu (3 równoległe zapytania)**

```sql
-- Wędki
SELECT rod_id, rod_name_snapshot
FROM trip_rods
WHERE trip_id = $tripId;

-- Przynęty
SELECT lure_id, lure_name_snapshot
FROM trip_lures
WHERE trip_id = $tripId;

-- Zanęty
SELECT groundbait_id, groundbait_name_snapshot
FROM trip_groundbaits
WHERE trip_id = $tripId;
```

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- **JWT Bearer Token** wymagany w nagłówku `Authorization`
- Walidacja tokenu przez Supabase Auth (`supabase.auth.getUser()`)
- Odrzucenie żądań bez tokenu lub z nieprawidłowym tokenem (401)

### 6.2. Autoryzacja

- **RLS (Row Level Security)** na tabelach:
  - `trips`: `user_id = auth.uid()`
  - `trip_rods`, `trip_lures`, `trip_groundbaits`: dostęp przez relację z `trips`
- Użytkownik widzi tylko swoje dane - automatycznie dzięki RLS

### 6.3. Ochrona przed nadużyciami

- Endpoint jest read-only (GET), niskie ryzyko nadużyć
- Standardowe limity rate-limiting na poziomie infrastruktury (jeśli skonfigurowane)
- Brak danych wejściowych do walidacji = brak ryzyka injection

### 6.4. Zasady implementacji

- Używać `context.locals.supabase` zamiast bezpośredniego importu klienta
- Nie używać `service_role` key - tylko user-scoped client

---

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Scenariusz | Kod statusu | Kod błędu | Wiadomość |
|------------|-------------|-----------|-----------|
| Brak tokenu JWT | 401 | `unauthorized` | "Authentication required" |
| Nieprawidłowy/wygasły token | 401 | `unauthorized` | "Invalid or expired token" |
| Brak wypraw użytkownika | 404 | `not_found` | "No trips found for user" |
| Błąd bazy danych | 500 | (internal) | "Internal server error" |

### 7.2. Implementacja obsługi błędów

```typescript
// Wzorzec early return dla błędów
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  
  // 1. Sprawdź autentykację
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "unauthorized",
          message: "Authentication required"
        }
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Pobierz dane z serwisu
  const result = await lastUsedEquipmentService.getLastUsedEquipment(supabase, user.id);
  
  if (result.error) {
    // Obsłuż różne typy błędów
    if (result.error.code === "not_found") {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    // Inne błędy -> 500
    return new Response(
      JSON.stringify({
        error: {
          code: "internal_error",
          message: "Internal server error"
        }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Sukces
  return new Response(
    JSON.stringify(result.data),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacja zapytań

- **Indeks na trips:** `idx_trips_user_started` już istnieje w bazie danych:
  ```sql
  CREATE INDEX idx_trips_user_started 
    ON trips (user_id, started_at DESC) 
    WHERE deleted_at IS NULL;
  ```
  Ten indeks idealnie pasuje do naszego zapytania.

- **Indeksy na junction tables:** Istniejące indeksy:
  ```sql
  CREATE INDEX idx_trip_rods_trip ON trip_rods (trip_id);
  CREATE INDEX idx_trip_lures_trip ON trip_lures (trip_id);
  CREATE INDEX idx_trip_groundbaits_trip ON trip_groundbaits (trip_id);
  ```

### 8.2. Strategia wykonania

- **Sekwencyjne zapytania:** Najpierw pobierz trip_id, potem sprzęt
- **Równoległe zapytania dla sprzętu:** Po uzyskaniu trip_id, wykonaj 3 zapytania równolegle za pomocą `Promise.all()`

### 8.3. Cache (opcjonalnie)

- Endpoint zwraca dane, które rzadko się zmieniają
- Można rozważyć krótki cache (np. 5 min) po stronie klienta
- Nagłówki cache: `Cache-Control: private, max-age=300`

### 8.4. Oczekiwana wydajność

- **Złożoność:** O(1) dla znalezienia ostatniej wyprawy (dzięki indeksowi)
- **Oczekiwany czas odpowiedzi:** < 100ms w normalnych warunkach
- **Payload size:** Mały (lista sprzętu typowo 1-10 elementów każda)

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji (opcjonalny)

**Plik:** `src/lib/schemas/last-used-equipment.schema.ts`

```typescript
import { z } from "zod";

export const lastUsedEquipmentResponseSchema = z.object({
  source_trip_id: z.string().uuid(),
  rods: z.array(z.object({
    rod_id: z.string().uuid(),
    rod_name_snapshot: z.string()
  })),
  lures: z.array(z.object({
    lure_id: z.string().uuid(),
    lure_name_snapshot: z.string()
  })),
  groundbaits: z.array(z.object({
    groundbait_id: z.string().uuid(),
    groundbait_name_snapshot: z.string()
  }))
});

export type LastUsedEquipmentResponse = z.infer<typeof lastUsedEquipmentResponseSchema>;
```

---

### Krok 2: Utworzenie serwisu

**Plik:** `src/lib/services/last-used-equipment.service.ts`

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { UUID, LastUsedEquipmentResponseDto } from "../../types";

interface ServiceResult<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class LastUsedEquipmentService {
  
  async getLastUsedEquipment(
    supabase: SupabaseClient,
    userId: UUID
  ): Promise<ServiceResult<LastUsedEquipmentResponseDto>> {
    
    // 1. Pobierz ostatnią wyprawę użytkownika
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (tripError) {
      // PGRST116 = no rows returned
      if (tripError.code === "PGRST116") {
        return {
          error: {
            code: "not_found",
            message: "No trips found for user"
          }
        };
      }
      console.error("Error fetching last trip:", tripError);
      return {
        error: {
          code: "internal_error",
          message: "Failed to fetch trip data"
        }
      };
    }

    const tripId = trip.id;

    // 2. Pobierz sprzęt równolegle
    const [rodsResult, luresResult, groundbaitsResult] = await Promise.all([
      supabase
        .from("trip_rods")
        .select("rod_id, rod_name_snapshot")
        .eq("trip_id", tripId),
      supabase
        .from("trip_lures")
        .select("lure_id, lure_name_snapshot")
        .eq("trip_id", tripId),
      supabase
        .from("trip_groundbaits")
        .select("groundbait_id, groundbait_name_snapshot")
        .eq("trip_id", tripId)
    ]);

    // 3. Sprawdź błędy
    if (rodsResult.error || luresResult.error || groundbaitsResult.error) {
      console.error("Error fetching equipment:", {
        rods: rodsResult.error,
        lures: luresResult.error,
        groundbaits: groundbaitsResult.error
      });
      return {
        error: {
          code: "internal_error",
          message: "Failed to fetch equipment data"
        }
      };
    }

    // 4. Zbuduj odpowiedź
    return {
      data: {
        source_trip_id: tripId,
        rods: rodsResult.data ?? [],
        lures: luresResult.data ?? [],
        groundbaits: groundbaitsResult.data ?? []
      }
    };
  }
}

export const lastUsedEquipmentService = new LastUsedEquipmentService();
```

---

### Krok 3: Utworzenie route API

**Plik:** `src/pages/api/v1/me/last-used-equipment.ts`

```typescript
import type { APIContext } from "astro";
import { lastUsedEquipmentService } from "../../../../lib/services/last-used-equipment.service";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // 1. Sprawdź autentykację
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "unauthorized",
        message: "Authentication required"
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Pobierz dane z serwisu
  const result = await lastUsedEquipmentService.getLastUsedEquipment(
    supabase,
    user.id
  );

  // 3. Obsłuż błędy
  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 500;
    const errorResponse: ApiErrorResponse = {
      error: {
        code: result.error.code as ApiErrorResponse["error"]["code"],
        message: result.error.message
      }
    };
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. Zwróć sukces
  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300" // 5 min cache
    }
  });
}
```

---

### Krok 4: Aktualizacja typów (jeśli potrzebne)

Sprawdzić czy `SupabaseClient` jest poprawnie eksportowany z `src/db/supabase.client.ts`.

Jeśli nie istnieje, utworzyć:

**Plik:** `src/db/supabase.client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

// Re-export the type for use across the app
export type SupabaseClient = SupabaseClientBase;

// Factory function (if needed elsewhere)
export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}
```

---

### Krok 5: Testy jednostkowe (opcjonalne)

**Plik:** `src/lib/services/__tests__/last-used-equipment.service.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { LastUsedEquipmentService } from "../last-used-equipment.service";

describe("LastUsedEquipmentService", () => {
  const service = new LastUsedEquipmentService();

  it("should return 404 when user has no trips", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "No rows" }
                  })
                })
              })
            })
          })
        })
      })
    };

    const result = await service.getLastUsedEquipment(
      mockSupabase as any,
      "user-123"
    );

    expect(result.error?.code).toBe("not_found");
  });

  it("should return equipment from last trip", async () => {
    // ... test implementation
  });
});
```

---

### Krok 6: Weryfikacja integracji

1. **Sprawdzić middleware autentykacji** - upewnić się, że `context.locals.supabase` jest poprawnie ustawiany
2. **Przetestować endpoint manualnie:**
   ```bash
   curl -X GET http://localhost:4321/api/v1/me/last-used-equipment \
     -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json"
   ```
3. **Sprawdzić logi błędów** dla przypadków edge cases

---

## 10. Podsumowanie struktury plików

```
src/
├── db/
│   └── supabase.client.ts          # Typy i factory dla Supabase client
├── lib/
│   ├── schemas/
│   │   └── last-used-equipment.schema.ts  # Zod schema (opcjonalnie)
│   └── services/
│       └── last-used-equipment.service.ts # Logika biznesowa
├── pages/
│   └── api/
│       └── v1/
│           └── me/
│               └── last-used-equipment.ts # Astro API route
└── types.ts                        # DTO już zdefiniowane (LastUsedEquipmentResponseDto)
```

---

## 11. Checklist przed wdrożeniem

- [ ] Upewnić się, że middleware ustawia `context.locals.supabase`
- [ ] Sprawdzić czy typy w `src/types.ts` są aktualne
- [ ] Utworzyć/zweryfikować `src/db/supabase.client.ts`
- [ ] Zaimplementować serwis `LastUsedEquipmentService`
- [ ] Utworzyć route API
- [ ] Przetestować z prawidłowym JWT
- [ ] Przetestować scenariusze błędów (brak auth, brak wypraw)
- [ ] Sprawdzić logi i obsługę błędów

