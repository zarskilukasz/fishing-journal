# Plan implementacji widoku: Formularz ręcznego wprowadzania pogody

## 1. Przegląd

Formularz ręcznego wprowadzania pogody to modalny widok (Dialog) umożliwiający użytkownikowi ręczne wprowadzenie danych pogodowych dla wypraw starszych niż 24 godziny, dla których automatyczne pobieranie z API AccuWeather nie jest możliwe. Widok ten realizuje wymaganie US-005 z PRD.

Modal pozwala na:
- Określenie okresu czasowego (start/end)
- Dodanie jednego lub wielu wpisów godzinowych z danymi pogodowymi
- Walidację wszystkich pól zgodnie z ograniczeniami API
- Zapisanie danych jako snapshot pogodowy typu `manual`

Widok jest częścią strony szczegółów wyprawy (`/app/trips/[id]`) i wyświetlany jest gdy brak automatycznych danych pogodowych lub gdy użytkownik chce dodać ręczne dane.

## 2. Routing widoku

**Ścieżka:** Modal wyświetlany w kontekście `/app/trips/[id]`

Widok nie posiada własnej ścieżki URL. Jest modalem (dialogiem) otwieranym z poziomu strony szczegółów wyprawy. Stan otwarcia modala może być opcjonalnie kontrolowany przez query parameter (np. `?weather_form=open`) dla deep-linking, jednak nie jest to wymagane w MVP.

## 3. Struktura komponentów

```
WeatherFormDialog
├── DialogTrigger (przycisk otwierający)
├── DialogContent
│   ├── DialogHeader
│   │   ├── DialogTitle ("Wprowadź dane pogodowe")
│   │   └── DialogDescription
│   └── WeatherForm
│       ├── WeatherPeriodInputs
│       │   ├── DateTimeInput (period_start)
│       │   └── DateTimeInput (period_end)
│       ├── WeatherHoursList
│       │   ├── WeatherHourCard[] (dynamiczna lista)
│       │   │   ├── WeatherHourHeader
│       │   │   │   ├── DateTimeInput (observed_at)
│       │   │   │   └── RemoveHourButton
│       │   │   ├── TemperatureInput
│       │   │   ├── PressureInput
│       │   │   ├── WindInputGroup
│       │   │   │   ├── WindSpeedInput
│       │   │   │   └── WindDirectionInput
│       │   │   ├── HumidityInput
│       │   │   ├── PrecipitationInput
│       │   │   ├── CloudCoverInput
│       │   │   └── WeatherDescriptionGroup
│       │   │       ├── WeatherIconSelect
│       │   │       └── WeatherTextInput
│       │   └── AddHourButton
│       ├── FormErrorSummary
│       └── DialogFooter
│           ├── CancelButton
│           └── SubmitButton
```

## 4. Szczegóły komponentów

### 4.1 WeatherFormDialog

**Opis:** Główny komponent dialogu/modala zawierający cały formularz. Zarządza stanem otwarcia/zamknięcia oraz integruje się z react-hook-form.

**Główne elementy:**
- `Dialog` (shadcn/ui) - kontener modala
- `DialogTrigger` - przycisk otwierający (ikona chmury z plusem)
- `DialogContent` - zawartość modala z formularzem

**Obsługiwane interakcje:**
- Otwarcie modala (kliknięcie triggera)
- Zamknięcie modala (Escape, kliknięcie poza modal, przycisk Anuluj)
- Zamknięcie po udanym zapisie
- Blokada zamknięcia podczas wysyłania

**Obsługiwana walidacja:**
- Deleguje walidację do potomnych komponentów i react-hook-form

**Typy:**
- `WeatherFormDialogProps`
- `WeatherManualFormValues` (formularz)

**Propsy:**
```typescript
interface WeatherFormDialogProps {
  tripId: string;
  tripStartedAt: string; // ISO datetime - do sugestii period_start
  tripEndedAt?: string | null; // ISO datetime - do sugestii period_end
  onSuccess?: (snapshotId: string) => void;
  trigger?: React.ReactNode; // opcjonalny custom trigger
}
```

---

### 4.2 WeatherForm

**Opis:** Komponent formularza zarządzający całą logiką formularza poprzez react-hook-form. Zawiera FormProvider dla potomnych komponentów.

**Główne elementy:**
- `form` HTML element
- `FormProvider` z react-hook-form
- Sekcje formularza (okres, lista godzin, przyciski)

