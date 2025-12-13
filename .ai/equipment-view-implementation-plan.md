# Plan implementacji widoku Zarządzanie sprzętem

## 1. Przegląd

Widok "Zarządzanie sprzętem" (`/app/equipment`) umożliwia zalogowanym użytkownikom pełne zarządzanie (CRUD) trzema typami sprzętu wędkarskiego: wędkami (rods), przynętami (lures) i zanętami (groundbaits). Widok prezentuje dane w formie zakładek, z możliwością wyszukiwania, dodawania, edycji i usuwania elementów. Interfejs jest responsywny - na urządzeniach mobilnych wykorzystuje gesty swipe-to-reveal, na desktopie akcje pojawiają się przy najechaniu myszą.

Kluczowe cechy:
- Zakładki MD3 do przełączania między kategoriami sprzętu
- Lista elementów z inline actions
- Dialog formularza do dodawania/edycji
- Soft-delete zachowujący historię w wyprawach
- Paginacja kursorowa z infinite scroll (mobile) lub "Załaduj więcej" (desktop)

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/equipment` |
| **Parametr query** | `?tab=rods\|lures\|groundbaits` (domyślnie `rods`) |
| **Ochrona** | Wymagana autoryzacja (przekierowanie na `/auth/login` dla niezalogowanych) |

Plik: `src/pages/app/equipment.astro`

## 3. Struktura komponentów

```
EquipmentPage (Astro page)
└── EquipmentView (React island, client:load)
    ├── EquipmentTabs
    │   ├── TabButton "Wędki"
    │   ├── TabButton "Przynęty"
    │   └── TabButton "Zanęty"
    ├── EquipmentToolbar
    │   ├── SearchInput
    │   └── AddButton
    ├── EquipmentListContainer
    │   ├── EquipmentList
    │   │   └── EquipmentItem[] (z SwipeActions na mobile)
    │   ├── LoadMoreButton (desktop)
    │   ├── LoadingSpinner / SkeletonList
    │   └── EmptyState
    ├── EquipmentFormDialog
    │   └── EquipmentForm
    └── DeleteConfirmDialog
```

## 4. Szczegóły komponentów

### 4.1 EquipmentView

- **Opis**: Główny kontener React dla całego widoku zarządzania sprzętem. Zarządza stanem zakładek, dialogów i koordynuje komunikację między komponentami potomnymi.
- **Główne elementy**:
  - `<div>` jako kontener z klasami layoutu (flex column)
  - Komponenty `EquipmentTabs`, `EquipmentToolbar`, `EquipmentListContainer`
  - Renderowane warunkowo: `EquipmentFormDialog`, `DeleteConfirmDialog`
- **Obsługiwane interakcje**:
  - Zmiana aktywnej zakładki
  - Otwarcie/zamknięcie dialogu formularza (dodawanie/edycja)
  - Otwarcie/zamknięcie dialogu potwierdzenia usunięcia
- **Obsługiwana walidacja**: Brak (delegowana do formularza)
- **Typy**: `EquipmentType`, `EquipmentViewState`
- **Propsy**: `initialTab?: EquipmentType` (z query param)

### 4.2 EquipmentTabs

- **Opis**: Pasek zakładek MD3 pozwalający na przełączanie między kategoriami sprzętu.
- **Główne elementy**:
  - Shadcn `Tabs` z trzema `TabsTrigger`
  - Ikony Lucide: `Fish` (wędki), `Sparkles` (przynęty), `Cookie` (zanęty)
- **Obsługiwane interakcje**:
  - `onTabChange(tab: EquipmentType)` - zmiana aktywnej zakładki
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentType`
- **Propsy**:
  ```typescript
  interface EquipmentTabsProps {
    activeTab: EquipmentType;
    onTabChange: (tab: EquipmentType) => void;
    counts?: Record<EquipmentType, number>; // opcjonalne liczniki
  }
  ```

### 4.3 EquipmentToolbar

- **Opis**: Pasek narzędzi zawierający pole wyszukiwania i przycisk dodawania nowego elementu.
- **Główne elementy**:
  - `SearchInput` (Shadcn Input z ikoną Search)
  - `Button` "Dodaj" (Shadcn Button, wariant primary)
