# API Endpoint Implementation Plan: Fish Species (GET)

## 1. Przegląd punktu końcowego

Endpointy Fish Species zapewniają dostęp tylko do odczytu do globalnego słownika gatunków ryb. Jest to współdzielony zasób systemowy zarządzany przez migracje bazy danych, nie przez użytkowników. Wszyscy uwierzytelnieni użytkownicy mogą przeglądać listę gatunków, ale nie mogą ich modyfikować.

Endpointy:
- `GET /api/v1/fish-species` - Lista gatunków z filtrowaniem, paginacją i sortowaniem
- `GET /api/v1/fish-species/{id}` - Pobieranie pojedynczego gatunku po ID

## 2. Szczegóły żądania

### GET `/api/v1/fish-species`

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/fish-species`
- **Parametry**:
  - **Wymagane**: Brak
  - **Opcjonalne**:
    | Parametr | Typ | Domyślnie | Opis |
    |----------|-----|-----------|------|
    | `q` | string | - | Wyszukiwanie substring w nazwie (case-insensitive) |
    | `limit` | integer | 20 | Liczba wyników (1-100) |
    | `cursor` | string | - | Kursor paginacji (opaque base64) |
    | `sort` | enum | `name` | Pole sortowania: `name`, `created_at` |
    | `order` | enum | `asc` | Kierunek: `asc`, `desc` |

- **Request Body**: Brak

### GET `/api/v1/fish-species/{id}`

- **Metoda HTTP**: GET
- **Struktura URL**: `/api/v1/fish-species/{id}`
- **Parametry**:
  - **Wymagane**:
    | Parametr | Typ | Opis |
    |----------|-----|------|
    | `id` | UUID (path) | Identyfikator gatunku |
  - **Opcjonalne**: Brak

- **Request Body**: Brak

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`

```typescript
// Encja DB
interface FishSpeciesRow {
  id: UUID;
  name: string;
  created_at: ISODateTime;
}

// DTO odpowiedzi
type FishSpeciesDto = Pick<FishSpeciesRow, "id" | "name" | "created_at">;

// Odpowiedź listowa
type FishSpeciesListResponseDto = ListResponse<FishSpeciesDto>;

// Odpowiedź pojedynczego rekordu
type FishSpeciesGetResponseDto = FishSpeciesDto;

// Generyczne typy paginacji
interface PageInfo {
  limit: number;
  next_cursor: Cursor | null;
}

interface ListResponse<TItem> {
  data: TItem[];
  page: PageInfo;
}
```

### Nowe typy do utworzenia

```typescript
// src/lib/schemas/fish-species.schema.ts

// Parametry query dla listy
interface FishSpeciesListQuery {
  q?: string;
  limit?: number;
  cursor?: string;
  sort?: "name" | "created_at";
  order?: "asc" | "desc";
}

// Wewnętrzna struktura kursora
interface FishSpeciesCursor {
  sortValue: string;
  id: string;
}
```

## 4. Szczegóły odpowiedzi

### GET `/api/v1/fish-species` - Success (200)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Pike",
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Carp",
      "created_at": "2025-01-02T00:00:00Z"
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": "eyJzb3J0VmFsdWUiOiJDYXJwIiwiaWQiOiI1NTBlODQwMC4uLiJ9"
  }
}
```

### GET `/api/v1/fish-species/{id}` - Success (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Pike",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Kody statusu

| Status | Opis |
|--------|------|
| 200 | Sukces |
| 400 | Nieprawidłowe parametry zapytania |
| 401 | Brak autoryzacji (brak/nieprawidłowy JWT) |
| 404 | Gatunek nie znaleziony (tylko GET /{id}) |
| 500 | Błąd serwera |

## 5. Przepływ danych

### GET `/api/v1/fish-species`

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Klient     │────▶│  Astro Route    │────▶│  Middleware      │
│  (Request)   │     │  fish-species/  │     │  (Auth check)    │
└──────────────┘     │  index.ts       │     └────────┬─────────┘
                     └─────────────────┘              │
                                                      ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Klient     │◀────│  Response       │◀────│  Zod Validation  │
│  (Response)  │     │  Builder        │     │  (Query params)  │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                     ┌─────────────────┐     ┌──────────────────┐
                     │  Cursor         │◀────│  FishSpecies     │
                     │  Encode/Decode  │     │  Service         │
                     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │  Supabase        │
                                             │  (RLS enabled)   │
                                             └──────────────────┘
```