**Obsługiwane interakcje:**
- Submit formularza
- Reset formularza przy anulowaniu

**Obsługiwana walidacja:**
- Integracja z Zod schema (`weatherManualCommandSchema`)
- Wyświetlanie błędów walidacji

**Typy:**
- `WeatherManualFormValues`
- `UseFormReturn<WeatherManualFormValues>`

**Propsy:**
```typescript
interface WeatherFormProps {
  tripId: string;
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
  onSubmitSuccess: (snapshotId: string) => void;
  onCancel: () => void;
}
```

---

### 4.3 WeatherPeriodInputs

**Opis:** Sekcja formularza do wprowadzenia okresu czasowego (start/end). Dwie pola datetime obok siebie (lub pod sobą na mobile).

**Główne elementy:**
- `div` kontener z grid/flex layout
- 2x `DateTimeInput` dla period_start i period_end
- Etykiety pól ("Początek okresu", "Koniec okresu")

**Obsługiwane interakcje:**
- Zmiana wartości datetime
- Focus/blur dla walidacji

**Obsługiwana walidacja:**
- Format ISO 8601 datetime
- `period_end >= period_start`

**Typy:**
- `Control<WeatherManualFormValues>` (z react-hook-form)

**Propsy:**
```typescript
interface WeatherPeriodInputsProps {
  control: Control<WeatherManualFormValues>;
  errors: FieldErrors<WeatherManualFormValues>;
}
```

---

### 4.4 WeatherHoursList

**Opis:** Kontener dla dynamicznej listy wpisów godzinowych. Używa `useFieldArray` z react-hook-form do zarządzania tablicą.

**Główne elementy:**
- `div` kontener z układem listy
- Nagłówek sekcji ("Dane godzinowe")
- Lista `WeatherHourCard`
- `AddHourButton` na końcu listy

**Obsługiwane interakcje:**
- Dodawanie nowego wpisu godzinowego
- Przewijanie listy (jeśli wiele wpisów)

**Obsługiwana walidacja:**
- Minimum 1 wpis godzinowy

**Typy:**
- `UseFieldArrayReturn` (z react-hook-form)

**Propsy:**
```typescript
interface WeatherHoursListProps {
  control: Control<WeatherManualFormValues>;
  errors: FieldErrors<WeatherManualFormValues>;
}
```

---

### 4.5 WeatherHourCard

**Opis:** Karta reprezentująca pojedynczy wpis godzinowy. Zawiera wszystkie pola danych pogodowych dla jednej godziny.

**Główne elementy:**
- `Card` (shadcn/ui) jako kontener
- `CardHeader` z datetime i przyciskiem usunięcia
- `CardContent` z siatką inputów pogodowych

**Obsługiwane interakcje:**
- Usunięcie wpisu (jeśli jest więcej niż 1)
- Edycja wszystkich pól

**Obsługiwana walidacja:**
- `observed_at`: wymagane, format datetime
- Wszystkie pola pogodowe: opcjonalne, walidacja zakresów

**Typy:**
- `WeatherHourFormValues`

**Propsy:**
```typescript
interface WeatherHourCardProps {
  index: number;
  control: Control<WeatherManualFormValues>;
  errors: FieldErrors<WeatherManualFormValues>;
  onRemove: () => void;
  canRemove: boolean; // false jeśli to jedyny wpis
}
```

---

### 4.6 DateTimeInput

**Opis:** Komponent do wprowadzania daty i czasu w formacie ISO 8601. Wrapper nad natywnym input type="datetime-local" lub dedykowanym date-time pickerem.

**Główne elementy:**
- `Label` dla pola
- `Input` type="datetime-local" (lub custom picker)
- Komunikat błędu

**Obsługiwane interakcje:**
- Wybór daty i czasu
- Klawiatura (nawigacja strzałkami)

**Obsługiwana walidacja:**
- Format ISO 8601 datetime

**Typy:**
- Standardowe props kontrolowane przez react-hook-form

**Propsy:**
```typescript
interface DateTimeInputProps {
  name: string;
  label: string;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
  required?: boolean;
}
```

---

### 4.7 TemperatureInput

**Opis:** Input do wprowadzania temperatury w °C. Może zawierać slider + input numeryczny dla lepszego UX.

**Główne elementy:**
- `Label` ("Temperatura (°C)")
- `Slider` (shadcn/ui) - zakres -100 do 100
- `Input` type="number" - precyzyjne wprowadzanie
- Komunikat błędu

