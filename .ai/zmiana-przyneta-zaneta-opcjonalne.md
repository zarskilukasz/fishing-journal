# Zmiana: Przynęta i zanęta opcjonalne w połowach

**Data:** 2024-12-14  
**Status:** Zaimplementowane

## Opis zmiany

Pola `lure_id` (przynęta) i `groundbait_id` (zanęta) w tabeli `catches` zostały zmienione z **wymaganych** na **opcjonalne** (nullable).

## Uzasadnienie

Wędkarze nie zawsze chcą lub mogą podać przynętę/zanętę przy rejestrowaniu połowu. Wymuszanie tych pól blokowało szybkie dodawanie połowów.

## Zakres zmian

### 1. Baza danych

**Migracja:** `20251214030405_make_lure_groundbait_optional.sql`

```sql
-- Kolumny nullable
ALTER TABLE catches
  ALTER COLUMN lure_id DROP NOT NULL,
  ALTER COLUMN groundbait_id DROP NOT NULL,
  ALTER COLUMN lure_name_snapshot DROP NOT NULL,
  ALTER COLUMN groundbait_name_snapshot DROP NOT NULL;
```

**Trigger `fill_snapshots_for_catches()`:**
- Obsługuje NULL dla `lure_id` i `groundbait_id`
- Ustawia snapshot na NULL gdy brak referencji

**Trigger `validate_catch_equipment()`:**
- Waliduje sprzęt tylko gdy podany
- Sprawdza właściciela i soft-delete tylko dla niepustych wartości

### 2. API Schema (`src/lib/schemas/catch.schema.ts`)

```typescript
// Przed
lure_id: z.string().uuid("..."),
groundbait_id: z.string().uuid("..."),

// Po
lure_id: z.string().uuid("...").nullable().optional(),
groundbait_id: z.string().uuid("...").nullable().optional(),
```

### 3. Typy TypeScript (`src/types.ts`)

```typescript
// CatchRow
lure_id: UUID | null;
groundbait_id: UUID | null;
lure_name_snapshot: string | null;
groundbait_name_snapshot: string | null;

// CreateCatchCommand
export type CreateCatchCommand = 
  Pick<CatchMutableFields, "caught_at" | "species_id"> &
  Partial<Pick<CatchMutableFields, "lure_id" | "groundbait_id" | "weight_g" | "length_mm">>;
```

### 4. Schemat formularza (`src/lib/schemas/catch-form.schema.ts`)

```typescript
const optionalUuid = z
  .string()
  .transform((val) => (val === "" ? null : val))
  .pipe(z.string().uuid().nullable());

// lure_id i groundbait_id używają optionalUuid
```

### 5. Hook formularza (`src/components/hooks/useCatchForm.ts`)

```typescript
// Konwersja pustego stringa na null przy wysyłaniu
const lureId = formData.lure_id || null;
const groundbaitId = formData.groundbait_id || null;
```

### 6. Komponenty UI

**`LureSelect.tsx` i `GroundbaitSelect.tsx`:**
- Dodano etykietę "(opcjonalnie)" przy nazwie pola

**`catchDtoToFormData()` w `types.ts`:**
- Obsługuje nullable przez fallback do pustego stringa

## Pliki zmodyfikowane

| Plik | Zmiany |
|------|--------|
| `supabase/migrations/20251214030405_make_lure_groundbait_optional.sql` | Nowa migracja |
| `src/types.ts` | CatchRow, CreateCatchCommand |
| `src/lib/schemas/catch.schema.ts` | createCatchSchema |
| `src/lib/schemas/catch-form.schema.ts` | catchFormSchema, optionalUuid |
| `src/components/hooks/useCatchForm.ts` | handleSubmit |
| `src/components/catches/types.ts` | catchDtoToFormData |
| `src/components/catches/LureSelect.tsx` | Label z "(opcjonalnie)" |
| `src/components/catches/GroundbaitSelect.tsx` | Label z "(opcjonalnie)" |

## Uwagi

- Istniejące dane w bazie nie wymagają migracji (mają już przypisane przynęty/zanęty)
- API jest wstecznie kompatybilne - stare klienty nadal mogą wysyłać te pola
- W UI pola pozostają widoczne, ale nie są wymagane