### Szczegóły przepływu:

1. **Middleware Auth**: Sprawdza JWT z nagłówka `Authorization: Bearer <token>`
2. **Zod Validation**: Waliduje parametry query
3. **Cursor Decode**: Jeśli podano `cursor`, dekoduje base64 → JSON
4. **Service Layer**: Buduje zapytanie Supabase z filtrami
5. **Supabase Query**: Wykonuje zapytanie z RLS (policy `fish_species_select`)
6. **Cursor Encode**: Tworzy `next_cursor` jeśli są kolejne wyniki
7. **Response**: Zwraca `FishSpeciesListResponseDto`

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie

- JWT wymagany dla wszystkich endpointów
- Sprawdzenie przez `context.locals.supabase` (Supabase Auth)
- Brak sesji → 401 Unauthorized

```typescript
// W route handler
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return new Response(JSON.stringify({
    error: { code: "unauthorized", message: "Authentication required" }
  }), { status: 401 });
}
```

### 6.2 Autoryzacja

- RLS policy `fish_species_select` wymaga `authenticated` role
- Wszyscy zalogowani użytkownicy mają dostęp do odczytu
- Brak możliwości modyfikacji (brak policies INSERT/UPDATE/DELETE)

### 6.3 Walidacja danych wejściowych

- **UUID**: Walidacja formatu przed zapytaniem do DB
- **Query params**: Zod schema z ograniczeniami
- **Cursor**: Walidacja struktury po dekodowaniu base64

```typescript
// Zod schema dla query params
const fishSpeciesListQuerySchema = z.object({
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
```

### 6.4 Ochrona przed atakami

| Zagrożenie | Mitigacja |
|------------|-----------|
| SQL Injection | Parametryzowane zapytania Supabase |
| DoS (duże limity) | Max limit = 100 |
| Cursor tampering | Walidacja struktury kursora |
| Enumeration | RLS zapewnia izolację danych |

## 7. Obsługa błędów

### 7.1 Scenariusze błędów

| Scenariusz | HTTP | Error Code | Przykład odpowiedzi |
|------------|------|------------|---------------------|
| Brak JWT | 401 | `unauthorized` | `{"error":{"code":"unauthorized","message":"Authentication required"}}` |
| Nieprawidłowy JWT | 401 | `unauthorized` | `{"error":{"code":"unauthorized","message":"Invalid or expired token"}}` |
| Nieprawidłowy UUID | 400 | `validation_error` | `{"error":{"code":"validation_error","message":"Invalid ID format","details":{"field":"id","reason":"Must be a valid UUID"}}}` |
| Nieprawidłowy limit | 400 | `validation_error` | `{"error":{"code":"validation_error","message":"Validation failed","details":{"field":"limit","reason":"Must be between 1 and 100"}}}` |
| Nieprawidłowy sort | 400 | `validation_error` | `{"error":{"code":"validation_error","message":"Validation failed","details":{"field":"sort","reason":"Must be 'name' or 'created_at'"}}}` |
| Gatunek nie istnieje | 404 | `not_found` | `{"error":{"code":"not_found","message":"Fish species not found"}}` |
| Błąd DB | 500 | `internal_error` | `{"error":{"code":"internal_error","message":"An unexpected error occurred"}}` |

### 7.2 Helper funkcja dla błędów

```typescript
// src/lib/api/error-response.ts
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetails
): Response {
  const body: ApiErrorResponse = {
    error: { code, message, ...(details && { details }) }
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
```

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazy danych

Tabela `fish_species` ma następujące indeksy wspierające zapytania:
- `PRIMARY KEY (id)` - dla GET /{id}
- `UNIQUE (name)` - dla sortowania i wyszukiwania

### 8.2 Optymalizacje

| Aspekt | Strategia |
|--------|-----------|
| Paginacja | Cursor-based (efektywniejsza niż offset dla dużych zbiorów) |
| Limit | Domyślnie 20, max 100 dla kontroli obciążenia |
| Wyszukiwanie | ILIKE z prefixem dla case-insensitive match |
| Sortowanie | Wykorzystanie indeksu UNIQUE na `name` |

### 8.3 Wzorzec kursora