**Obsługiwane interakcje:**
- Przeciąganie slidera
- Wpisywanie wartości numerycznej
- Synchronizacja między sliderem a inputem

**Obsługiwana walidacja:**
- Zakres: -100 do 100
- Typ: number (z jednym miejscem po przecinku)

**Propsy:**
```typescript
interface TemperatureInputProps {
  name: `hours.${number}.temperature_c`;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
}
```

---

### 4.8 PressureInput

**Opis:** Input do wprowadzania ciśnienia atmosferycznego w hPa.

**Główne elementy:**
- `Label` ("Ciśnienie (hPa)")
- `Input` type="number"
- Komunikat błędu
- Pomocniczy tekst z zakresem (800-1200)

**Obsługiwane interakcje:**
- Wpisywanie wartości numerycznej

**Obsługiwana walidacja:**
- Zakres: 800 do 1200
- Typ: integer

**Propsy:**
```typescript
interface PressureInputProps {
  name: `hours.${number}.pressure_hpa`;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
}
```

---

### 4.9 WindInputGroup

**Opis:** Grupa inputów dla danych wiatru: prędkość i kierunek.

**Główne elementy:**
- `div` kontener z flex/grid
- `WindSpeedInput` - prędkość w km/h
- `WindDirectionInput` - kierunek w stopniach (0-360)

**Obsługiwane interakcje:**
- Wpisywanie wartości dla obu pól

**Obsługiwana walidacja:**
- Prędkość: >= 0
- Kierunek: 0-360

**Propsy:**
```typescript
interface WindInputGroupProps {
  speedName: `hours.${number}.wind_speed_kmh`;
  directionName: `hours.${number}.wind_direction`;
  control: Control<WeatherManualFormValues>;
  errors: {
    wind_speed_kmh?: FieldError;
    wind_direction?: FieldError;
  };
}
```

---

### 4.10 HumidityInput

**Opis:** Input do wprowadzania wilgotności powietrza w procentach.

**Główne elementy:**
- `Label` ("Wilgotność (%)")
- `Slider` (0-100) lub `Input` type="number"
- Komunikat błędu

**Obsługiwana walidacja:**
- Zakres: 0 do 100
- Typ: integer

**Propsy:**
```typescript
interface HumidityInputProps {
  name: `hours.${number}.humidity_percent`;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
}
```

---

### 4.11 PrecipitationInput

**Opis:** Input do wprowadzania opadów w milimetrach.

**Główne elementy:**
- `Label` ("Opady (mm)")
- `Input` type="number" step="0.1"
- Komunikat błędu

**Obsługiwana walidacja:**
- Zakres: >= 0
- Typ: number

**Propsy:**
```typescript
interface PrecipitationInputProps {
  name: `hours.${number}.precipitation_mm`;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
}
```

---

### 4.12 CloudCoverInput

**Opis:** Input do wprowadzania zachmurzenia w procentach.

**Główne elementy:**
- `Label` ("Zachmurzenie (%)")
- `Slider` (0-100) z wizualnymi oznaczeniami
- Komunikat błędu

**Obsługiwana walidacja:**
- Zakres: 0 do 100
- Typ: integer

**Propsy:**
```typescript
interface CloudCoverInputProps {
  name: `hours.${number}.cloud_cover`;
  control: Control<WeatherManualFormValues>;
  error?: FieldError;
}
```

---

### 4.13 WeatherDescriptionGroup

**Opis:** Grupa pól opisowych pogody: ikona i tekst.

**Główne elementy:**
- `WeatherIconSelect` - dropdown z ikonami pogodowymi
- `WeatherTextInput` - textarea na opis słowny

**Obsługiwana walidacja:**
- Ikona: max 50 znaków
- Tekst: max 255 znaków

**Propsy:**
```typescript
interface WeatherDescriptionGroupProps {
  iconName: `hours.${number}.weather_icon`;
  textName: `hours.${number}.weather_text`;
  control: Control<WeatherManualFormValues>;
  errors: {
    weather_icon?: FieldError;
    weather_text?: FieldError;
  };
}
```

---

### 4.14 AddHourButton

**Opis:** Przycisk do dodania nowego wpisu godzinowego.

**Główne elementy:**
- `Button` (variant="outline")
- Ikona Plus
- Tekst "Dodaj godzinę"

