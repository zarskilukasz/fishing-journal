# Plan implementacji widoku Formularz Połowu (CatchFormDialog)

## 1. Przegląd

Formularz połowu to modalny dialog służący do szybkiego dodawania i edycji informacji o złowionych rybach podczas wyprawy wędkarskiej. Głównym celem jest umożliwienie użytkownikowi wprowadzenia danych o połowie w czasie poniżej 90 sekund, nawet w warunkach polowych. Dialog wykorzystuje progresywne ujawnianie informacji - pola wymagane są widoczne od razu, a opcjonalne ukryte w rozwijalnej sekcji. Komponent jest w pełni responsywny - na urządzeniach mobilnych wyświetla się jako pełnoekranowy dialog, a na desktopie jako standardowe okno modalne.

## 2. Routing widoku

Modal jest wywoływany z widoku szczegółów wyprawy:
- **Ścieżka bazowa**: `/app/trips/[id]`
- **Wywołanie**: Przycisk FAB "Dodaj połów" lub kliknięcie na istniejący połów w liście
- **Typ**: Modal overlay (nie osobna strona)

## 3. Struktura komponentów

```
CatchFormDialog
├── DialogHeader
│   ├── DialogTitle ("Dodaj połów" / "Edytuj połów")
│   └── DialogClose (X button)
├── CatchForm
│   ├── RequiredFieldsSection
│   │   ├── SpeciesSelect (Combobox z wyszukiwaniem)
│   │   ├── LureSelect (Combobox z listą przynęt użytkownika)
│   │   └── GroundbaitSelect (Combobox z listą zanęt użytkownika)
│   ├── TimeInput (datetime picker)
│   └── CollapsibleOptional
│       ├── CollapsibleTrigger ("Opcjonalne szczegóły")
│       └── CollapsibleContent
│           ├── WeightInput (input numeryczny g → wyświetlanie kg)
│           ├── LengthInput (input numeryczny mm → wyświetlanie cm)
│           └── PhotoUpload
│               ├── PhotoDropzone
│               ├── PhotoPreview
│               └── UploadProgressBar
├── FormErrorSummary
└── DialogFooter
    ├── CancelButton
    └── SubmitButton
```

## 4. Szczegóły komponentów

### 4.1 CatchFormDialog

- **Opis**: Główny kontener modalnego dialogu. Na mobile renderuje się jako pełnoekranowy sheet, na desktop jako wycentrowany dialog. Zarządza stanem otwartości i przekazuje dane do formularza.
- **Główne elementy**: 
  - `Dialog` (Shadcn/ui) z wariantami responsywnymi
  - `DialogContent` z max-width dla desktop
  - `DialogHeader`, `DialogFooter`
- **Obsługiwane interakcje**:
  - Zamknięcie przez przycisk X
  - Zamknięcie przez kliknięcie poza dialog (tylko desktop)
  - Zamknięcie przez klawisz Escape
  - Blokada zamknięcia podczas wysyłania
- **Obsługiwana walidacja**: Brak (delegowana do CatchForm)
- **Typy**: `CatchFormDialogProps`
- **Propsy**:
  ```typescript
  interface CatchFormDialogProps {
    tripId: string;
    tripStartedAt: string;
    tripEndedAt: string | null;
    existingCatch?: CatchDto;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (createdCatch: CatchDto) => void;
  }
  ```

### 4.2 CatchForm

- **Opis**: Formularz zawierający wszystkie pola do wprowadzenia danych połowu. Zarządza stanem formularza, walidacją i wysyłaniem danych.
- **Główne elementy**:
  - `form` element z onSubmit handler
  - `RequiredFieldsSection` - sekcja pól wymaganych
  - `TimeInput` - picker czasu połowu
  - `CollapsibleOptional` - rozwijana sekcja opcjonalna
  - `FormErrorSummary` - podsumowanie błędów
- **Obsługiwane interakcje**:
  - Submit formularza (Enter lub przycisk)
  - Reset formularza przy anulowaniu
  - Auto-focus na pierwszym polu
- **Obsługiwana walidacja**:
  - Wszystkie pola wymagane muszą być wypełnione
  - `caught_at` musi być w zakresie dat wyprawy
  - `weight_g` > 0 jeśli podane
  - `length_mm` > 0 jeśli podane
- **Typy**: `CatchFormData`, `CatchFormErrors`
- **Propsy**:
  ```typescript
  interface CatchFormProps {
    tripId: string;
    tripStartedAt: string;
    tripEndedAt: string | null;
    initialData?: CatchFormData;
    existingCatchId?: string;
    onSubmit: (data: CreateCatchCommand | UpdateCatchCommand) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
  }
  ```

### 4.3 SpeciesSelect

- **Opis**: Combobox z wyszukiwaniem gatunków ryb. Pobiera dane z globalnego słownika gatunków. Umożliwia filtrowanie po nazwie.
- **Główne elementy**:
  - `Popover` (Shadcn/ui)
  - `Command` (Shadcn/ui) z CommandInput, CommandList, CommandItem
  - `Button` jako trigger z wybraną wartością