- **Obsługiwane interakcje**:
  - `onSearchChange(query: string)` - zmiana tekstu wyszukiwania (debounced 300ms)
  - `onAddClick()` - otwarcie dialogu dodawania
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**:
  ```typescript
  interface EquipmentToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAddClick: () => void;
    isLoading?: boolean;
  }
  ```

### 4.4 SearchInput

- **Opis**: Pole tekstowe z ikoną wyszukiwania, zoptymalizowane pod kątem UX (debounce, clear button).
- **Główne elementy**:
  - Shadcn `Input` z `type="search"`
  - Ikona `Search` (leading)
  - Przycisk `X` do czyszczenia (trailing, widoczny gdy niepusty)
- **Obsługiwane interakcje**:
  - `onChange` - zmiana wartości (debounced)
  - `onClear` - wyczyszczenie pola
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**:
  ```typescript
  interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number; // domyślnie 300
  }
  ```

### 4.5 EquipmentListContainer

- **Opis**: Kontener zarządzający wyświetlaniem listy, stanem ładowania, pustym stanem i paginacją.
- **Główne elementy**:
  - `EquipmentList` (gdy są dane)
  - `EmptyState` (gdy brak danych)
  - `SkeletonList` (podczas ładowania)
  - `LoadMoreButton` (desktop, gdy `hasNextPage`)
  - `InfiniteScrollTrigger` (mobile, intersection observer)
- **Obsługiwane interakcje**:
  - `onLoadMore()` - załadowanie następnej strony
  - `onEdit(item)` - edycja elementu
  - `onDelete(item)` - usunięcie elementu
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentDto`, `EquipmentListState`
- **Propsy**:
  ```typescript
  interface EquipmentListContainerProps {
    items: EquipmentDto[];
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    onLoadMore: () => void;
    onEdit: (item: EquipmentDto) => void;
    onDelete: (item: EquipmentDto) => void;
    searchQuery: string;
  }
  ```

### 4.6 EquipmentList

- **Opis**: Lista elementów sprzętu renderowana jako MD3 List.
- **Główne elementy**:
  - `<ul>` z rolą `list`
  - `EquipmentItem[]` jako `<li>`
- **Obsługiwane interakcje**: Delegowane do `EquipmentItem`
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentDto`
- **Propsy**:
  ```typescript
  interface EquipmentListProps {
    items: EquipmentDto[];
    onEdit: (item: EquipmentDto) => void;
    onDelete: (item: EquipmentDto) => void;
  }
  ```

### 4.7 EquipmentItem

- **Opis**: Pojedynczy element listy sprzętu z akcjami (edycja, usunięcie). Na mobile wykorzystuje swipe-to-reveal, na desktop hover.
- **Główne elementy**:
  - `<li>` z MD3 list item styling
  - Nazwa sprzętu (primary text)
  - Data utworzenia (secondary text, sformatowana)
  - Przyciski akcji: Edit (ikona `Pencil`), Delete (ikona `Trash2`)
  - `SwipeActions` wrapper na mobile
- **Obsługiwane interakcje**:
  - `onEdit()` - kliknięcie przycisku edycji
  - `onDelete()` - kliknięcie przycisku usunięcia
  - Swipe left - reveal delete action (mobile)
  - Swipe right - reveal edit action (mobile)
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentDto`
- **Propsy**:
  ```typescript
  interface EquipmentItemProps {
    item: EquipmentDto;
    onEdit: () => void;
    onDelete: () => void;
  }
  ```

### 4.8 SwipeActions

- **Opis**: Wrapper dodający obsługę gestów swipe na urządzeniach mobilnych. Odsłania ukryte akcje przy przesunięciu palcem.
- **Główne elementy**:
  - Kontener z `overflow: hidden`
  - Główna treść (children)
  - Lewy panel (edit action)
  - Prawy panel (delete action)
- **Obsługiwane interakcje**:
  - Touch start/move/end - śledzenie gestu
  - Swipe threshold (30% szerokości) - aktywacja akcji
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**:
  ```typescript
  interface SwipeActionsProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;   // delete
    onSwipeRight?: () => void;  // edit
    disabled?: boolean;
  }
  ```

### 4.9 EmptyState

- **Opis**: Komponent wyświetlany gdy lista sprzętu jest pusta. Zawiera ilustrację i CTA.
- **Główne elementy**:
  - Ilustracja SVG (centrowana)
  - Nagłówek "Brak {typu sprzętu}"
  - Opis zachęcający do dodania
  - Przycisk "Dodaj pierwszy element"
- **Obsługiwane interakcje**:
  - `onAddClick()` - kliknięcie CTA
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentType`
- **Propsy**:
  ```typescript
  interface EmptyStateProps {
    equipmentType: EquipmentType;
    onAddClick: () => void;
    hasSearchQuery: boolean; // różne komunikaty
  }
  ```

