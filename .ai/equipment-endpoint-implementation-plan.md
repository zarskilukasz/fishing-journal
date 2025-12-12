# API Endpoint Implementation Plan: Equipment (Rods, Lures, Groundbaits)

## 1. Przegląd punktu końcowego

Ten plan opisuje implementację zestawu endpointów CRUD dla trzech typów sprzętu wędkarskiego: **wędek (rods)**, **przynęt (lures)** i **zanęt (groundbaits)**. Wszystkie trzy zasoby współdzielą identyczną strukturę danych i wzorce operacji, różniąc się jedynie nazwą tabeli w bazie danych.

### Funkcjonalności:
- Listowanie sprzętu z filtrowaniem, paginacją i sortowaniem
- Tworzenie nowego sprzętu
- Pobieranie pojedynczego elementu sprzętu
- Aktualizacja sprzętu (częściowa)
- Soft-delete sprzętu (ustawienie `deleted_at`)

### Endpointy:
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/rods` | Lista wędek |
| POST | `/api/v1/rods` | Utwórz wędkę |
| GET | `/api/v1/rods/{id}` | Pobierz wędkę |
| PATCH | `/api/v1/rods/{id}` | Aktualizuj wędkę |
| DELETE | `/api/v1/rods/{id}` | Soft-delete wędki |

> Identyczne endpointy dla `/api/v1/lures` i `/api/v1/groundbaits`.

---

## 2. Szczegóły żądania

### 2.1 GET `/api/v1/{equipment}` (Lista)

**Parametry zapytania (query params):**

| Parametr | Typ | Wymagany | Domyślnie | Opis |
|----------|-----|----------|-----------|------|
| `q` | string | Nie | - | Filtr substring na nazwie (case-insensitive) |
| `include_deleted` | boolean | Nie | `false` | Czy uwzględnić soft-deleted elementy |
| `limit` | number | Nie | `20` | Liczba wyników (1-100) |
| `cursor` | string | Nie | - | Kursor paginacji (opaque string) |
| `sort` | enum | Nie | `created_at` | Pole sortowania: `name`, `created_at`, `updated_at` |
| `order` | enum | Nie | `desc` | Kierunek sortowania: `asc`, `desc` |

### 2.2 POST `/api/v1/{equipment}` (Tworzenie)

**Request Body:**
```json
{
  "name": "string (wymagane, 1-255 znaków)"
}
```

### 2.3 GET `/api/v1/{equipment}/{id}` (Szczegóły)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator sprzętu |

### 2.4 PATCH `/api/v1/{equipment}/{id}` (Aktualizacja)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator sprzętu |

**Request Body (częściowy):**
```json
{
  "name": "string (opcjonalne, 1-255 znaków)"
}
```

### 2.5 DELETE `/api/v1/{equipment}/{id}` (Soft-delete)

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `id` | UUID | Tak | Identyfikator sprzętu |

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy z `src/types.ts`

**Entity Row Types (DB):**
```typescript
// Już zdefiniowane w src/types.ts
interface RodRow {
  id: UUID;
  user_id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

interface LureRow { /* identyczna struktura */ }
interface GroundbaitRow { /* identyczna struktura */ }
```

**DTOs (Response):**
```typescript
// Już zdefiniowane w src/types.ts
type RodDto = Omit<RodRow, "user_id">;
type LureDto = Omit<LureRow, "user_id">;
type GroundbaitDto = Omit<GroundbaitRow, "user_id">;

type RodListResponseDto = ListResponse<RodDto>;
type RodGetResponseDto = RodDto;
// analogicznie dla Lure i Groundbait
```

**Command Models (Request):**
```typescript
// Już zdefiniowane w src/types.ts
interface CreateEquipmentCommand {
  name: string;
}

type UpdateEquipmentCommand = Partial<{ name: string }>;
```

### 3.2 Nowe typy do utworzenia

**Plik: `src/lib/schemas/equipment.schema.ts`**

```typescript
import { z } from "zod";

// Query params dla listy
export const equipmentListQuerySchema = z.object({
  q: z.string().optional(),
  include_deleted: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("false"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  sort: z.enum(["name", "created_at", "updated_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;

// Path param dla ID
export const equipmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

// Body dla tworzenia
export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").trim(),
});

// Body dla aktualizacji
export const updateEquipmentSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long").trim().optional(),
});
```

**Plik: `src/lib/types/equipment.types.ts`**

```typescript
export type EquipmentType = "rods" | "lures" | "groundbaits";

export interface EquipmentServiceConfig {
  tableName: EquipmentType;
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET (Lista) - 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rod A",
      "deleted_at": null,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
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
  "name": "Rod A",
  "deleted_at": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### 4.3 GET (Szczegóły) - 200 OK

```json
{
  "id": "uuid",
  "name": "Rod A",
  "deleted_at": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### 4.4 PATCH (Aktualizacja) - 200 OK

```json
{
  "id": "uuid",
  "name": "New Rod Name",
  "deleted_at": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T01:00:00Z"
}
```

### 4.5 DELETE (Soft-delete) - 204 No Content

Brak ciała odpowiedzi.

### 4.6 Błędy

```json
{
  "error": {
    "code": "validation_error",
    "message": "Name is required",
    "details": {
      "field": "name",
      "reason": "must not be empty"
    }
  }
}
```

---

## 5. Przepływ danych

### 5.1 Architektura warstw

```
┌─────────────────────────────────────────────────────────────┐
│                    Astro API Route                          │
│         src/pages/api/v1/{equipment}/[...path].ts           │
├─────────────────────────────────────────────────────────────┤
│                    Validation Layer                         │
│              src/lib/schemas/equipment.schema.ts            │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│              src/lib/services/equipment.service.ts          │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
│                  Supabase Client (RLS)                      │
│                   src/db/supabase.client.ts                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Przepływ dla GET (Lista)

```
1. Request → Astro Route Handler
2. Walidacja query params (Zod)
3. Ekstrakcja user ID z context.locals.supabase
4. EquipmentService.list(supabase, query)
   a. Budowanie zapytania SELECT
   b. Filtrowanie (q, include_deleted)
   c. Sortowanie (sort, order)
   d. Paginacja (cursor, limit)
5. Transformacja do DTO (usunięcie user_id)
6. Response 200 + JSON
```

### 5.3 Przepływ dla POST (Tworzenie)

```
1. Request → Astro Route Handler
2. Walidacja body (Zod)
3. Ekstrakcja user ID z context.locals.supabase
4. EquipmentService.create(supabase, userId, data)
   a. Sprawdzenie unikalności nazwy (case-insensitive)
   b. INSERT do tabeli
   c. Obsługa błędu unique constraint
5. Transformacja do DTO
6. Response 201 + JSON
```

### 5.4 Przepływ dla GET (Szczegóły)

```
1. Request → Astro Route Handler
2. Walidacja path param (Zod UUID)
3. EquipmentService.getById(supabase, id)
   a. SELECT WHERE id = ?
   b. RLS automatycznie filtruje po user_id
4. Sprawdzenie czy znaleziono (404 jeśli nie)
5. Transformacja do DTO
6. Response 200 + JSON
```

### 5.5 Przepływ dla PATCH (Aktualizacja)

```
1. Request → Astro Route Handler
2. Walidacja path param i body (Zod)
3. EquipmentService.update(supabase, id, data)
   a. Sprawdzenie istnienia rekordu
   b. Sprawdzenie unikalności nowej nazwy (jeśli zmieniana)
   c. UPDATE z automatycznym updated_at (trigger)
4. Transformacja do DTO
5. Response 200 + JSON
```

### 5.6 Przepływ dla DELETE (Soft-delete)

```
1. Request → Astro Route Handler
2. Walidacja path param (Zod UUID)
3. EquipmentService.softDelete(supabase, id)
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
- Polityki RLS sprawdzają `user_id = auth.uid()`
- Użytkownik widzi tylko swoje dane
- Próba dostępu do cudzych zasobów → 404 Not Found (nie 403, dla bezpieczeństwa)

### 6.3 Walidacja danych wejściowych

| Pole | Walidacja |
|------|-----------|
| `id` | Format UUID v4 |
| `name` | Niepusty string, max 255 znaków, trim whitespace |
| `limit` | Integer 1-100 |
| `sort` | Enum: `name`, `created_at`, `updated_at` |
| `order` | Enum: `asc`, `desc` |
| `cursor` | Opaque string (base64) |

### 6.4 Ochrona przed atakami

- **SQL Injection**: Parametryzowane zapytania przez Supabase Client
- **XSS**: Dane zwracane jako JSON, bez renderowania HTML
- **CSRF**: Brak cookies sesyjnych, JWT w nagłówku
- **Mass Assignment**: Explicite wybieranie pól do aktualizacji

---

## 7. Obsługa błędów

### 7.1 Tabela błędów

| Scenariusz | HTTP Status | Kod błędu | Wiadomość |
|------------|-------------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | `unauthorized` | Authentication required |
| Nieprawidłowy token | 401 | `unauthorized` | Invalid or expired token |
| Nieprawidłowy format UUID | 400 | `validation_error` | Invalid UUID format |
| Pusta nazwa | 400 | `validation_error` | Name is required |
| Nazwa za długa | 400 | `validation_error` | Name too long (max 255) |
| Nieprawidłowy parametr sort | 400 | `validation_error` | Invalid sort field |
| Nieprawidłowy parametr limit | 400 | `validation_error` | Limit must be between 1 and 100 |
| Zasób nie znaleziony | 404 | `not_found` | Resource not found |
| Duplikat nazwy | 409 | `conflict` | Equipment with this name already exists |
| Błąd serwera | 500 | `internal_error` | Internal server error |

### 7.2 Format odpowiedzi błędu

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

### 7.3 Logowanie błędów

- Błędy 5xx logowane z pełnym stack trace
- Błędy 4xx logowane jako info z request ID
- Użycie `console.error` dla błędów krytycznych
- Rozważenie integracji z zewnętrznym serwisem (Sentry) w przyszłości

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

Zgodnie z `db-plan.md`, wykorzystywane są następujące indeksy:

```sql
-- Szybkie pobieranie aktywnych elementów użytkownika
CREATE INDEX idx_rods_user_active ON rods (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lures_user_active ON lures (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_groundbaits_user_active ON groundbaits (user_id) WHERE deleted_at IS NULL;

-- Unikalność nazwy per user (case-insensitive)
CREATE UNIQUE INDEX rods_user_name_unique ON rods (user_id, lower(name)) WHERE deleted_at IS NULL;
```

### 8.2 Paginacja kursorowa

- Używana dla list z potencjalnie dużą liczbą elementów
- Kursor koduje `{sortValue, id}` w base64
- Stabilna wydajność niezależnie od offsetu

### 8.3 Optymalizacje

- Limit wyników max 100 na request
- Selekcja tylko wymaganych kolumn (bez `user_id` w odpowiedzi)
- RLS sprawdzane na poziomie DB (nie w aplikacji)

---

## 9. Etapy wdrożenia

### Etap 1: Struktura plików i konfiguracja

1. **Utworzenie struktury katalogów:**
   ```
   src/
   ├── db/
   │   └── supabase.client.ts
   ├── lib/
   │   ├── schemas/
   │   │   └── equipment.schema.ts
   │   ├── services/
   │   │   └── equipment.service.ts
   │   └── utils/
   │       ├── api-response.ts
   │       └── pagination.ts
   └── pages/
       └── api/
           └── v1/
               ├── rods/
               │   ├── index.ts
               │   └── [id].ts
               ├── lures/
               │   ├── index.ts
               │   └── [id].ts
               └── groundbaits/
                   ├── index.ts
                   └── [id].ts
   ```

2. **Konfiguracja Supabase Client:**
   ```typescript
   // src/db/supabase.client.ts
   import { createClient, SupabaseClient } from "@supabase/supabase-js";
   
   export type { SupabaseClient };
   
   export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
     return createClient(supabaseUrl, supabaseKey);
   }
   ```

### Etap 2: Implementacja warstwy pomocniczej

1. **Utworzenie helpera odpowiedzi API:**
   ```typescript
   // src/lib/utils/api-response.ts
   import type { ApiErrorResponse } from "../../types";
   
   export function jsonResponse<T>(data: T, status = 200): Response {
     return new Response(JSON.stringify(data), {
       status,
       headers: { "Content-Type": "application/json" },
     });
   }
   
   export function errorResponse(
     code: string,
     message: string,
     status: number,
     details?: Record<string, unknown>
   ): Response {
     const body: ApiErrorResponse = {
       error: { code, message, details },
     };
     return jsonResponse(body, status);
   }
   ```

2. **Implementacja paginacji kursorowej:**
   ```typescript
   // src/lib/utils/pagination.ts
   export interface CursorData {
     sortValue: string | number;
     id: string;
   }
   
   export function encodeCursor(data: CursorData): string {
     return Buffer.from(JSON.stringify(data)).toString("base64url");
   }
   
   export function decodeCursor(cursor: string): CursorData | null {
     try {
       return JSON.parse(Buffer.from(cursor, "base64url").toString());
     } catch {
       return null;
     }
   }
   ```

### Etap 3: Implementacja schematów walidacji

1. **Utworzenie schematów Zod:**
   - `equipmentListQuerySchema` - query params dla listy
   - `equipmentIdParamSchema` - walidacja UUID
   - `createEquipmentSchema` - body dla POST
   - `updateEquipmentSchema` - body dla PATCH

### Etap 4: Implementacja serwisu

1. **Utworzenie `equipment.service.ts`:**
   ```typescript
   // src/lib/services/equipment.service.ts
   
   export class EquipmentService {
     constructor(private tableName: "rods" | "lures" | "groundbaits") {}
   
     async list(supabase: SupabaseClient, query: EquipmentListQuery) { /* ... */ }
     async getById(supabase: SupabaseClient, id: string) { /* ... */ }
     async create(supabase: SupabaseClient, data: CreateEquipmentCommand) { /* ... */ }
     async update(supabase: SupabaseClient, id: string, data: UpdateEquipmentCommand) { /* ... */ }
     async softDelete(supabase: SupabaseClient, id: string) { /* ... */ }
   }
   
   // Eksport instancji dla każdego typu sprzętu
   export const rodsService = new EquipmentService("rods");
   export const luresService = new EquipmentService("lures");
   export const groundbaitsService = new EquipmentService("groundbaits");
   ```

### Etap 5: Implementacja endpointów API

1. **GET/POST `/api/v1/rods` (index.ts):**
   - Handler dla GET - lista z filtrowaniem/paginacją
   - Handler dla POST - tworzenie nowego elementu
   - Walidacja Zod dla query params i body
   - Wywołanie odpowiedniej metody serwisu

2. **GET/PATCH/DELETE `/api/v1/rods/[id]` ([id].ts):**
   - Handler dla GET - szczegóły elementu
   - Handler dla PATCH - częściowa aktualizacja
   - Handler dla DELETE - soft-delete
   - Walidacja UUID w path param

3. **Powtórzenie dla `/lures` i `/groundbaits`:**
   - Identyczna struktura, różni się tylko serwis

### Etap 6: Middleware i autoryzacja

1. **Utworzenie/aktualizacja middleware Astro:**
   ```typescript
   // src/middleware/index.ts
   export const onRequest = defineMiddleware(async (context, next) => {
     // Inicjalizacja Supabase Client z tokenem z nagłówka
     const authHeader = context.request.headers.get("Authorization");
     // ... konfiguracja context.locals.supabase
     return next();
   });
   ```

### Etap 7: Testowanie

1. **Testy manualne:**
   - Weryfikacja wszystkich endpointów przez REST client (Postman/Insomnia)
   - Testowanie przypadków brzegowych (puste body, nieprawidłowe UUID, etc.)
   - Weryfikacja RLS (próba dostępu do cudzych zasobów)

2. **Scenariusze testowe:**
   - Tworzenie sprzętu z prawidłową nazwą → 201
   - Tworzenie sprzętu z pustą nazwą → 400
   - Tworzenie duplikatu nazwy → 409
   - Lista z paginacją → poprawne kursory
   - Soft-delete i include_deleted → poprawne filtrowanie

### Etap 8: Dokumentacja

1. **Aktualizacja README projektu**
2. **Dokumentacja OpenAPI/Swagger (opcjonalnie)**

---

## 10. Podsumowanie

Plan implementacji obejmuje kompletny zestaw CRUD endpointów dla trzech typów sprzętu wędkarskiego. Kluczowe aspekty:

- **Współdzielona logika**: Jeden serwis parametryzowany nazwą tabeli
- **Bezpieczeństwo**: RLS + walidacja Zod + JWT
- **Wydajność**: Indeksy DB + paginacja kursorowa
- **Skalowalność**: Czysta architektura warstwowa

Estymowany czas implementacji: **2-3 dni** dla doświadczonego developera.