- **Obsługiwane interakcje**:
  - Otwarcie listy przez kliknięcie
  - Wyszukiwanie przez wpisywanie
  - Wybór opcji przez kliknięcie lub Enter
  - Nawigacja strzałkami
- **Obsługiwana walidacja**:
  - Pole wymagane - musi być wybrana wartość
- **Typy**: `SelectOption`, `FishSpeciesDto`
- **Propsy**:
  ```typescript
  interface SpeciesSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.4 LureSelect

- **Opis**: Combobox z listą przynęt należących do użytkownika. Wyświetla tylko aktywne (nie usunięte) przynęty.
- **Główne elementy**:
  - `Popover` z `Command` (identycznie jak SpeciesSelect)
  - Ikona przynęty przy każdej opcji
- **Obsługiwane interakcje**:
  - Identyczne jak SpeciesSelect
- **Obsługiwana walidacja**:
  - Pole wymagane
  - Przynęta musi należeć do użytkownika (walidacja API)
  - Przynęta nie może być usunięta (walidacja API)
- **Typy**: `SelectOption`, `LureDto`
- **Propsy**:
  ```typescript
  interface LureSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.5 GroundbaitSelect

- **Opis**: Combobox z listą zanęt należących do użytkownika. Struktura identyczna jak LureSelect.
- **Główne elementy**: Identyczne jak LureSelect
- **Obsługiwane interakcje**: Identyczne jak LureSelect
- **Obsługiwana walidacja**:
  - Pole wymagane
  - Zanęta musi należeć do użytkownika (walidacja API)
  - Zanęta nie może być usunięta (walidacja API)