### 4.10 EquipmentFormDialog

- **Opis**: Dialog (full-screen na mobile, standard na desktop) z formularzem do tworzenia lub edycji elementu sprzętu.
- **Główne elementy**:
  - Shadcn `Dialog` / `Sheet` (responsywnie)
  - Nagłówek: "Dodaj {typ}" lub "Edytuj {typ}"
  - `EquipmentForm`
  - Przyciski: "Anuluj", "Zapisz"
- **Obsługiwane interakcje**:
  - `onClose()` - zamknięcie dialogu
  - `onSubmit(data)` - zapisanie formularza
- **Obsługiwana walidacja**: Delegowana do `EquipmentForm`
- **Typy**: `EquipmentDto`, `CreateEquipmentCommand`, `UpdateEquipmentCommand`
- **Propsy**:
  ```typescript
  interface EquipmentFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    equipmentType: EquipmentType;
    editItem?: EquipmentDto | null; // null = tryb dodawania
    onSubmit: (data: CreateEquipmentCommand | UpdateEquipmentCommand) => Promise<void>;
    isSubmitting: boolean;
    error?: string | null;
  }
  ```

### 4.11 EquipmentForm

- **Opis**: Formularz do wprowadzania nazwy sprzętu z walidacją Zod + React Hook Form.
- **Główne elementy**:
  - `<form>` z React Hook Form
  - Pole "Nazwa" (Shadcn Input, MD3 Filled Text Field)
  - Komunikat błędu inline
- **Obsługiwane interakcje**:
  - `onSubmit` - submit formularza
  - Walidacja on blur i on submit
- **Obsługiwana walidacja**:
  - `name`: wymagane, min 1 znak, max 255 znaków, trimowane
  - Błąd 409 (konflikt nazwy) wyświetlany jako błąd pola
- **Typy**: `EquipmentFormValues`, `CreateEquipmentCommand`
- **Propsy**:
  ```typescript
  interface EquipmentFormProps {
    defaultValues?: { name: string };
    onSubmit: (data: EquipmentFormValues) => void;
    isSubmitting: boolean;
    serverError?: string | null;
  }
  ```

### 4.12 DeleteConfirmDialog

- **Opis**: Dialog potwierdzenia usunięcia elementu sprzętu z informacją o soft-delete.
- **Główne elementy**:
  - Shadcn `AlertDialog`
  - Ikona ostrzeżenia
  - Tytuł: "Usuń {nazwa}?"
  - Opis: "Element zostanie ukryty, ale zachowany w historycznych wyprawach."
  - Przyciski: "Anuluj", "Usuń" (wariant destructive)
- **Obsługiwane interakcje**:
  - `onCancel()` - zamknięcie dialogu
  - `onConfirm()` - potwierdzenie usunięcia
- **Obsługiwana walidacja**: Brak
- **Typy**: `EquipmentDto`
- **Propsy**:
  ```typescript
  interface DeleteConfirmDialogProps {
    isOpen: boolean;
    item: EquipmentDto | null;
    onCancel: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
  }
  ```

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

```typescript
// Typ bazowy dla wszystkich typów sprzętu
type EquipmentDto = RodDto | LureDto | GroundbaitDto;

// RodDto, LureDto, GroundbaitDto mają identyczną strukturę:
interface RodDto {
  id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// Odpowiedź listowa
interface ListResponse<T> {
  data: T[];
  page: PageInfo;
}

interface PageInfo {
  limit: number;
  next_cursor: Cursor | null;
}

// Komendy
interface CreateEquipmentCommand {
  name: string;
}

type UpdateEquipmentCommand = Partial<{ name: string }>;
```

### 5.2 Nowe typy dla widoku