```typescript
// Struktura kursora
interface FishSpeciesCursor {
  sortValue: string;  // Wartość pola sortowania ostatniego rekordu
  id: string;         // ID ostatniego rekordu (dla stabilności)
}

// Kodowanie
const cursor = btoa(JSON.stringify({ sortValue, id }));

// Dekodowanie
const { sortValue, id } = JSON.parse(atob(cursor));
```

### 8.4 Zapytanie z kursorem

```sql
-- Dla sort=name, order=asc, cursor={sortValue: "Carp", id: "..."}
SELECT * FROM fish_species
WHERE (name, id) > ('Carp', '550e8400-...')
ORDER BY name ASC, id ASC
LIMIT 21;  -- limit + 1 do sprawdzenia czy są kolejne
```

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematów walidacji Zod

**Plik**: `src/lib/schemas/fish-species.schema.ts`

```typescript
import { z } from "zod";

export const fishSpeciesListQuerySchema = z.object({
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const fishSpeciesIdSchema = z.string().uuid();

export type FishSpeciesListQuery = z.infer<typeof fishSpeciesListQuerySchema>;
```

### Krok 2: Utworzenie helpera dla odpowiedzi błędów

**Plik**: `src/lib/api/error-response.ts`

```typescript
import type { ApiErrorCode, ApiErrorDetails, ApiErrorResponse } from "@/types";

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetails
): Response {
  const body: ApiErrorResponse = {
    error: { code, message, ...(details && { details }) }
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function createSuccessResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
```

### Krok 3: Utworzenie helpera dla kursora paginacji

**Plik**: `src/lib/api/pagination.ts`

```typescript
import type { Cursor } from "@/types";

export interface CursorData {
  sortValue: string;
  id: string;
}

export function encodeCursor(data: CursorData): Cursor {
  return btoa(JSON.stringify(data));
}

export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = JSON.parse(atob(cursor));
    if (typeof decoded.sortValue === "string" && typeof decoded.id === "string") {
      return decoded as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}
```

### Krok 4: Utworzenie serwisu Fish Species

**Plik**: `src/lib/services/fish-species.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { FishSpeciesDto, FishSpeciesListResponseDto } from "@/types";
import { encodeCursor, decodeCursor, type CursorData } from "@/lib/api/pagination";

interface ListParams {
  q?: string;
  limit: number;
  cursor?: string;
  sort: "name" | "created_at";
  order: "asc" | "desc";
}

interface ServiceResult<T> {
  data?: T;
  error?: { code: string; message: string };
}

export class FishSpeciesService {
  constructor(private supabase: SupabaseClient) {}

  async list(params: ListParams): Promise<ServiceResult<FishSpeciesListResponseDto>> {
    const { q, limit, cursor, sort, order } = params;
    
    let query = this.supabase
      .from("fish_species")
      .select("id, name, created_at")
      .order(sort, { ascending: order === "asc" })
      .order("id", { ascending: order === "asc" })
      .limit(limit + 1); // +1 to check for next page

    // Search filter
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    // Cursor pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return { error: { code: "validation_error", message: "Invalid cursor" } };
      }
      
      const operator = order === "asc" ? "gt" : "lt";
      query = query.or(`${sort}.${operator}.${cursorData.sortValue},and(${sort}.eq.${cursorData.sortValue},id.${operator}.${cursorData.id})`);
    }

    const { data, error } = await query;

    if (error) {
      return { error: { code: "internal_error", message: error.message } };
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
        data: items as FishSpeciesDto[],
        page: { limit, next_cursor: nextCursor },
      },
    };
  }

  async getById(id: string): Promise<ServiceResult<FishSpeciesDto>> {
    const { data, error } = await this.supabase
      .from("fish_species")
      .select("id, name, created_at")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { error: { code: "not_found", message: "Fish species not found" } };
      }
      return { error: { code: "internal_error", message: error.message } };
    }

    return { data: data as FishSpeciesDto };
  }
}
```

### Krok 5: Utworzenie route handler dla listy

**Plik**: `src/pages/api/v1/fish-species/index.ts`