**Obsługiwane interakcje:**
- Kliknięcie - dodanie nowego wpisu z domyślnymi wartościami

**Propsy:**
```typescript
interface AddHourButtonProps {
  onAdd: () => void;
  disabled?: boolean;
}
```

---

### 4.15 FormErrorSummary

**Opis:** Komponent wyświetlający ogólne błędy formularza (np. błąd API).

**Główne elementy:**
- `Alert` (shadcn/ui) z wariantem destructive
- Lista błędów

**Propsy:**
```typescript
interface FormErrorSummaryProps {
  error: string | null;
}
```

## 5. Typy

### 5.1 Istniejące typy (src/types.ts)

```typescript
// Command do wysłania na API
interface WeatherManualCommand {
  fetched_at: ISODateTime;
  period_start: ISODateTime;
  period_end: ISODateTime;
  hours: WeatherManualHourCommand[];
}

type WeatherManualHourCommand = {
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
};

// Response z API
interface WeatherManualResponseDto {
  snapshot_id: UUID;
}
```

### 5.2 Istniejące schematy Zod (src/lib/schemas/weather.schema.ts)

```typescript
// Schema dla walidacji - już zaimplementowane
weatherHourSchema // pojedyncza godzina
weatherManualCommandSchema // cały request
```

### 5.3 Nowe typy ViewModel (do utworzenia)

```typescript
// Plik: src/components/weather/types.ts

/**
 * Wartości formularza dla pojedynczej godziny.
 * Różni się od WeatherManualHourCommand tym, że używa
 * undefined zamiast null dla pustych pól (lepsze dla formularzy).
 */
interface WeatherHourFormValues {
  observed_at: string; // datetime-local format
  temperature_c?: number | undefined;
  pressure_hpa?: number | undefined;
  wind_speed_kmh?: number | undefined;
  wind_direction?: number | undefined;
  humidity_percent?: number | undefined;
  precipitation_mm?: number | undefined;
  cloud_cover?: number | undefined;
  weather_icon?: string | undefined;
  weather_text?: string | undefined;
}

/**
 * Wartości całego formularza ręcznego wprowadzania pogody.
 */
interface WeatherManualFormValues {
  period_start: string; // datetime-local format
  period_end: string; // datetime-local format
  hours: WeatherHourFormValues[];
}

/**
 * Props dla dialogu formularza pogodowego.
 */
interface WeatherFormDialogProps {
  tripId: string;
  tripStartedAt: string;
  tripEndedAt?: string | null;
  onSuccess?: (snapshotId: string) => void;
  trigger?: React.ReactNode;
}

/**
 * Predefiniowane ikony pogodowe do wyboru.
 */
type WeatherIconOption = {
  value: string;
  label: string;
  icon: React.ComponentType;
};

/**
 * Stan hooka useManualWeatherForm.
 */
interface UseManualWeatherFormReturn {
  form: UseFormReturn<WeatherManualFormValues>;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: WeatherManualFormValues) => Promise<void>;
  resetForm: () => void;
}
```

### 5.4 Transformacje typów

```typescript
/**
 * Konwersja z formularza do API command.
 * Zamienia undefined na null i formatuje daty do ISO.
 */
function formValuesToCommand(
  values: WeatherManualFormValues
): WeatherManualCommand {
  return {
    fetched_at: new Date().toISOString(),
    period_start: new Date(values.period_start).toISOString(),
    period_end: new Date(values.period_end).toISOString(),
    hours: values.hours.map(hour => ({
      observed_at: new Date(hour.observed_at).toISOString(),
      temperature_c: hour.temperature_c ?? null,
      pressure_hpa: hour.pressure_hpa ?? null,
      wind_speed_kmh: hour.wind_speed_kmh ?? null,
      wind_direction: hour.wind_direction ?? null,
      humidity_percent: hour.humidity_percent ?? null,
      precipitation_mm: hour.precipitation_mm ?? null,
      cloud_cover: hour.cloud_cover ?? null,
      weather_icon: hour.weather_icon ?? null,
      weather_text: hour.weather_text ?? null,
    })),
  };
}

/**
 * Konwersja datetime-local string do ISO 8601.
 */
function localDateTimeToISO(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

/**
 * Konwersja ISO 8601 do datetime-local format.
 */
function isoToLocalDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: useManualWeatherForm

```typescript
// Plik: src/components/weather/hooks/useManualWeatherForm.ts

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook zarządzający formularzem ręcznego wprowadzania pogody.
 * 
 * Odpowiedzialności:
 * - Inicjalizacja formularza z react-hook-form
 * - Zarządzanie tablicą wpisów godzinowych (useFieldArray)
 * - Integracja z Zod walidacją
 * - Wywołanie API (useMutation)
 * - Obsługa błędów i stanów ładowania
 * - Invalidacja cache po sukcesie
 */