- **Typy**: `SelectOption`, `GroundbaitDto`
- **Propsy**:
  ```typescript
  interface GroundbaitSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.6 TimeInput

- **Opis**: Picker daty i czasu połowu. Domyślnie ustawiony na aktualny czas. Styl Material Design 3.
- **Główne elementy**:
  - `Input` typu datetime-local lub custom picker
  - Label z aktualną wartością
  - Ikona zegara
- **Obsługiwane interakcje**:
  - Otwarcie pickera przez kliknięcie
  - Edycja bezpośrednia w polu
  - Przyciski szybkiego wyboru (np. "Teraz")
- **Obsługiwana walidacja**:
  - Data musi być >= `tripStartedAt`
  - Data musi być <= `tripEndedAt` (jeśli wypełnione)
  - Data nie może być w przyszłości
- **Typy**: `Date`, `string` (ISO format)
- **Propsy**:
  ```typescript
  interface TimeInputProps {
    value: Date;
    onChange: (value: Date) => void;
    minDate: Date;
    maxDate?: Date;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.7 WeightInput

- **Opis**: Pole numeryczne dla wagi ryby. Wartość przechowywana w gramach, wyświetlana jako kilogramy.
- **Główne elementy**:
  - `Input` typu number
  - Label "Waga"
  - Suffix "kg"
  - Konwersja g ↔ kg przy wyświetlaniu
- **Obsługiwane interakcje**:
  - Wprowadzanie wartości numerycznej
  - Obsługa wartości dziesiętnych (np. 1.5 kg = 1500 g)
  - Czyszczenie pola
- **Obsługiwana walidacja**:
  - Wartość > 0 jeśli podana
  - Maksymalna wartość 100 kg (100000 g)
  - Tylko liczby
- **Typy**: `number | null`
- **Propsy**:
  ```typescript
  interface WeightInputProps {
    value: number | null;
    onChange: (value: number | null) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.8 LengthInput

- **Opis**: Pole numeryczne dla długości ryby. Wartość przechowywana w milimetrach, wyświetlana jako centymetry.
- **Główne elementy**:
  - `Input` typu number
  - Label "Długość"
  - Suffix "cm"
  - Konwersja mm ↔ cm przy wyświetlaniu
- **Obsługiwane interakcje**: Identyczne jak WeightInput
- **Obsługiwana walidacja**:
  - Wartość > 0 jeśli podana
  - Maksymalna wartość 300 cm (3000 mm)
  - Tylko liczby
- **Typy**: `number | null`
- **Propsy**:
  ```typescript
  interface LengthInputProps {
    value: number | null;
    onChange: (value: number | null) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.9 PhotoUpload

- **Opis**: Komponent uploadu zdjęcia z podglądem, wstępnym resize client-side (natywne Canvas API) i paskiem postępu. Finalna kompresja odbywa się server-side (Sharp via `POST /catches/{id}/photo`). Obsługuje przeciąganie i upuszczanie oraz wybór z galerii. Dla wyświetlania istniejących zdjęć używa signed URL z `GET /catches/{id}/photo/download-url`.
- **Główne elementy**:
  - `PhotoDropzone` - strefa przeciągania
  - `PhotoPreview` - podgląd wybranego zdjęcia (lub istniejącego z signed URL)
  - `UploadProgressBar` - pasek postępu uploadu
  - Przycisk usunięcia zdjęcia (`DELETE /catches/{id}/photo`)
  - Input file (ukryty)
- **Obsługiwane interakcje**:
  - Drag & drop zdjęcia
  - Kliknięcie do wyboru pliku
  - Usunięcie wybranego/istniejącego zdjęcia
  - Retry przy błędzie uploadu
  - Wyświetlenie istniejącego zdjęcia przez signed URL
- **Obsługiwana walidacja**:
  - Typ pliku: image/jpeg, image/png, image/webp
  - Maksymalny rozmiar: 10MB przed resize
  - Automatyczny resize client-side do 2000px (dłuższy bok) za pomocą OffscreenCanvas
  - Finalna kompresja i konwersja do WebP server-side (Sharp)
- **Typy**: `File`, `PhotoUploadState`, `CatchPhotoUploadResponseDto`, `CatchPhotoDownloadUrlResponseDto`
- **Endpointy API**:
  - `POST /api/v1/catches/{id}/photo` - upload z kompresją server-side (zalecany)
  - `GET /api/v1/catches/{id}/photo/download-url` - signed URL do wyświetlenia
  - `DELETE /api/v1/catches/{id}/photo` - usunięcie zdjęcia
- **Propsy**:
  ```typescript
  interface PhotoUploadProps {
    value: File | null;
    existingPhotoPath?: string | null;
    onChange: (file: File | null) => void;
    onUploadComplete?: (response: CatchPhotoUploadResponseDto) => void;
    onDeleteComplete?: () => void;
    catchId?: string; // wymagane dla uploadu i usuwania
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.10 CollapsibleOptional

- **Opis**: Rozwijana sekcja zawierająca opcjonalne pola formularza. Domyślnie zwinięta dla szybszego wprowadzania danych.
- **Główne elementy**:
  - `Collapsible` (Shadcn/ui)
  - `CollapsibleTrigger` z ikoną strzałki
  - `CollapsibleContent` z polami opcjonalnymi
- **Obsługiwane interakcje**:
  - Rozwijanie/zwijanie przez kliknięcie
  - Animacja przejścia
- **Obsługiwana walidacja**: Brak (delegowana do dzieci)
- **Typy**: Brak specjalnych
- **Propsy**:
  ```typescript
  interface CollapsibleOptionalProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
  }
  ```

## 5. Typy

### 5.1 Typy formularza

```typescript
// Stan formularza
interface CatchFormData {
  species_id: string;
  lure_id: string;
  groundbait_id: string;
  caught_at: Date;
  weight_g: number | null;
  length_mm: number | null;
  photo: File | null;
}

// Domyślne wartości formularza
interface CatchFormDefaults {
  species_id: string;
  lure_id: string;
  groundbait_id: string;
  caught_at: Date;
  weight_g: null;
  length_mm: null;
  photo: null;
}

// Błędy walidacji
interface CatchFormErrors {
  species_id?: string;
  lure_id?: string;
  groundbait_id?: string;
  caught_at?: string;
  weight_g?: string;
  length_mm?: string;
  photo?: string;
  form?: string; // błąd ogólny
}

// Stan touched dla pól
interface CatchFormTouched {
  species_id: boolean;
  lure_id: boolean;
  groundbait_id: boolean;
  caught_at: boolean;
  weight_g: boolean;
  length_mm: boolean;
  photo: boolean;
}
```

### 5.2 Typy dla selectów

```typescript
// Uniwersalna opcja dla comboboxów
interface SelectOption {
  value: string;
  label: string;
}

// Mapowanie DTO do SelectOption
type SpeciesOption = SelectOption;
type LureOption = SelectOption & { deleted_at?: string | null };
type GroundbaitOption = SelectOption & { deleted_at?: string | null };
```

### 5.3 Typy stanu uploadu

```typescript
type PhotoUploadStatus = 'idle' | 'resizing' | 'uploading' | 'deleting' | 'success' | 'error';

interface PhotoUploadState {
  status: PhotoUploadStatus;
  progress: number; // 0-100
  previewUrl: string | null;
  error: string | null;
  /** Ścieżka do zdjęcia w Storage (z CatchPhotoUploadResponseDto) */
  uploadedPath: string | null;
  /** Metadane z ostatniego uploadu */
  uploadResult: CatchPhotoUploadResponseDto | null;
  /** Signed URL do wyświetlenia istniejącego zdjęcia */
  downloadUrl: string | null;
  /** Czas wygaśnięcia signed URL */
  downloadUrlExpiresAt: Date | null;
}

// Typy z API (src/types.ts)
interface CatchPhotoUploadResponseDto {
  photo_path: string;
  size_bytes: number;
  width: number;
  height: number;
}

interface CatchPhotoDownloadUrlResponseDto {
  url: string;
  expires_in: number;
}
```

### 5.4 Typy API (z src/types.ts)

```typescript
// Request - tworzenie
type CreateCatchCommand = {
  caught_at: string; // ISODateTime
  species_id: string; // UUID
  lure_id: string; // UUID
  groundbait_id: string; // UUID
  weight_g?: number | null;
  length_mm?: number | null;
};

// Request - aktualizacja
type UpdateCatchCommand = Partial<{
  caught_at: string;
  species_id: string;
  lure_id: string;
  groundbait_id: string;
  weight_g: number | null;
  length_mm: number | null;
  photo_path: string | null;
}>;

// Response
type CatchDto = {
  id: string;
  trip_id: string;
  caught_at: string;
  species_id: string;
  lure_id: string;
  groundbait_id: string;
  lure_name_snapshot: string;
  groundbait_name_snapshot: string;
  weight_g: number | null;
  length_mm: number | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: useCatchForm

```typescript
interface UseCatchFormOptions {
  tripId: string;
  tripStartedAt: string;
  tripEndedAt: string | null;
  existingCatch?: CatchDto;
  onSuccess: (catchData: CatchDto) => void;
}

interface UseCatchFormReturn {
  // Stan formularza
  formData: CatchFormData;
  errors: CatchFormErrors;
  touched: CatchFormTouched;
  
  // Akcje formularza
  setFieldValue: <K extends keyof CatchFormData>(field: K, value: CatchFormData[K]) => void;
  setFieldTouched: (field: keyof CatchFormData) => void;
  validateField: (field: keyof CatchFormData) => string | undefined;
  validateForm: () => boolean;
  resetForm: () => void;
  
  // Stan wysyłania
  isSubmitting: boolean;
  submitError: string | null;
  
  // Akcje wysyłania
  handleSubmit: () => Promise<void>;
  
  // Stan uploadu zdjęcia
  photoUploadState: PhotoUploadState;
  handlePhotoChange: (file: File | null) => void;
  /** Upload zdjęcia via POST /catches/{id}/photo */
  uploadPhoto: (catchId: string) => Promise<CatchPhotoUploadResponseDto | null>;
  /** Usunięcie zdjęcia via DELETE /catches/{id}/photo */
  deletePhoto: (catchId: string) => Promise<boolean>;
  /** Pobranie signed URL via GET /catches/{id}/photo/download-url */
  fetchDownloadUrl: (catchId: string) => Promise<string | null>;
}
```

### 6.2 Custom Hook: useCatchSelectData

```typescript
interface UseCatchSelectDataReturn {
  // Dane
  species: SpeciesOption[];
  lures: LureOption[];
  groundbaits: GroundbaitOption[];
  
  // Stany ładowania
  isLoadingSpecies: boolean;
  isLoadingLures: boolean;
  isLoadingGroundbaits: boolean;
  
  // Błędy
  speciesError: string | null;
  luresError: string | null;
  groundbaitsError: string | null;
  
  // Akcje
  searchSpecies: (query: string) => void;
  refetchAll: () => void;
}
```

### 6.3 Przepływ stanu

1. **Inicjalizacja**: 
   - Załaduj species, lures, groundbaits
   - Ustaw domyślne wartości (caught_at = now)
   - W trybie edycji: wypełnij formData z existingCatch

2. **Interakcja użytkownika**:
   - Aktualizuj formData przy zmianie pól
   - Oznacz pola jako touched przy blur
   - Waliduj pojedyncze pola przy zmianie

3. **Walidacja**:
   - Przy submit: waliduj cały formularz
   - Wyświetl błędy przy polach z touched=true

4. **Wysyłanie**:
   - Ustaw isSubmitting=true
   - Wyślij dane do API (POST lub PATCH)
   - Jeśli jest nowe zdjęcie i tworzenie: poczekaj na catchId, potem `POST /catches/{id}/photo`
   - Jeśli usunięto zdjęcie w edycji: wywołaj `DELETE /catches/{id}/photo`
   - Przy sukcesie: wywołaj onSuccess
   - Przy błędzie: wyświetl błąd

5. **Wyświetlanie istniejącego zdjęcia (edycja)**:
   - Jeśli `existingCatch.photo_path` istnieje: pobierz signed URL (`GET /catches/{id}/photo/download-url`)
   - Wyświetl podgląd z signed URL
   - Automatycznie odśwież URL przed wygaśnięciem (expires_in: 600s)

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Wszystkie endpointy połowów wymagają autoryzacji poprzez **Supabase SDK**:

**Server-side (API endpoints):**
```typescript
// W endpoint Astro API
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ 
    error: { code: 'unauthorized', message: 'Unauthorized' }
  }), { status: 401 });
}
```

**Client-side (formularz):**
- Cookies z tokenami są automatycznie wysyłane z każdym żądaniem fetch
- Middleware weryfikuje sesję przed dostępem do `/app/*`

### 7.1 Pobieranie danych dla selectów

```typescript
// Gatunki ryb - globalny słownik
GET /api/v1/fish-species?limit=100&sort=name&order=asc
Request Query: FishSpeciesListQuery
Response: FishSpeciesListResponseDto

// Response type:
interface FishSpeciesListResponseDto {
  data: FishSpeciesDto[];
  page: { limit: number; next_cursor: string | null };
}

interface FishSpeciesDto {
  id: UUID;
  name: string;
  created_at: ISODateTime;
}
```

```typescript
// Przynęty użytkownika
GET /api/v1/lures?include_deleted=false&limit=100&sort=name&order=asc
Request Query: EquipmentListQuery
Response: LureListResponseDto

// Response type:
interface LureListResponseDto {
  data: LureDto[];
  page: { limit: number; next_cursor: string | null };
}

interface LureDto {
  id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
```

```typescript
// Zanęty użytkownika
GET /api/v1/groundbaits?include_deleted=false&limit=100&sort=name&order=asc
Request Query: EquipmentListQuery
Response: GroundbaitListResponseDto

// Response type:
interface GroundbaitListResponseDto {
  data: GroundbaitDto[];
  page: { limit: number; next_cursor: string | null };
}

interface GroundbaitDto {
  id: UUID;
  name: string;
  deleted_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
```

### 7.2 Pobieranie pojedynczego połowu (tryb edycji)

```typescript
GET /api/v1/catches/{id}
Response: CatchDto (200 OK)

// Przykład odpowiedzi:
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "trip_id": "550e8400-e29b-41d4-a716-446655440000",
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "550e8400-e29b-41d4-a716-446655440001",
  "lure_id": "550e8400-e29b-41d4-a716-446655440002",
  "groundbait_id": "550e8400-e29b-41d4-a716-446655440003",
  "lure_name_snapshot": "Twister czerwony",
  "groundbait_name_snapshot": "Zanęta waniliowa",
  "weight_g": 1200,
  "length_mm": 650,
  "photo_path": "user123/catch099.webp",
  "created_at": "2025-12-12T11:05:00Z",
  "updated_at": "2025-12-12T11:05:00Z"
}
```

**Błędy:**
| Kod | Opis |
|-----|------|
| 401 | Unauthorized - brak sesji |
| 404 | Not Found - połów nie istnieje lub należy do innego użytkownika |

### 7.3 Tworzenie połowu

```typescript
POST /api/v1/trips/{tripId}/catches
Request Body: CreateCatchCommand
Response: CatchDto (201 Created)

// Request type:
interface CreateCatchCommand {
  caught_at: ISODateTime;       // wymagane
  species_id: UUID;             // wymagane
  lure_id: UUID;                // wymagane
  groundbait_id: UUID;          // wymagane
  weight_g?: number | null;     // opcjonalne
  length_mm?: number | null;    // opcjonalne
}

// Przykład:
{
  "caught_at": "2025-12-12T11:00:00Z",
  "species_id": "550e8400-e29b-41d4-a716-446655440000",
  "lure_id": "550e8400-e29b-41d4-a716-446655440001",
  "groundbait_id": "550e8400-e29b-41d4-a716-446655440002",
  "weight_g": 1200,
  "length_mm": 650
}
```

**Błędy:**
| Kod | Kod błędu | Opis |
|-----|-----------|------|
| 400 | `validation_error` | Nieprawidłowe dane (data poza zakresem wyprawy, brak wymaganych pól) |
| 401 | `unauthorized` | Brak sesji użytkownika |
| 404 | `not_found` | Wyprawa nie istnieje lub należy do innego użytkownika |
| 409 | `equipment_owner_mismatch` | Przynęta/zanęta należy do innego użytkownika |
| 409 | `equipment_soft_deleted` | Przynęta/zanęta została usunięta |

### 7.4 Aktualizacja połowu

```typescript
PATCH /api/v1/catches/{id}
Request Body: UpdateCatchCommand
Response: CatchDto (200 OK)

// Request type:
interface UpdateCatchCommand {
  caught_at?: ISODateTime;
  species_id?: UUID;
  lure_id?: UUID;
  groundbait_id?: UUID;
  weight_g?: number | null;
  length_mm?: number | null;
  photo_path?: string | null;  // aktualizowane przez endpoint photo
}

// Przykład (częściowa aktualizacja):
{
  "weight_g": 1500,
  "length_mm": 700
}
```

**Błędy:**
| Kod | Kod błędu | Opis |
|-----|-----------|------|
| 400 | `validation_error` | Nieprawidłowe dane |
| 401 | `unauthorized` | Brak sesji |
| 404 | `not_found` | Połów nie istnieje lub należy do innego użytkownika |
| 409 | `equipment_owner_mismatch` | Przynęta/zanęta należy do innego użytkownika |

### 7.5 Usuwanie połowu

```typescript
DELETE /api/v1/catches/{id}
Response: 204 No Content

// Uwaga: usunięcie połowu automatycznie usuwa powiązane zdjęcie ze Storage
```

**Błędy:**
| Kod | Opis |
|-----|------|
| 401 | Unauthorized |
| 404 | Not Found |

### 7.4 Upload zdjęcia (z kompresją server-side via Sharp)

**Dostępne endpointy API:**

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/v1/catches/{id}/photo` | POST | Upload z kompresją server-side (zalecany) |
| `/api/v1/catches/{id}/photo` | DELETE | Usunięcie zdjęcia |
| `/api/v1/catches/{id}/photo/download-url` | GET | Signed URL do wyświetlenia (10 min) |
| `/api/v1/catches/{id}/photo/upload-url` | POST | Signed URL dla direct upload (opcjonalny) |
| `/api/v1/catches/{id}/photo/commit` | POST | Zatwierdzenie po direct upload (opcjonalny) |

**Architektura przetwarzania zdjęć (zalecany flow):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Przeglądarka)                                                   │
│ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│ │ 1. Wybór pliku  │───►│ 2. Resize       │───►│ 3. Upload       │      │
│ │ (max 10MB)      │    │ OffscreenCanvas │    │ FormData        │      │
│ │                 │    │ (max 2000px)    │    │ POST .../photo  │      │
│ └─────────────────┘    └─────────────────┘    └────────┬────────┘      │
└────────────────────────────────────────────────────────┼────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER (Astro API + Sharp)                                              │
│ ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│ │ 4. Sharp:       │───►│ 5. Convert to   │───►│ 6. Upload to    │      │
│ │ - Resize final  │    │ WebP (q:80)     │    │ Supabase Storage│      │
│ │ - Strip EXIF    │    │                 │    │ + Update DB     │      │
│ └─────────────────┘    └─────────────────┘    └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Resize client-side (src/lib/image-utils.ts):**

```typescript
// Natywny resize bez zewnętrznych bibliotek
export async function resizeImage(
  file: File,
  maxSize: number = 2000
): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  
  if (scale === 1) {
    // Obraz już jest mniejszy niż maxSize
    return file;
  }
  
  const canvas = new OffscreenCanvas(
    Math.round(img.width * scale),
    Math.round(img.height * scale)
  );
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}
```

**Flow API - Upload (zalecany):**

```typescript
// Krok 1: Upload zdjęcia z kompresją server-side
POST /api/v1/catches/{id}/photo
Content-Type: multipart/form-data
Body: { file: Blob }

// Response 201 Created:
{
  "photo_path": "user_id/catch_id.webp",
  "size_bytes": 245000,
  "width": 1920,
  "height": 1440
}

// Server-side automatycznie:
// - Sharp: resize (max 2000px), optimize, convert to WebP (q:80)
// - Strip EXIF metadata (ochrona prywatności)
// - Upload do Supabase Storage (bucket: catch-photos)
// - Aktualizacja catch.photo_path w bazie danych
```

**Flow API - Wyświetlanie istniejącego zdjęcia:**

```typescript
// Pobranie signed URL do wyświetlenia (ważny 10 minut)
GET /api/v1/catches/{id}/photo/download-url

// Response 200 OK:
{
  "url": "https://storage.supabase.co/...",
  "expires_in": 600
}

// Użycie w komponencie:
<img src={downloadUrl} alt="Zdjęcie połowu" />
```

**Flow API - Usunięcie zdjęcia:**

```typescript
// Usunięcie zdjęcia
DELETE /api/v1/catches/{id}/photo

// Response: 204 No Content

// Server-side automatycznie:
// - Usuwa plik ze Storage
// - Ustawia catch.photo_path = null
```

**Alternatywny flow - Direct upload (dla zaawansowanych przypadków):**

```typescript
// Krok 1: Pobranie signed URL do uploadu
POST /api/v1/catches/{id}/photo/upload-url
Body: { "content_type": "image/jpeg", "file_ext": "jpg" }

// Response:
{
  "object": { "bucket": "catch-photos", "path": "user_id/catch_id.jpg" },
  "upload": { "url": "https://...", "expires_in": 600, "method": "PUT" }
}

// Krok 2: Direct upload do Storage
PUT {signedUrl}
Body: raw file data

// Krok 3: Zatwierdzenie photo_path
POST /api/v1/catches/{id}/photo/commit
Body: { "photo_path": "user_id/catch_id.jpg" }

// Response: CatchDto (zaktualizowany połów)
```

**Obsługa błędów API:**

| Kod | Error Code | Scenariusz |
|-----|------------|------------|
| 400 | `validation_error` | Nieobsługiwany typ pliku, nieprawidłowe dane |
| 401 | `unauthorized` | Brak sesji |
| 404 | `not_found` | Połów nie istnieje lub brak zdjęcia |
| 409 | `conflict` | Ścieżka poza folderem użytkownika |
| 413 | `payload_too_large` | Plik > 10MB |
| 500 | `internal_error` | Błąd Sharp lub Storage |

**Zalety architektury:**
- ✅ Nie obciąża telefonu użytkownika (ważne w warunkach polowych)
- ✅ Pełna kontrola nad jakością i formatem (WebP)
- ✅ Sharp jest bardzo szybki (oparty na libvips)
- ✅ Automatyczne usuwanie EXIF (ochrona prywatności GPS)
- ✅ Brak zewnętrznych zależności client-side
- ✅ Signed URLs zapewniają bezpieczeństwo Storage
- ✅ Możliwość generowania thumbnails w przyszłości

## 8. Interakcje użytkownika

### 8.1 Otwarcie formularza

| Akcja | Wynik |
|-------|-------|
| Kliknięcie FAB "Dodaj połów" | Otwarcie dialogu w trybie tworzenia |
| Kliknięcie na połów w liście | Otwarcie dialogu w trybie edycji z wypełnionymi danymi |

### 8.2 Wypełnianie formularza

| Akcja | Wynik |
|-------|-------|
| Kliknięcie na SpeciesSelect | Otwarcie listy gatunków z możliwością wyszukiwania |
| Wpisanie tekstu w SpeciesSelect | Filtrowanie listy gatunków |
| Wybór gatunku | Zamknięcie listy, wyświetlenie wybranej wartości |
| Kliknięcie na LureSelect | Otwarcie listy przynęt użytkownika |
| Wybór przynęty | Zamknięcie listy, wyświetlenie wybranej wartości |
| Kliknięcie na GroundbaitSelect | Otwarcie listy zanęt użytkownika |
| Wybór zanęty | Zamknięcie listy, wyświetlenie wybranej wartości |
| Zmiana czasu | Aktualizacja pola caught_at |
| Rozwinięcie sekcji opcjonalnej | Wyświetlenie pól Weight, Length, Photo |
| Wprowadzenie wagi | Konwersja kg→g, walidacja |
| Wprowadzenie długości | Konwersja cm→mm, walidacja |
| Przeciągnięcie zdjęcia | Resize client-side, podgląd lokalny, przygotowanie do uploadu |
| Usunięcie nowego zdjęcia | Wyczyszczenie podglądu i stanu uploadu |
| Usunięcie istniejącego zdjęcia | `DELETE /catches/{id}/photo`, wyczyszczenie podglądu |
| Edycja połowu ze zdjęciem | Pobranie signed URL (`GET .../download-url`), wyświetlenie podglądu |

### 8.3 Wysyłanie formularza

| Akcja | Wynik |
|-------|-------|
| Kliknięcie "Zapisz" z pustymi polami wymaganymi | Wyświetlenie błędów walidacji |
| Kliknięcie "Zapisz" z poprawnymi danymi | Loading state, wysłanie do API |
| Sukces API | Zamknięcie dialogu, odświeżenie listy połowów |
| Błąd API (walidacja) | Wyświetlenie błędów przy polach |
| Błąd API (serwer) | Wyświetlenie toast z błędem |
| Kliknięcie "Anuluj" | Zamknięcie dialogu bez zapisywania |

## 9. Warunki i walidacja

### 9.1 Walidacja client-side (Zod)

```typescript
import { z } from "zod";

const catchFormSchema = z.object({
  species_id: z.string().uuid("Wybierz gatunek ryby"),
  lure_id: z.string().uuid("Wybierz przynętę"),
  groundbait_id: z.string().uuid("Wybierz zanętę"),
  caught_at: z.date()
    .refine((date) => date <= new Date(), "Data nie może być w przyszłości"),
  weight_g: z.number()
    .int("Waga musi być liczbą całkowitą")
    .positive("Waga musi być większa od 0")
    .max(100000, "Maksymalna waga to 100 kg")
    .nullable()
    .optional(),
  length_mm: z.number()
    .int("Długość musi być liczbą całkowitą")
    .positive("Długość musi być większa od 0")
    .max(3000, "Maksymalna długość to 300 cm")
    .nullable()
    .optional(),
});
```

### 9.2 Walidacja kontekstowa (zakres dat wyprawy)

```typescript
const validateCaughtAt = (
  caughtAt: Date,
  tripStartedAt: string,
  tripEndedAt: string | null
): string | undefined => {
  const startDate = new Date(tripStartedAt);
  
  if (caughtAt < startDate) {
    return "Data połowu nie może być przed rozpoczęciem wyprawy";
  }
  
  if (tripEndedAt) {
    const endDate = new Date(tripEndedAt);
    if (caughtAt > endDate) {
      return "Data połowu nie może być po zakończeniu wyprawy";
    }
  }
  
  return undefined;
};
```

### 9.3 Walidacja server-side (błędy API)

| Kod błędu | Pole | Komunikat |
|-----------|------|-----------|
| `validation_error` | caught_at | "Data połowu musi być w zakresie wyprawy" |
| `validation_error` | species_id | "Nieprawidłowy gatunek ryby" |
| `equipment_owner_mismatch` | lure_id | "Przynęta należy do innego użytkownika" |
| `equipment_owner_mismatch` | groundbait_id | "Zanęta należy do innego użytkownika" |
| `equipment_soft_deleted` | lure_id | "Przynęta została usunięta" |
| `equipment_soft_deleted` | groundbait_id | "Zanęta została usunięta" |

### 9.4 Wpływ walidacji na UI

- Błędy wyświetlane pod polami z czerwoną obwódką
- Przycisk "Zapisz" disabled gdy są błędy walidacji
- Toast notification dla błędów API
- Pole z błędem otrzymuje focus

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia | Toast "Brak połączenia z internetem", retry button |
| Timeout | Toast "Serwer nie odpowiada", retry button |
| 500 Internal Error | Toast "Wystąpił błąd serwera", retry button |

### 10.2 Błędy walidacji API

| Scenariusz | Obsługa |
|------------|---------|
| 400 Validation Error | Mapowanie błędów do pól formularza |
| 401 Unauthorized | Przekierowanie do logowania |
| 404 Not Found (trip) | Toast "Wyprawa nie istnieje", zamknięcie dialogu |
| 409 Conflict (equipment) | Toast z komunikatem, odświeżenie selectów |

### 10.3 Błędy uploadu zdjęcia

| Scenariusz | Kod błędu | Obsługa |
|------------|-----------|---------|
| Plik za duży (>10MB) | `payload_too_large` (413) | Toast "Plik przekracza maksymalny rozmiar 10MB" |
| Nieprawidłowy format | `validation_error` (400) | Toast "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP" |
| Błąd przetwarzania Sharp | `internal_error` (500) | Toast "Błąd przetwarzania obrazu", Retry button |
| Błąd Storage | `internal_error` (500) | Toast "Błąd zapisu do storage", Retry button |
| Połów nie istnieje | `not_found` (404) | Toast "Połów nie został znaleziony" |
| Brak zdjęcia (download-url) | `not_found` (404) | Wyświetlenie placeholder zamiast zdjęcia |
| Signed URL wygasł | - | Automatyczne ponowne pobranie URL |
| Błąd usuwania | `internal_error` (500) | Toast "Nie udało się usunąć zdjęcia" |

### 10.4 Optimistic Updates

W trybie edycji stosujemy optimistic updates:
1. Natychmiastowa aktualizacja UI
2. Wysłanie żądania do API
3. Przy błędzie: rollback do poprzedniego stanu + toast

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów i schematów
1. Utworzyć plik `src/lib/schemas/catch-form.schema.ts` z schematem Zod
2. Utworzyć plik `src/components/catches/types.ts` z typami formularza

### Krok 2: Implementacja custom hooków
1. Utworzyć `src/hooks/useCatchSelectData.ts` - pobieranie danych dla selectów
2. Utworzyć `src/hooks/useCatchForm.ts` - zarządzanie stanem formularza
3. Utworzyć `src/hooks/usePhotoUpload.ts` - obsługa resize client-side + integracja z API:
   - `POST /catches/{id}/photo` - upload z kompresją server-side
   - `DELETE /catches/{id}/photo` - usunięcie zdjęcia
   - `GET /catches/{id}/photo/download-url` - signed URL do wyświetlenia

### Krok 3: Implementacja komponentów selectów
1. Utworzyć `src/components/catches/SpeciesSelect.tsx`
2. Utworzyć `src/components/catches/LureSelect.tsx`
3. Utworzyć `src/components/catches/GroundbaitSelect.tsx`

### Krok 4: Implementacja komponentów inputów
1. Utworzyć `src/components/catches/TimeInput.tsx`
2. Utworzyć `src/components/catches/WeightInput.tsx`
3. Utworzyć `src/components/catches/LengthInput.tsx`

### Krok 5: Implementacja uploadu zdjęć
1. Utworzyć `src/components/catches/PhotoUpload.tsx` z resize client-side (natywne Canvas API)
2. Utworzyć `src/lib/image-utils.ts` z funkcją `resizeImage()` używającą OffscreenCanvas
3. Utworzyć `src/hooks/usePhotoUpload.ts` z integracją API:
   - `uploadPhoto(catchId, file)` - `POST /catches/{id}/photo`
   - `deletePhoto(catchId)` - `DELETE /catches/{id}/photo`
   - `fetchDownloadUrl(catchId)` - `GET /catches/{id}/photo/download-url`
4. Zaimplementować podgląd (lokalny dla nowego, signed URL dla istniejącego)
5. Zaimplementować progress bar i obsługę błędów
6. **API endpointy już zaimplementowane** (Sharp server-side, Supabase Storage)

### Krok 6: Implementacja sekcji opcjonalnej
1. Utworzyć `src/components/catches/CollapsibleOptional.tsx`

### Krok 7: Implementacja formularza
1. Utworzyć `src/components/catches/CatchForm.tsx`
2. Zintegrować wszystkie komponenty
3. Dodać walidację i obsługę błędów

### Krok 8: Implementacja dialogu
1. Utworzyć `src/components/catches/CatchFormDialog.tsx`
2. Dodać responsywne zachowanie (mobile/desktop)
3. Zintegrować z CatchForm

### Krok 9: Integracja z widokiem wyprawy
1. Dodać przycisk FAB do widoku `/app/trips/[id]`
2. Podłączyć otwieranie dialogu
3. Obsłużyć callback onSuccess (odświeżenie listy)

### Krok 10: Testowanie
1. Testy jednostkowe komponentów
2. Testy integracyjne formularza
3. Testy E2E scenariuszy użytkownika
4. Testy responsywności (mobile/desktop)
5. Testy walidacji i obsługi błędów

### Krok 11: Optymalizacja
1. Lazy loading danych selectów
2. Debouncing wyszukiwania gatunków
3. Memoizacja komponentów
4. Optymalizacja re-renderów