```typescript
// src/components/equipment/types.ts

/** Typ kategorii sprzętu */
export type EquipmentType = "rods" | "lures" | "groundbaits";

/** Mapowanie typu na polski label */
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  rods: "Wędki",
  lures: "Przynęty",
  groundbaits: "Zanęty",
};

/** Mapowanie typu na polski label (liczba pojedyncza) */
export const EQUIPMENT_TYPE_SINGULAR_LABELS: Record<EquipmentType, string> = {
  rods: "wędkę",
  lures: "przynętę",
  groundbaits: "zanętę",
};

/** Stan widoku zarządzania sprzętem */
export interface EquipmentViewState {
  activeTab: EquipmentType;
  searchQuery: string;
  formDialog: {
    isOpen: boolean;
    editItem: EquipmentDto | null; // null = tryb dodawania
  };
  deleteDialog: {
    isOpen: boolean;
    item: EquipmentDto | null;
  };
}

/** Wartości formularza sprzętu */
export interface EquipmentFormValues {
  name: string;
}

/** Parametry query dla listy sprzętu */
export interface EquipmentListQueryParams {
  q?: string;
  include_deleted?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "name" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}

/** Stan listy sprzętu (z hooka) */
export interface EquipmentListState {
  items: EquipmentDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}
```

### 5.3 Schema walidacji Zod

```typescript
// src/lib/schemas/equipment-form.schema.ts
import { z } from "zod";

export const equipmentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa jest wymagana")
    .max(255, "Nazwa może mieć maksymalnie 255 znaków")
    .trim(),
});

export type EquipmentFormSchema = z.infer<typeof equipmentFormSchema>;
```

## 6. Zarządzanie stanem

### 6.1 Przegląd architektury stanu

Widok wykorzystuje kombinację:
- **TanStack Query** - stan serwerowy (listy, mutacje)
- **React useState** - stan UI (zakładki, dialogi, wyszukiwanie)
- **URL Query Params** - synchronizacja zakładki z URL

### 6.2 Custom Hook: `useEquipmentList`

```typescript
// src/lib/hooks/useEquipmentList.ts
import { useInfiniteQuery } from "@tanstack/react-query";

interface UseEquipmentListOptions {
  type: EquipmentType;
  searchQuery?: string;
  limit?: number;
}

interface UseEquipmentListResult {
  items: EquipmentDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useEquipmentList(options: UseEquipmentListOptions): UseEquipmentListResult {
  const { type, searchQuery, limit = 20 } = options;

  const query = useInfiniteQuery({
    queryKey: ["equipment", type, { q: searchQuery }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", String(limit));
      params.set("sort", "created_at");
      params.set("order", "desc");

      const response = await fetch(`/api/v1/${type}?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch equipment");
      }
      return response.json() as Promise<ListResponse<EquipmentDto>>;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.page.next_cursor ?? undefined,
    staleTime: 1000 * 60, // 1 minuta
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
```

### 6.3 Custom Hook: `useEquipmentMutations`

```typescript
// src/lib/hooks/useEquipmentMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UseEquipmentMutationsOptions {
  type: EquipmentType;
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}

export function useEquipmentMutations(options: UseEquipmentMutationsOptions) {
  const { type, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["equipment", type] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateEquipmentCommand) => {
      const response = await fetch(`/api/v1/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json() as Promise<EquipmentDto>;
    },
    onSuccess: () => {
      invalidateList();
      onSuccess?.();
    },
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEquipmentCommand }) => {
      const response = await fetch(`/api/v1/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json() as Promise<EquipmentDto>;
    },
    onSuccess: () => {
      invalidateList();
      onSuccess?.();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/${type}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw error;
      }
    },
    onSuccess: () => {
      invalidateList();
      onSuccess?.();
    },
    onError,
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}
```

### 6.4 Stan UI w komponencie EquipmentView

```typescript
// Stan zakładki (synchronizowany z URL)
const [activeTab, setActiveTab] = useState<EquipmentType>(initialTab);

// Stan wyszukiwania (debounced)
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearchQuery = useDebounce(searchQuery, 300);

// Stan dialogu formularza
const [formDialogState, setFormDialogState] = useState<{
  isOpen: boolean;
  editItem: EquipmentDto | null;
}>({ isOpen: false, editItem: null });

// Stan dialogu usuwania
const [deleteDialogState, setDeleteDialogState] = useState<{
  isOpen: boolean;
  item: EquipmentDto | null;
}>({ isOpen: false, item: null });
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Wszystkie endpointy sprzętu wymagają autoryzacji poprzez **Supabase SDK**:

**Server-side (Astro middleware + API endpoints):**
```typescript
// Middleware automatycznie weryfikuje sesję dla /app/*
// Klient Supabase dostępny w Astro.locals.supabase
const supabase = Astro.locals.supabase;
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ 
    error: { code: 'unauthorized', message: 'Unauthorized' }
  }), { status: 401 });
}
```

**Client-side (React components):**
- Cookies z tokenami Supabase są automatycznie wysyłane z każdym żądaniem fetch
- Middleware weryfikuje sesję przed renderowaniem `/app/equipment`

**Konfiguracja:**
- `PUBLIC_SUPABASE_URL` - URL projektu Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Publiczny klucz anon

### 7.1 Endpointy

| Operacja | Metoda | Endpoint | Request | Response |
|----------|--------|----------|---------|----------|
| Lista | GET | `/api/v1/{type}` | Query params | `ListResponse<EquipmentDto>` |
| Szczegóły | GET | `/api/v1/{type}/{id}` | - | `EquipmentDto` |
| Tworzenie | POST | `/api/v1/{type}` | `CreateEquipmentCommand` | `EquipmentDto` (201) |
| Aktualizacja | PATCH | `/api/v1/{type}/{id}` | `UpdateEquipmentCommand` | `EquipmentDto` |
| Usunięcie | DELETE | `/api/v1/{type}/{id}` | - | 204 No Content |

Gdzie `{type}` to `rods`, `lures` lub `groundbaits`.

### 7.2 Parametry query dla listy

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `q` | string | - | Filtr substring na nazwie (case-insensitive) |
| `include_deleted` | boolean | `false` | Czy uwzględnić usunięte elementy |
| `limit` | number | `20` | Liczba wyników (1-100) |
| `cursor` | string | - | Kursor paginacji |
| `sort` | enum | `created_at` | Pole sortowania: `name`, `created_at`, `updated_at` |
| `order` | enum | `desc` | Kierunek: `asc`, `desc` |

### 7.3 Typy żądań i odpowiedzi

**Tworzenie (POST):**
```typescript
// Request
interface CreateEquipmentCommand {
  name: string; // wymagane, 1-255 znaków
}

// Response 201
interface EquipmentDto {
  id: UUID;
  name: string;
  deleted_at: null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
```

**Aktualizacja (PATCH):**
```typescript
// Request (częściowy)
interface UpdateEquipmentCommand {
  name?: string; // opcjonalne, 1-255 znaków
}

// Response 200 - jak EquipmentDto
```

**Lista (GET):**
```typescript
// Response 200
interface ListResponse<EquipmentDto> {
  data: EquipmentDto[];
  page: {
    limit: number;
    next_cursor: string | null;
  };
}
```

### 7.4 Funkcje fetch

```typescript
// src/lib/api/equipment.api.ts

export async function fetchEquipmentList(
  type: EquipmentType,
  params: EquipmentListQueryParams
): Promise<ListResponse<EquipmentDto>> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.order) searchParams.set("order", params.order);

  const response = await fetch(`/api/v1/${type}?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }
  return response.json();
}

export async function createEquipment(
  type: EquipmentType,
  data: CreateEquipmentCommand
): Promise<EquipmentDto> {
  const response = await fetch(`/api/v1/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }
  return response.json();
}

export async function updateEquipment(
  type: EquipmentType,
  id: string,
  data: UpdateEquipmentCommand
): Promise<EquipmentDto> {
  const response = await fetch(`/api/v1/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }
  return response.json();
}