```typescript
import type { APIRoute } from "astro";
import { fishSpeciesListQuerySchema } from "@/lib/schemas/fish-species.schema";
import { FishSpeciesService } from "@/lib/services/fish-species.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const GET: APIRoute = async ({ locals, url }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Parse and validate query params
  const queryParams = Object.fromEntries(url.searchParams);
  const parseResult = fishSpeciesListQuerySchema.safeParse(queryParams);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return createErrorResponse(
      "validation_error",
      "Validation failed",
      400,
      { field: firstError.path.join("."), reason: firstError.message }
    );
  }

  // 3. Execute service
  const service = new FishSpeciesService(supabase);
  const result = await service.list(parseResult.data);

  if (result.error) {
    const status = result.error.code === "validation_error" ? 400 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};
```

### Krok 6: Utworzenie route handler dla pojedynczego gatunku

**Plik**: `src/pages/api/v1/fish-species/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { fishSpeciesIdSchema } from "@/lib/schemas/fish-species.schema";
import { FishSpeciesService } from "@/lib/services/fish-species.service";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";

export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Auth check
  const supabase = locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse("unauthorized", "Authentication required", 401);
  }

  // 2. Validate path param
  const idParseResult = fishSpeciesIdSchema.safeParse(params.id);
  
  if (!idParseResult.success) {
    return createErrorResponse(
      "validation_error",
      "Invalid ID format",
      400,
      { field: "id", reason: "Must be a valid UUID" }
    );
  }

  // 3. Execute service
  const service = new FishSpeciesService(supabase);
  const result = await service.getById(idParseResult.data);

  if (result.error) {
    const status = result.error.code === "not_found" ? 404 : 500;
    return createErrorResponse(result.error.code, result.error.message, status);
  }

  // 4. Return success response
  return createSuccessResponse(result.data);
};
```

### Krok 7: Konfiguracja middleware Supabase (jeśli nie istnieje)

**Plik**: `src/middleware/index.ts`

```typescript
import { defineMiddleware } from "astro:middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return context.cookies.get(key)?.value;
        },
        set(key: string, value: string, options: CookieOptions) {
          context.cookies.set(key, value, options);
        },
        remove(key: string, options: CookieOptions) {
          context.cookies.delete(key, options);
        },
      },
    }
  );

  return next();
});
```

### Krok 8: Aktualizacja typów dla Astro locals

**Plik**: `src/env.d.ts` (aktualizacja)

```typescript
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { SupabaseClient } from "@/db/supabase.client";

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
  }
}
```

### Krok 9: Utworzenie typu SupabaseClient (jeśli nie istnieje)

**Plik**: `src/db/supabase.client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export type SupabaseClient = ReturnType<typeof createClient>;
```

### Krok 10: Instalacja zależności Zod (jeśli nie zainstalowana)

```bash
pnpm add zod
```

## 10. Struktura plików po implementacji

```
src/
├── db/
│   └── supabase.client.ts          # Typ SupabaseClient
├── lib/
│   ├── api/
│   │   ├── error-response.ts       # Helper dla odpowiedzi błędów
│   │   └── pagination.ts           # Helper dla kursora paginacji
│   ├── schemas/
│   │   └── fish-species.schema.ts  # Schematy Zod
│   └── services/
│       └── fish-species.service.ts # Logika biznesowa
├── middleware/
│   └── index.ts                    # Middleware Supabase
├── pages/
│   └── api/
│       └── v1/
│           └── fish-species/
│               ├── index.ts        # GET /api/v1/fish-species
│               └── [id].ts         # GET /api/v1/fish-species/{id}
└── types.ts                        # Typy (istniejące)
```

## 11. Testowanie (zalecane)

### Przypadki testowe dla GET `/fish-species`

1. ✅ Zwraca listę gatunków dla zalogowanego użytkownika
2. ✅ Zwraca 401 dla niezalogowanego użytkownika
3. ✅ Filtruje po `q` (case-insensitive substring)
4. ✅ Respektuje `limit` (domyślnie 20, max 100)
5. ✅ Sortuje po `name` i `created_at`
6. ✅ Obsługuje paginację kursorową
7. ✅ Zwraca `next_cursor: null` gdy brak kolejnych wyników
8. ✅ Zwraca 400 dla nieprawidłowych parametrów

### Przypadki testowe dla GET `/fish-species/{id}`

1. ✅ Zwraca gatunek dla prawidłowego UUID
2. ✅ Zwraca 404 dla nieistniejącego gatunku
3. ✅ Zwraca 400 dla nieprawidłowego formatu UUID
4. ✅ Zwraca 401 dla niezalogowanego użytkownika