function useManualWeatherForm(
  tripId: string,
  defaultPeriodStart: string,
  defaultPeriodEnd: string,
  onSuccess?: (snapshotId: string) => void
): UseManualWeatherFormReturn {
  // Stan formularza
  const form = useForm<WeatherManualFormValues>({
    resolver: zodResolver(weatherManualFormSchema),
    defaultValues: {
      period_start: isoToLocalDateTime(defaultPeriodStart),
      period_end: isoToLocalDateTime(defaultPeriodEnd),
      hours: [createDefaultHourEntry(defaultPeriodStart)],
    },
  });

  // Dynamiczna tablica godzin
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'hours',
  });

  // Mutacja API
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (command: WeatherManualCommand) => {
      const response = await fetch(
        `/api/v1/trips/${tripId}/weather/manual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Błąd zapisywania pogody');
      }
      
      return response.json() as Promise<WeatherManualResponseDto>;
    },
    onSuccess: (data) => {
      // Invalidacja cache pogody dla tej wyprawy
      queryClient.invalidateQueries({ 
        queryKey: ['trips', tripId, 'weather'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['trips', tripId] 
      });
      onSuccess?.(data.snapshot_id);
    },
  });

  const onSubmit = async (values: WeatherManualFormValues) => {
    const command = formValuesToCommand(values);
    await mutation.mutateAsync(command);
  };

  const resetForm = () => {
    form.reset();
    mutation.reset();
  };

  return {
    form,
    fields,
    append,
    remove,
    isSubmitting: mutation.isPending,
    submitError: mutation.error?.message ?? null,
    onSubmit: form.handleSubmit(onSubmit),
    resetForm,
  };
}
```

### 6.2 Stan komponentów

| Komponent | Stan lokalny | Źródło stanu |
|-----------|--------------|--------------|
| `WeatherFormDialog` | `isOpen: boolean` | `useState` |
| `WeatherForm` | Cały stan formularza | `useManualWeatherForm` |
| `WeatherHourCard` | Brak | Props z parent |
| Inputy | Brak (kontrolowane) | `react-hook-form` |

### 6.3 Domyślne wartości

```typescript
/**
 * Tworzy domyślny wpis godzinowy.
 */
function createDefaultHourEntry(defaultDateTime: string): WeatherHourFormValues {
  return {
    observed_at: isoToLocalDateTime(defaultDateTime),
    temperature_c: undefined,
    pressure_hpa: undefined,
    wind_speed_kmh: undefined,
    wind_direction: undefined,
    humidity_percent: undefined,
    precipitation_mm: undefined,
    cloud_cover: undefined,
    weather_icon: undefined,
    weather_text: undefined,
  };
}
```

## 7. Integracja API

### 7.1 Endpoint

**URL:** `POST /api/v1/trips/{tripId}/weather/manual`

**Headers:**
- `Content-Type: application/json`
- Cookie z sesją Supabase (automatycznie przez przeglądarkę)

### 7.2 Request

```typescript
// Typ żądania
interface WeatherManualCommand {
  fetched_at: string; // ISO 8601
  period_start: string; // ISO 8601
  period_end: string; // ISO 8601
  hours: WeatherManualHourCommand[];
}

// Przykład
{
  "fetched_at": "2025-12-13T14:30:00Z",
  "period_start": "2025-12-12T08:00:00Z",
  "period_end": "2025-12-12T16:00:00Z",
  "hours": [
    {
      "observed_at": "2025-12-12T10:00:00Z",
      "temperature_c": 8.5,
      "pressure_hpa": 1015,
      "wind_speed_kmh": 12.0,
      "wind_direction": 180,
      "humidity_percent": 70,
      "precipitation_mm": 0.0,
      "cloud_cover": 30,
      "weather_icon": "partly-cloudy",
      "weather_text": "Częściowo pochmurno"
    }
  ]
}
```

### 7.3 Response

**201 Created:**
```typescript
interface WeatherManualResponseDto {
  snapshot_id: string; // UUID
}
```

**Błędy:**

| Status | Kod | Przyczyna |
|--------|-----|-----------|
| 400 | `validation_error` | Nieprawidłowe dane (format, zakresy) |
| 401 | `unauthorized` | Brak autoryzacji |
| 404 | `not_found` | Wyprawa nie istnieje |
| 500 | `internal_error` | Błąd serwera |

### 7.4 Funkcja API

```typescript
// Plik: src/components/weather/api/createManualWeatherSnapshot.ts

async function createManualWeatherSnapshot(
  tripId: string,
  command: WeatherManualCommand
): Promise<WeatherManualResponseDto> {
  const response = await fetch(
    `/api/v1/trips/${tripId}/weather/manual`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      credentials: 'include', // dla cookies
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiError(
      errorData.error?.code ?? 'unknown_error',
      errorData.error?.message ?? 'Wystąpił nieznany błąd',
      response.status
    );
  }

  return response.json();
}
```

## 8. Interakcje użytkownika

### 8.1 Otwarcie formularza

1. Użytkownik klika przycisk "Wprowadź pogodę ręcznie" na stronie wyprawy
2. Otwiera się modal z formularzem
3. Formularz jest zainicjalizowany z:
   - `period_start` = `started_at` wyprawy
   - `period_end` = `ended_at` wyprawy (lub teraz)
   - Jeden pusty wpis godzinowy z `observed_at` = `period_start`

### 8.2 Edycja okresu

1. Użytkownik modyfikuje datetime period_start lub period_end
2. Walidacja natychmiastowa (period_end >= period_start)
3. Wyświetlenie błędu pod polem jeśli nieprawidłowe

### 8.3 Dodawanie wpisu godzinowego

1. Użytkownik klika "Dodaj godzinę"
2. Dodawany jest nowy wpis z:
   - `observed_at` = ostatnia godzina + 1h (lub `period_start`)
   - Wszystkie pola pogodowe puste
3. Nowa karta pojawia się na końcu listy
4. Automatyczny scroll do nowej karty

### 8.4 Usuwanie wpisu godzinowego

1. Użytkownik klika ikonę kosza na karcie godziny
2. Wpis jest usuwany z listy
3. Przycisk usuwania niedostępny gdy tylko 1 wpis

### 8.5 Wypełnianie danych pogodowych

1. Użytkownik wypełnia opcjonalne pola w karcie godziny
2. Walidacja on blur dla każdego pola
3. Wyświetlenie błędu pod polem jeśli poza zakresem

### 8.6 Wysłanie formularza

1. Użytkownik klika "Zapisz"
2. Walidacja całego formularza
3. Jeśli błędy - wyświetlenie pod odpowiednimi polami
4. Jeśli OK - wysłanie do API
5. Podczas wysyłania:
   - Przycisk "Zapisz" pokazuje spinner
   - Wszystkie pola disabled
   - Modal nie można zamknąć
6. Po sukcesie:
   - Modal zamyka się
   - Toast z potwierdzeniem
   - Odświeżenie danych wyprawy

### 8.7 Anulowanie

1. Użytkownik klika "Anuluj" lub Escape lub poza modal
2. Jeśli formularz był modyfikowany - potwierdzenie
3. Modal zamyka się, dane nie są zapisywane

## 9. Warunki i walidacja

### 9.1 Warunki na poziomie formularza

| Warunek | Komponent | Komunikat błędu |
|---------|-----------|-----------------|
| `period_end >= period_start` | `WeatherPeriodInputs` | "Koniec okresu musi być równy lub późniejszy niż początek" |
| `hours.length >= 1` | `WeatherHoursList` | "Wymagany jest co najmniej jeden wpis godzinowy" |

### 9.2 Warunki dla pól godzinowych

| Pole | Zakres | Typ | Wymagane | Komunikat |
|------|--------|-----|----------|-----------|
| `observed_at` | valid datetime | string | Tak | "Wymagana data i czas obserwacji" |
| `temperature_c` | -100 do 100 | number | Nie | "Temperatura musi być między -100°C a 100°C" |
| `pressure_hpa` | 800 do 1200 | integer | Nie | "Ciśnienie musi być między 800 a 1200 hPa" |
| `wind_speed_kmh` | >= 0 | number | Nie | "Prędkość wiatru nie może być ujemna" |
| `wind_direction` | 0 do 360 | integer | Nie | "Kierunek wiatru musi być między 0° a 360°" |
| `humidity_percent` | 0 do 100 | integer | Nie | "Wilgotność musi być między 0% a 100%" |
| `precipitation_mm` | >= 0 | number | Nie | "Opady nie mogą być ujemne" |
| `cloud_cover` | 0 do 100 | integer | Nie | "Zachmurzenie musi być między 0% a 100%" |
| `weather_icon` | max 50 znaków | string | Nie | "Maksymalnie 50 znaków" |
| `weather_text` | max 255 znaków | string | Nie | "Maksymalnie 255 znaków" |

### 9.3 Schema Zod dla formularza

```typescript
// Plik: src/components/weather/schemas/weatherManualFormSchema.ts

import { z } from 'zod';

const weatherHourFormSchema = z.object({
  observed_at: z.string().min(1, 'Wymagana data i czas obserwacji'),
  temperature_c: z.number()
    .min(-100, 'Temperatura musi być >= -100°C')
    .max(100, 'Temperatura musi być <= 100°C')
    .optional(),
  pressure_hpa: z.number()
    .int('Ciśnienie musi być liczbą całkowitą')
    .min(800, 'Ciśnienie musi być >= 800 hPa')
    .max(1200, 'Ciśnienie musi być <= 1200 hPa')
    .optional(),
  wind_speed_kmh: z.number()
    .min(0, 'Prędkość wiatru nie może być ujemna')
    .optional(),
  wind_direction: z.number()
    .int('Kierunek musi być liczbą całkowitą')
    .min(0, 'Kierunek musi być >= 0°')
    .max(360, 'Kierunek musi być <= 360°')
    .optional(),
  humidity_percent: z.number()
    .int('Wilgotność musi być liczbą całkowitą')
    .min(0, 'Wilgotność musi być >= 0%')
    .max(100, 'Wilgotność musi być <= 100%')
    .optional(),
  precipitation_mm: z.number()
    .min(0, 'Opady nie mogą być ujemne')
    .optional(),
  cloud_cover: z.number()
    .int('Zachmurzenie musi być liczbą całkowitą')
    .min(0, 'Zachmurzenie musi być >= 0%')
    .max(100, 'Zachmurzenie musi być <= 100%')
    .optional(),
  weather_icon: z.string()
    .max(50, 'Maksymalnie 50 znaków')
    .optional(),
  weather_text: z.string()
    .max(255, 'Maksymalnie 255 znaków')
    .optional(),
});

export const weatherManualFormSchema = z.object({
  period_start: z.string().min(1, 'Wymagana data początku okresu'),
  period_end: z.string().min(1, 'Wymagana data końca okresu'),
  hours: z.array(weatherHourFormSchema)
    .min(1, 'Wymagany jest co najmniej jeden wpis godzinowy'),
}).refine(
  (data) => new Date(data.period_end) >= new Date(data.period_start),
  {
    message: 'Koniec okresu musi być równy lub późniejszy niż początek',
    path: ['period_end'],
  }
);
```

## 10. Obsługa błędów

### 10.1 Błędy walidacji (klient)

| Błąd | Obsługa |
|------|---------|
| Nieprawidłowy format daty | Komunikat pod polem, pole oznaczone jako invalid |
| Wartość poza zakresem | Komunikat pod polem z poprawnym zakresem |
| Brak wymaganych pól | Komunikat pod polem, focus na pierwszym błędnym polu |
| period_end < period_start | Komunikat pod polem period_end |
| Brak wpisów godzinowych | Komunikat w sekcji godzin |

### 10.2 Błędy API

| Status | Kod | Obsługa UI |
|--------|-----|------------|
| 400 | `validation_error` | Wyświetlenie szczegółów błędu w FormErrorSummary |
| 401 | `unauthorized` | Przekierowanie do logowania |
| 404 | `not_found` | Alert "Wyprawa nie została znaleziona" + zamknięcie modala |
| 500 | `internal_error` | Toast z komunikatem "Wystąpił błąd serwera. Spróbuj ponownie." |
| Network error | - | Toast "Brak połączenia z serwerem" |

### 10.3 Implementacja obsługi błędów

```typescript
// W komponencie WeatherForm
const handleSubmitError = (error: Error) => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'unauthorized':
        // Przekierowanie do logowania
        window.location.href = '/auth/login';
        break;
      case 'not_found':
        toast.error('Wyprawa nie została znaleziona');
        onCancel();
        break;
      case 'validation_error':
        // Błąd wyświetlany w FormErrorSummary
        break;
      default:
        toast.error('Wystąpił nieoczekiwany błąd');
    }
  } else {
    toast.error('Brak połączenia z serwerem');
  }
};
```

### 10.4 Stany ładowania

| Stan | UI |
|------|-----|
| Wysyłanie formularza | Spinner na przycisku, disabled wszystkie pola |
| Błąd wysyłania | Alert z komunikatem, przyciski aktywne |
| Sukces | Modal zamknięty, toast z potwierdzeniem |

## 11. Kroki implementacji

### Krok 1: Instalacja zależności

```bash
pnpm add react-hook-form @hookform/resolvers
```

### Krok 2: Instalacja komponentów shadcn/ui

```bash
pnpm dlx shadcn@latest add dialog card input label slider select textarea alert
```

### Krok 3: Utworzenie struktury plików

```
src/components/weather/
├── WeatherFormDialog.tsx
├── WeatherForm.tsx
├── WeatherPeriodInputs.tsx
├── WeatherHoursList.tsx
├── WeatherHourCard.tsx
├── inputs/
│   ├── DateTimeInput.tsx
│   ├── TemperatureInput.tsx
│   ├── PressureInput.tsx
│   ├── WindInputGroup.tsx
│   ├── HumidityInput.tsx
│   ├── PrecipitationInput.tsx
│   ├── CloudCoverInput.tsx
│   └── WeatherDescriptionGroup.tsx
├── AddHourButton.tsx
├── FormErrorSummary.tsx
├── hooks/
│   └── useManualWeatherForm.ts
├── schemas/
│   └── weatherManualFormSchema.ts
├── api/
│   └── createManualWeatherSnapshot.ts
├── types.ts
└── utils.ts
```

### Krok 4: Implementacja typów i schematów

1. Utworzenie `src/components/weather/types.ts` z typami ViewModel
2. Utworzenie `src/components/weather/schemas/weatherManualFormSchema.ts`
3. Utworzenie `src/components/weather/utils.ts` z funkcjami pomocniczymi

### Krok 5: Implementacja funkcji API

1. Utworzenie `src/components/weather/api/createManualWeatherSnapshot.ts`
2. Implementacja funkcji wywołującej endpoint

### Krok 6: Implementacja custom hooka

1. Utworzenie `src/components/weather/hooks/useManualWeatherForm.ts`
2. Implementacja integracji z react-hook-form i useMutation

### Krok 7: Implementacja komponentów inputów

1. `DateTimeInput` - wrapper nad input[type="datetime-local"]
2. `TemperatureInput` - slider + input numeryczny
3. `PressureInput` - input numeryczny z zakresem
4. `WindInputGroup` - grupa inputów wiatru
5. `HumidityInput` - slider lub input
6. `PrecipitationInput` - input numeryczny
7. `CloudCoverInput` - slider
8. `WeatherDescriptionGroup` - select + textarea

### Krok 8: Implementacja komponentów formularza

1. `WeatherHourCard` - karta pojedynczej godziny
2. `AddHourButton` - przycisk dodawania
3. `WeatherHoursList` - lista kart z useFieldArray
4. `WeatherPeriodInputs` - inputy okresu
5. `FormErrorSummary` - podsumowanie błędów

### Krok 9: Implementacja głównych komponentów

1. `WeatherForm` - główny formularz z FormProvider
2. `WeatherFormDialog` - dialog z triggerem

### Krok 10: Integracja z widokiem wyprawy

1. Dodanie `WeatherFormDialog` do strony `/app/trips/[id]`
2. Warunkowe wyświetlanie (gdy brak danych pogodowych)
3. Obsługa callback `onSuccess`

### Krok 11: Stylowanie i responsywność

1. Dostosowanie układu dla mobile (single column)
2. Dostosowanie układu dla desktop (grid)
3. Animacje dialogu
4. Focus management

### Krok 12: Testy

1. Testy jednostkowe dla schematów walidacji
2. Testy komponentów z React Testing Library
3. Testy integracyjne formularza
4. Testy E2E z Playwright (opcjonalnie)

### Krok 13: Dostępność

1. Aria labels dla wszystkich inputów
2. Role dla dynamicznej listy
3. Focus trap w modalu
4. Komunikaty błędów połączone z polami (aria-describedby)
5. Nawigacja klawiaturowa