export async function deleteEquipment(
  type: EquipmentType,
  id: string
): Promise<void> {
  const response = await fetch(`/api/v1/${type}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new ApiError(error);
  }
}
```

## 8. Interakcje użytkownika

### 8.1 Przełączanie zakładek

| Akcja | Rezultat |
|-------|----------|
| Kliknięcie zakładki | Zmiana aktywnej kategorii, reset listy, wyczyszczenie wyszukiwania, aktualizacja URL query param |

### 8.2 Wyszukiwanie

| Akcja | Rezultat |
|-------|----------|
| Wpisanie tekstu | Debounced (300ms) filtrowanie listy po nazwie |
| Kliknięcie X | Wyczyszczenie pola, pokazanie pełnej listy |

### 8.3 Dodawanie sprzętu

| Akcja | Rezultat |
|-------|----------|
| Kliknięcie "Dodaj" | Otwarcie dialogu z pustym formularzem |
| Wpisanie nazwy | Walidacja real-time (min 1 znak) |
| Kliknięcie "Zapisz" | Walidacja, POST do API, zamknięcie dialogu, odświeżenie listy, snackbar sukcesu |
| Kliknięcie "Anuluj" / Escape | Zamknięcie dialogu bez zapisywania |

### 8.4 Edycja sprzętu

| Akcja | Rezultat |
|-------|----------|
| Kliknięcie ikony edycji (desktop) | Otwarcie dialogu z wypełnionym formularzem |
| Swipe w prawo (mobile) | Odsłonięcie przycisku edycji |
| Edycja nazwy | Walidacja real-time |
| Kliknięcie "Zapisz" | PATCH do API, zamknięcie dialogu, odświeżenie listy |

### 8.5 Usuwanie sprzętu

| Akcja | Rezultat |
|-------|----------|
| Kliknięcie ikony usunięcia (desktop) | Otwarcie dialogu potwierdzenia |
| Swipe w lewo (mobile) | Odsłonięcie przycisku usunięcia |
| Kliknięcie "Usuń" w dialogu | DELETE do API (soft-delete), zamknięcie dialogu, odświeżenie listy, snackbar |
| Kliknięcie "Anuluj" | Zamknięcie dialogu |

### 8.6 Paginacja

| Akcja | Rezultat |
|-------|----------|
| Scroll do dołu (mobile) | Automatyczne załadowanie następnej strony (infinite scroll) |
| Kliknięcie "Załaduj więcej" (desktop) | Załadowanie następnej strony |

## 9. Warunki i walidacja

### 9.1 Walidacja formularza (client-side)

| Pole | Warunek | Komunikat błędu |
|------|---------|-----------------|
| `name` | Wymagane | "Nazwa jest wymagana" |
| `name` | Min 1 znak | "Nazwa jest wymagana" |
| `name` | Max 255 znaków | "Nazwa może mieć maksymalnie 255 znaków" |
| `name` | Trimowanie | (automatyczne przed wysłaniem) |

### 9.2 Walidacja API (server-side)

| Warunek | HTTP Status | Kod błędu | Zachowanie UI |
|---------|-------------|-----------|---------------|
| Puste body | 400 | `validation_error` | Wyświetlenie błędu przy polu |
| Nazwa za długa | 400 | `validation_error` | Wyświetlenie błędu przy polu |
| Duplikat nazwy | 409 | `conflict` | Wyświetlenie błędu przy polu "Element o tej nazwie już istnieje" |
| Nie znaleziono | 404 | `not_found` | Snackbar + usunięcie z listy |
| Brak autoryzacji | 401 | `unauthorized` | Przekierowanie na login |

### 9.3 Schemat walidacji Zod

```typescript
export const equipmentFormSchema = z.object({
  name: z
    .string({ required_error: "Nazwa jest wymagana" })
    .min(1, "Nazwa jest wymagana")
    .max(255, "Nazwa może mieć maksymalnie 255 znaków")
    .transform((val) => val.trim()),
});
```

## 10. Obsługa błędów

### 10.1 Mapowanie błędów API na komunikaty

| Kod błędu | HTTP | Komunikat | Akcja UI |
|-----------|------|-----------|----------|
| `unauthorized` | 401 | "Sesja wygasła" | Redirect na `/auth/login` |
| `not_found` | 404 | "Nie znaleziono elementu" | Snackbar + refresh listy |
| `validation_error` | 400 | Szczegółowy z `details.field` | Inline error w formularzu |
| `conflict` | 409 | "Element o tej nazwie już istnieje" | Inline error przy polu `name` |
| `internal_error` | 500 | "Wystąpił błąd. Spróbuj ponownie" | Snackbar + przycisk retry |
| Network error | - | "Brak połączenia z serwerem" | Snackbar + przycisk retry |

### 10.2 Obsługa błędów w formularzach

```typescript
// W komponencie EquipmentFormDialog
const handleSubmit = async (data: EquipmentFormValues) => {
  try {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
    toast.success(editItem ? "Zapisano zmiany" : "Dodano element");
  } catch (error) {
    if (error.error?.code === "conflict") {
      form.setError("name", { message: "Element o tej nazwie już istnieje" });
    } else if (error.error?.code === "validation_error") {
      const field = error.error.details?.field;
      if (field === "name") {
        form.setError("name", { message: error.error.message });
      }
    } else {
      toast.error("Wystąpił błąd. Spróbuj ponownie");
    }
  }
};
```

### 10.3 Obsługa błędów w liście

```typescript
// W komponencie EquipmentListContainer
if (isError) {
  return (
    <ErrorState
      message="Nie udało się załadować listy"
      onRetry={refetch}
    />
  );
}
```

### 10.4 Globalna obsługa 401

```typescript
// W konfiguracji TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        if (error?.status === 401) {
          window.location.href = "/auth/login";
        }
      },
    },
  },
});
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

```
src/
├── components/
│   └── equipment/
│       ├── types.ts
│       ├── EquipmentView.tsx
│       ├── EquipmentTabs.tsx
│       ├── EquipmentToolbar.tsx
│       ├── EquipmentListContainer.tsx
│       ├── EquipmentList.tsx
│       ├── EquipmentItem.tsx
│       ├── SwipeActions.tsx
│       ├── EmptyState.tsx
│       ├── EquipmentFormDialog.tsx
│       ├── EquipmentForm.tsx
│       └── DeleteConfirmDialog.tsx
├── lib/
│   ├── api/
│   │   └── equipment.api.ts
│   ├── hooks/
│   │   ├── useEquipmentList.ts
│   │   ├── useEquipmentMutations.ts
│   │   └── useDebounce.ts
│   └── schemas/
│       └── equipment-form.schema.ts
└── pages/
    └── app/
        └── equipment.astro
```

### Krok 2: Implementacja typów i schematów

1. Utworzenie `src/components/equipment/types.ts` z typami widoku
2. Utworzenie `src/lib/schemas/equipment-form.schema.ts` ze schematem Zod
3. Weryfikacja zgodności z istniejącymi typami w `src/types.ts`

### Krok 3: Implementacja funkcji API

1. Utworzenie `src/lib/api/equipment.api.ts` z funkcjami fetch
2. Implementacja obsługi błędów i typowania odpowiedzi

### Krok 4: Implementacja hooków

1. Utworzenie `src/lib/hooks/useDebounce.ts`
2. Utworzenie `src/lib/hooks/useEquipmentList.ts` z useInfiniteQuery
3. Utworzenie `src/lib/hooks/useEquipmentMutations.ts` z mutacjami

### Krok 5: Implementacja komponentów UI (bottom-up)

1. `SwipeActions` - wrapper dla gestów na mobile
2. `SearchInput` - pole wyszukiwania z debounce
3. `EmptyState` - stan pustej listy
4. `DeleteConfirmDialog` - dialog potwierdzenia
5. `EquipmentForm` - formularz z React Hook Form + Zod
6. `EquipmentFormDialog` - dialog z formularzem
7. `EquipmentItem` - pojedynczy element listy
8. `EquipmentList` - lista elementów
9. `EquipmentListContainer` - kontener z paginacją i stanami
10. `EquipmentToolbar` - pasek narzędzi
11. `EquipmentTabs` - zakładki kategorii
12. `EquipmentView` - główny komponent widoku

### Krok 6: Implementacja strony Astro

1. Utworzenie `src/pages/app/equipment.astro`
2. Dodanie layoutu `AppLayout`
3. Import i renderowanie `EquipmentView` jako React island (`client:load`)
4. Obsługa query param `tab`

### Krok 7: Stylowanie i responsywność

1. Dodanie stylów MD3 do komponentów (Tailwind)
2. Implementacja responsywności (mobile/desktop)
3. Testy na różnych rozdzielczościach (360px, 1920px)

### Krok 8: Testowanie

1. Testy manualne wszystkich interakcji
2. Testy walidacji formularzy
3. Testy obsługi błędów
4. Testy paginacji
5. Testy responsywności

### Krok 9: Optymalizacja

1. Dodanie skeleton loading
2. Implementacja optimistic updates (opcjonalnie)
3. Prefetching danych przy hover na zakładkach (opcjonalnie)

### Krok 10: Integracja z nawigacją

1. Dodanie linku do `/app/equipment` w `BottomNavigation`
2. Dodanie linku w `NavigationRail` (desktop)
3. Weryfikacja breadcrumbs i tytułu strony

