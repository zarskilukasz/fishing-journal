# Architektura UI dla Dziennik Wędkarski MVP

## 1. Przegląd struktury UI

Dziennik Wędkarski to Progressive Web App (PWA) z pełną responsywnością (RWD), zaprojektowana jako osobiste narzędzie dla wędkarza do rejestrowania wypraw, połowów i sprzętu. Interfejs bazuje na **Material Design 3** z wykorzystaniem **Shadcn/ui**, zoptymalizowany pod kątem szybkiego wprowadzania danych w warunkach polowych.

### Założenia architektoniczne

| Aspekt | Decyzja |
|--------|---------|
| **Framework** | Astro 5 + React 19 |
| **Styling** | Tailwind CSS 4 + Shadcn/ui |
| **Design System** | Material Design 3 (Material You) |
| **Język** | Polski |
| **Jednostki** | Metryczne (kg, cm, mm, g) |
| **Responsywność** | Mobile-first (360px+), Desktop (1920px) |
| **State Management** | TanStack Query (server state) + React Context (UI state) |
| **Formularze** | React Hook Form + Zod |
| **Autentykacja** | Supabase Auth |

### Struktura nawigacji

```
/ (Landing Page - niezalogowani)
├── /auth/login (Logowanie)
└── /app (Chroniona strefa - zalogowani)
    ├── /app (Dashboard - lista wypraw)
    ├── /app/trips/[id] (Szczegóły wyprawy)
    ├── /app/trips/[id]/edit (Edycja wyprawy)
    ├── /app/equipment (Zarządzanie sprzętem)
    └── /app/profile (Profil użytkownika)
```

---

## 2. Lista widoków

### 2.1 Mini Landing Page

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/` |
| **Główny cel** | Powitanie niezalogowanych użytkowników, zachęcenie do logowania |
| **Dostęp** | Publiczny (tylko niezalogowani) |

**Kluczowe informacje do wyświetlenia:**
- Logo/nazwa aplikacji "Dziennik Wędkarski"
- Krótkie hasło zachęcające (np. "Twój osobisty asystent wędkarski")
- Przycisk "Zaloguj się"

**Kluczowe komponenty:**
- `Logo` - logo aplikacji (centrowane)
- `Tagline` - hasło promocyjne (MD3 headline typography)
- `LoginButton` - Filled button (MD3 primary)
- `HeroIllustration` - ilustracja w stylu Material illustrations

**UX, dostępność i bezpieczeństwo:**
- Minimalistyczny design zgodny z MD3
- Automatyczny redirect zalogowanych użytkowników do `/app`
- High contrast dla czytelności
- Focus management dla klawiatury

---

### 2.2 Strona logowania

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/auth/login` |
| **Główny cel** | Uwierzytelnienie użytkownika |
| **Dostęp** | Publiczny (tylko niezalogowani) |

**Kluczowe informacje do wyświetlenia:**
- Formularz logowania (email/hasło)
- Opcje social login (jeśli skonfigurowane)
- Link do rejestracji (placeholder w MVP)

**Kluczowe komponenty:**
- `LoginForm` - formularz z MD3 Text Fields (filled style)
- `SocialLoginButtons` - przyciski social login
- `ErrorMessage` - inline error messages

**UX, dostępność i bezpieczeństwo:**
- Supabase Auth Helpers dla bezpiecznego logowania
- Auto-refresh tokenów
- Redirect na poprzednią stronę po zalogowaniu
- Walidacja po stronie klienta (Zod)
- Aria-labels po polsku

---

### 2.3 Dashboard (Ekran główny)

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app` |
| **Główny cel** | Przegląd ostatnich wypraw, szybki dostęp do nowej wyprawy |
| **Dostęp** | Zalogowani użytkownicy |

**Kluczowe informacje do wyświetlenia:**
- Lista wypraw (chronologicznie od najnowszej)
- Dla każdej wyprawy: data, lokalizacja, liczba połowów, ikona pogody
- Status aktywnej wyprawy (jeśli istnieje)
- Empty state dla nowych użytkowników

**Kluczowe komponenty:**
- `AppLayout` - wrapper z nawigacją
- `TopAppBar` - nagłówek z avatar użytkownika
- `TripList` - lista kart wypraw (MD3 Filled Cards)
- `TripCard` - pojedyncza karta wyprawy z podsumowaniem
- `ActiveTripBanner` - banner dla trwającej wyprawy (MD3 Banner)
- `FAB` - Extended FAB "Nowa wyprawa" (bottom-right)
- `EmptyState` - ilustracja + CTA dla pustej listy
- `BottomNavigation` - nawigacja dolna (mobile)
- `NavigationRail` - nawigacja boczna (desktop)

**UX, dostępność i bezpieczeństwo:**
- Infinite scroll na mobile, "Załaduj więcej" na desktop
- Skeleton loading podczas ładowania
- Optimistic updates po mutacjach
- Touch targets minimum 48dp
- Sortowanie domyślne: `started_at DESC`

**Integracja API:**
- `GET /api/v1/trips` - lista wypraw z `catch_count`
- Cursor-based pagination
- Query params: `sort=started_at&order=desc`

---

### 2.4 Szczegóły wyprawy

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/trips/[id]` |
| **Główny cel** | Pełny widok wyprawy z wszystkimi powiązanymi danymi |
| **Dostęp** | Zalogowani użytkownicy (właściciel) |

**Kluczowe informacje do wyświetlenia:**
- Nagłówek: data/czas rozpoczęcia i zakończenia, status
- Lokalizacja na mapie
- Podsumowanie statystyk (czas trwania, liczba połowów, łączna waga, największa ryba)
- Timeline pogody (godzinowa oś czasu)
- Lista połowów z miniaturkami zdjęć
- Przypisany sprzęt (wędki, przynęty, zanęty)

**Kluczowe komponenty:**
- `TripHeader` - nagłówek z datami, statusem, akcjami
- `TripSummaryGrid` - MD3 Cards ze statystykami (Display typography)
- `LocationMap` - Google Maps z markerem lokalizacji
- `WeatherTimeline` - horizontal scroll z kartami godzinowymi
- `WeatherManualBanner` - CTA gdy brak danych pogodowych
- `CatchList` - lista połowów jako MD3 List items
- `CatchCard` - karta połowu (gatunek, waga, zdjęcie)
- `EquipmentChips` - MD3 Chips w sekcjach (wędki/przynęty/zanęty)
- `FAB` - "Dodaj połów" (sticky)
- `TripActions` - menu akcji (edytuj, zamknij, usuń)

**UX, dostępność i bezpieczeństwo:**
- Jedna scrollowalna strona (NIE zakładki)
- Wyraźnie oddzielone sekcje (MD3 dividers)
- Lazy loading map
- Confirmation dialog przy zamykaniu/usuwaniu
- RLS zapewnia dostęp tylko właścicielowi

**Integracja API:**
- `GET /api/v1/trips/{id}?include=catches,rods,lures,groundbaits,weather_current`
- `POST /api/v1/trips/{id}/close` - zamknięcie wyprawy
- `DELETE /api/v1/trips/{id}` - soft-delete

---

### 2.5 Formularz połowu (Modal/Dialog)

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | Modal w `/app/trips/[id]` |
| **Główny cel** | Szybkie dodanie/edycja połowu (<90 sekund) |
| **Dostęp** | Zalogowani użytkownicy (właściciel wyprawy) |

**Kluczowe informacje do wprowadzenia:**
- **Wymagane**: Gatunek, Przynęta, Zanęta
- **Opcjonalne**: Waga (g), Długość (mm), Zdjęcie, Godzina połowu
- Smart defaults (godzina = teraz, przynęta/zanęta z ostatniego połowu)

**Kluczowe komponenty:**
- `CatchFormDialog` - Full-screen dialog (mobile) / Standard dialog (desktop)
- `SpeciesSelect` - Combobox z wyszukiwaniem gatunków
- `LureSelect` - Combobox z listą przynęt użytkownika
- `GroundbaitSelect` - Combobox z listą zanęt użytkownika
- `WeightInput` - input numeryczny (g) z wyświetlaniem jako kg
- `LengthInput` - input numeryczny (mm) z wyświetlaniem jako cm
- `TimeInput` - datetime picker (MD3 style)
- `PhotoUpload` - upload z preview, kompresją i progress barem
- `CollapsibleOptional` - rozwijalna sekcja dla opcjonalnych pól

**UX, dostępność i bezpieczeństwo:**
- Progressive disclosure - wymagane pola widoczne, opcjonalne w rozwijalnej sekcji
- Smart defaults redukują czas wprowadzania
- Wstępny resize zdjęć client-side do 2000px (natywne Canvas API) + finalna kompresja server-side (Sharp)
- Walidacja Zod + wyświetlanie błędów inline
- Optimistic updates z rollback przy błędzie

**Integracja API:**
- `POST /api/v1/trips/{tripId}/catches` - tworzenie
- `PATCH /api/v1/catches/{id}` - edycja
- `POST /api/v1/catches/{id}/photo/upload-url` - signed URL do uploadu
- `POST /api/v1/catches/{id}/photo/commit` - potwierdzenie uploadu
- `GET /api/v1/fish-species` - lista gatunków
- `GET /api/v1/lures` - lista przynęt
- `GET /api/v1/groundbaits` - lista zanęt

---

### 2.6 Quick Start (Modal/Bottom Sheet)

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | Modal z Dashboard (`/app`) |
| **Główny cel** | Rozpoczęcie nowej wyprawy jednym kliknięciem |
| **Dostęp** | Zalogowani użytkownicy |

**Kluczowe informacje do wprowadzenia:**
- Checkbox: "Użyj mojej lokalizacji GPS"
- Checkbox: "Kopiuj sprzęt z ostatniej wyprawy"

**Kluczowe komponenty:**
- `QuickStartSheet` - Modal Bottom Sheet (mobile) / Standard Dialog (desktop)
- `GPSCheckbox` - MD3 Checkbox z label
- `CopyEquipmentCheckbox` - MD3 Checkbox z label
- `StartButton` - Filled button "Rozpocznij wyprawę"

**UX, dostępność i bezpieczeństwo:**
- Domyślnie oba checkboxy zaznaczone
- Graceful handling odmowy dostępu do GPS
- Fallback na ręczne wprowadzenie lokalizacji
- Snackbar "Wyprawa rozpoczęta" po sukcesie

**Integracja API:**
- `POST /api/v1/trips/quick-start` z `{ use_gps: true, copy_equipment_from_last_trip: true }`
- Zwraca nową wyprawę + listę skopiowanych ID sprzętu

---

### 2.7 Edycja wyprawy

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/trips/[id]/edit` |
| **Główny cel** | Modyfikacja danych wyprawy |
| **Dostęp** | Zalogowani użytkownicy (właściciel) |

**Kluczowe informacje do edycji:**
- Data/czas rozpoczęcia i zakończenia
- Lokalizacja (mapa)
- Nazwa miejsca (label)
- Przypisany sprzęt (multiselect)

**Kluczowe komponenty:**
- `TripForm` - formularz edycji
- `DateTimePicker` - MD3 Date/Time pickers
- `LocationPicker` - Google Maps z edytowalnym markerem
- `EquipmentMultiSelect` - Combobox z chips dla każdego typu sprzętu
- `WeatherWarningDialog` - ostrzeżenie o utracie danych pogodowych przy zmianie daty

**UX, dostępność i bezpieczeństwo:**
- Confirmation dialog przy zmianie daty (utrata pogody)
- Walidacja: `ended_at >= started_at`
- Walidacja: `caught_at` w zakresie wyprawy
- RLS zapewnia dostęp tylko właścicielowi

**Integracja API:**
- `GET /api/v1/trips/{id}?include=rods,lures,groundbaits`
- `PATCH /api/v1/trips/{id}`
- `PUT /api/v1/trips/{tripId}/rods` - zamiana selekcji wędek
- `PUT /api/v1/trips/{tripId}/lures` - zamiana selekcji przynęt
- `PUT /api/v1/trips/{tripId}/groundbaits` - zamiana selekcji zanęt

---

### 2.8 Zarządzanie sprzętem

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/equipment` |
| **Główny cel** | CRUD dla wędek, przynęt i zanęt |
| **Dostęp** | Zalogowani użytkownicy |

**Kluczowe informacje do wyświetlenia:**
- Lista wędek (nazwa, data utworzenia)
- Lista przynęt (nazwa, data utworzenia)
- Lista zanęt (nazwa, data utworzenia)
- Możliwość filtrowania/wyszukiwania

**Kluczowe komponenty:**
- `EquipmentTabs` - MD3 Tabs dla kategorii (Wędki | Przynęty | Zanęty)
- `EquipmentList` - lista elementów z akcjami
- `EquipmentItem` - list item z trailing icons (edit, delete)
- `EquipmentFormDialog` - dialog do dodawania/edycji
- `SearchInput` - pole wyszukiwania
- `SwipeActions` - swipe-to-reveal na mobile
- `EmptyState` - ilustracja + CTA dla pustej listy

**UX, dostępność i bezpieczeństwo:**
- Swipe-to-reveal actions na mobile
- Hover actions na desktop
- Inline dodawanie (quick-add) bez opuszczania widoku
- Soft-delete zachowuje historię w wyprawach
- Confirmation dialog przy usuwaniu

**Integracja API:**
- `GET /api/v1/rods` - lista wędek
- `POST /api/v1/rods` - tworzenie wędki
- `PATCH /api/v1/rods/{id}` - edycja wędki
- `DELETE /api/v1/rods/{id}` - soft-delete wędki
- Analogicznie dla `/lures` i `/groundbaits`

---

### 2.9 Profil użytkownika

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/app/profile` |
| **Główny cel** | Informacje o użytkowniku, wylogowanie |
| **Dostęp** | Zalogowani użytkownicy |

**Kluczowe informacje do wyświetlenia:**
- Email użytkownika
- Przycisk wylogowania

**Kluczowe komponenty:**
- `UserInfo` - email użytkownika (MD3 list item)
- `LogoutButton` - Outlined button "Wyloguj się"
- `LogoutConfirmDialog` - confirmation dialog

**UX, dostępność i bezpieczeństwo:**
- Minimalistyczny design (MVP)
- Confirmation dialog przed wylogowaniem
- Czyszczenie sesji i redirect na Landing Page

**Integracja API:**
- Supabase

---

### 2.10 Formularz ręcznego wprowadzania pogody (Modal)

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | Modal w `/app/trips/[id]` |
| **Główny cel** | Ręczne wprowadzenie danych pogodowych dla wypraw >24h |
| **Dostęp** | Zalogowani użytkownicy (właściciel wyprawy) |

**Kluczowe informacje do wprowadzenia:**
- Okres (start/end)
- Dane godzinowe: temperatura, ciśnienie, wiatr, wilgotność, opady, zachmurzenie

**Kluczowe komponenty:**
- `WeatherFormDialog` - dialog z formularzem
- `WeatherHourInput` - grupa inputów dla jednej godziny
- `AddHourButton` - przycisk dodania kolejnej godziny
- `TemperatureInput` - slider/input (-100 do 100°C)
- `PressureInput` - input (800-1200 hPa)
- `WindInput` - prędkość (>=0 km/h) + kierunek (0-360°)

**UX, dostępność i bezpieczeństwo:**
- Wyświetlany gdy brak automatycznych danych pogodowych
- Walidacja zakresów (Zod)
- Minimum 1 godzina wymagana

**Integracja API:**
- `POST /api/v1/trips/{tripId}/weather/manual`

---

## 3. Mapa podróży użytkownika

### 3.1 Główny scenariusz: Szybka wyprawa z zapisaniem połowu

```
┌─────────────────┐
│  1. Landing Page │
│   (niezalogowany)│
└────────┬────────┘
         │ Klik "Zaloguj się"
         ▼
┌─────────────────┐
│  2. Login Page   │
│   (formularz)    │
└────────┬────────┘
         │ Sukces logowania
         ▼
┌─────────────────┐
│  3. Dashboard    │
│   (lista wypraw) │
└────────┬────────┘
         │ Klik FAB "Nowa wyprawa"
         ▼
┌─────────────────┐
│  4. Quick Start  │
│   (bottom sheet) │
└────────┬────────┘
         │ Klik "Rozpocznij"
         ▼
┌─────────────────┐
│  5. Szczegóły    │────────────────────┐
│   wyprawy        │                    │
│   (nowa, active) │                    │
└────────┬────────┘                    │
         │ Klik FAB "Dodaj połów"      │
         ▼                              │
┌─────────────────┐                    │
│  6. Formularz    │                    │
│   połowu (modal) │                    │
└────────┬────────┘                    │
         │ Zapisz                       │
         ▼                              │
┌─────────────────┐                    │
│  7. Szczegóły    │                    │
│   wyprawy        │◄───────────────────┘
│   (z połowem)    │
└────────┬────────┘
         │ Banner → "Zamknij wyprawę"
         ▼
┌─────────────────┐
│  8. Confirmation │
│   (dialog)       │
└────────┬────────┘
         │ Potwierdź
         ▼
┌─────────────────┐
│  9. Dashboard    │
│   (wyprawa na    │
│    liście)       │
└─────────────────┘
```

### 3.2 Scenariusz: Zarządzanie sprzętem

```
┌─────────────────┐
│  Dashboard       │
└────────┬────────┘
         │ Nawigacja → Sprzęt
         ▼
┌─────────────────┐
│  Zarządzanie     │
│  sprzętem        │
│  (tab: Wędki)    │
└────────┬────────┘
         │ Klik "Dodaj"
         ▼
┌─────────────────┐
│  Formularz       │
│  (dialog)        │
└────────┬────────┘
         │ Zapisz
         ▼
┌─────────────────┐
│  Lista wędek     │
│  (nowy element)  │
└────────┬────────┘
         │ Swipe → Usuń
         ▼
┌─────────────────┐
│  Confirmation    │
└────────┬────────┘
         │ Potwierdź
         ▼
┌─────────────────┐
│  Lista wędek     │
│  (element usunięty)│
└─────────────────┘
```

### 3.3 Scenariusz: Przeglądanie historycznej wyprawy

```
┌─────────────────┐
│  Dashboard       │
└────────┬────────┘
         │ Klik na kartę wyprawy
         ▼
┌─────────────────┐
│  Szczegóły       │
│  wyprawy         │
│  (status=closed) │
└────────┬────────┘
         │ Scroll
         ▼
┌─────────────────┐
│  Sekcja:         │
│  - Podsumowanie  │
│  - Pogoda        │
│  - Połowy        │
│  - Sprzęt        │
└────────┬────────┘
         │ Klik na połów
         ▼
┌─────────────────┐
│  Szczegóły       │
│  połowu          │
│  (zdjęcie, dane) │
└─────────────────┘
```

### 3.4 Scenariusz: Ręczne wprowadzenie pogody

```
┌─────────────────┐
│  Szczegóły       │
│  wyprawy (>24h)  │
│  (brak pogody)   │
└────────┬────────┘
         │ Banner "Dodaj ręcznie"
         ▼
┌─────────────────┐
│  Formularz       │
│  pogody (modal)  │
└────────┬────────┘
         │ Zapisz
         ▼
┌─────────────────┐
│  Szczegóły       │
│  wyprawy         │
│  (z timeline)    │
└─────────────────┘
```

---

## 4. Układ i struktura nawigacji

### 4.1 Nawigacja główna

#### Mobile (<600dp)

```
┌─────────────────────────────────────┐
│           Top App Bar               │
│  [←]  Tytuł strony            [···] │
├─────────────────────────────────────┤
│                                     │
│                                     │
│           Content Area              │
│                                     │
│                                     │
│                            [FAB]    │
├─────────────────────────────────────┤
│  🏠        📦        👤             │
│ Wyprawy  Sprzęt   Profil            │
│        Bottom Navigation            │
└─────────────────────────────────────┘
```

#### Desktop (≥840dp)

```
┌────────────────────────────────────────────────────────┐
│                    Top App Bar                          │
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ 🏠       │                                             │
│ Wyprawy  │                                             │
│          │              Content Area                   │
│ 📦       │             (max-width: 840dp)              │
│ Sprzęt   │                                             │
│          │                                             │
│ 👤       │                              [Extended FAB] │
│ Profil   │                               Nowa wyprawa  │
│          │                                             │
│Navigation│                                             │
│  Rail    │                                             │
└──────────┴─────────────────────────────────────────────┘
```

### 4.2 Hierarchia nawigacji

```
Poziom 1: Główne sekcje (Bottom Nav / Navigation Rail)
├── Wyprawy (Dashboard)
│   └── Poziom 2: Szczegóły wyprawy
│       ├── Poziom 3: Edycja wyprawy
│       ├── Poziom 3: Formularz połowu (modal)
│       └── Poziom 3: Formularz pogody (modal)
├── Sprzęt
│   └── Poziom 2: Formularz sprzętu (modal)
└── Profil
```

### 4.3 Elementy nawigacyjne

| Komponent | Mobile | Desktop | Cel |
|-----------|--------|---------|-----|
| **Top App Bar** | Tytuł, back, menu | Tytuł, avatar | Kontekst i akcje |
| **Bottom Navigation** | 3 destinations | - | Główna nawigacja |
| **Navigation Rail** | - | 3 destinations | Główna nawigacja |
| **FAB** | Standard FAB | Extended FAB | Quick Start |
| **Breadcrumbs** | - | Opcjonalnie | Kontekst hierarchii |

### 4.4 Deep linking

| Ścieżka | Opis |
|---------|------|
| `/app/trips/{id}` | Bezpośredni dostęp do wyprawy |
| `/app/equipment?tab=lures` | Zakładka przynęt |

---

## 5. Kluczowe komponenty

### 5.1 Komponenty layoutu

| Komponent | Opis | Użycie |
|-----------|------|--------|
| `AppLayout` | Wrapper dla zalogowanych stron, zawiera nawigację | Wszystkie `/app/*` |
| `TopAppBar` | Nagłówek MD3 z tytułem, back button, menu | Wszystkie strony |
| `BottomNavigation` | MD3 Navigation Bar | Mobile |
| `NavigationRail` | MD3 Side Navigation | Desktop |
| `FAB` | Floating Action Button (Standard/Extended) | Dashboard, Szczegóły wyprawy |

### 5.2 Komponenty wypraw

| Komponent | Opis | Props |
|-----------|------|-------|
| `TripCard` | MD3 Filled Card z podsumowaniem wyprawy | `trip: TripListItemDto` |
| `TripList` | Lista kart z infinite scroll | `trips: TripListItemDto[]` |
| `TripHeader` | Nagłówek szczegółów (daty, status, akcje) | `trip: TripGetResponseDto` |
| `TripSummaryGrid` | Grid statystyk (czas, połowy, waga) | `trip: TripGetResponseDto` |
| `TripActions` | Menu akcji (edytuj, zamknij, usuń) | `trip: TripDto, onAction` |
| `ActiveTripBanner` | Banner dla trwającej wyprawy | `trip: TripDto` |

### 5.3 Komponenty pogodowe

| Komponent | Opis | Props |
|-----------|------|-------|
| `WeatherTimeline` | Horizontal scroll z kartami godzinowymi | `hours: WeatherHourDto[]` |
| `WeatherHourCard` | Pojedyncza karta godzinowa | `hour: WeatherHourDto` |
| `WeatherManualBanner` | CTA do ręcznego wprowadzenia | `tripId: string` |
| `WeatherFormDialog` | Dialog formularza pogody | `tripId: string, onSave` |
| `WeatherIcon` | Ikona pogodowa (Material Symbols) | `icon: string, text: string` |

### 5.4 Komponenty połowów

| Komponent | Opis | Props |
|-----------|------|-------|
| `CatchCard` | Karta połowu z miniaturką | `catch: CatchDto` |
| `CatchList` | Lista połowów | `catches: CatchDto[]` |
| `CatchFormDialog` | Formularz dodawania/edycji połowu | `tripId, catch?, onSave` |
| `SpeciesSelect` | Combobox gatunków | `value, onChange` |
| `PhotoUpload` | Upload z resize client-side i preview | `value, onChange, maxSize` |

### 5.5 Komponenty sprzętu

| Komponent | Opis | Props |
|-----------|------|-------|
| `EquipmentList` | Lista elementów sprzętu | `items: EquipmentDto[]` |
| `EquipmentItem` | Pojedynczy element z akcjami | `item, onEdit, onDelete` |
| `EquipmentFormDialog` | Dialog dodawania/edycji | `type, item?, onSave` |
| `EquipmentTabs` | Zakładki (Wędki/Przynęty/Zanęty) | `activeTab, onTabChange` |
| `EquipmentMultiSelect` | Combobox z chips | `type, selected, onChange` |
| `EquipmentChips` | Wyświetlanie chips w sekcjach | `equipment: TripEquipmentDto` |

### 5.6 Komponenty formularzy

| Komponent | Opis | Props |
|-----------|------|-------|
| `LocationPicker` | Google Maps z edytowalnym markerem | `location, onChange` |
| `DateTimePicker` | MD3 Date/Time picker | `value, min?, max?, onChange` |
| `WeightInput` | Input numeryczny (g) z display (kg) | `value, onChange` |
| `LengthInput` | Input numeryczny (mm) z display (cm) | `value, onChange` |
| `SearchInput` | Pole wyszukiwania | `value, onChange, placeholder` |

### 5.7 Komponenty UI (bazowe)

| Komponent | Źródło | Customizacja |
|-----------|--------|--------------|
| `Button` | Shadcn/ui | MD3 Filled/Outlined/Text |
| `Card` | Shadcn/ui | MD3 Filled Card |
| `Dialog` | Shadcn/ui | MD3 Full-screen (mobile) / Standard (desktop) |
| `Sheet` | Shadcn/ui | MD3 Bottom Sheet |
| `Tabs` | Shadcn/ui | MD3 Tabs |
| `Select/Combobox` | Shadcn/ui | MD3 Menu |
| `Checkbox` | Shadcn/ui | MD3 Checkbox |
| `Input` | Shadcn/ui | MD3 Text Field (Filled) |
| `Skeleton` | Shadcn/ui | Loading states |
| `Toast/Snackbar` | Shadcn/ui | MD3 Snackbar |
| `Avatar` | Shadcn/ui | MD3 Avatar |

### 5.8 Komponenty stanów

| Komponent | Opis | Użycie |
|-----------|------|--------|
| `EmptyState` | Ilustracja + CTA | Pusta lista wypraw/sprzętu/połowów |
| `LoadingSkeleton` | Skeleton loading | Ładowanie danych |
| `ErrorBanner` | Banner z błędem + retry | Błędy API |
| `OfflineBanner` | Informacja o trybie offline | Brak połączenia |
| `ConfirmDialog` | Dialog potwierdzenia | Usuwanie, zamykanie wyprawy |

---

## 6. Integracja z API - mapowanie widoków na endpointy

| Widok | Endpointy | Cache Strategy |
|-------|-----------|----------------|
| **Dashboard** | `GET /trips` | staleTime: 1min, refetchOnMount |
| **Szczegóły wyprawy** | `GET /trips/{id}?include=...` | staleTime: 30s |
| **Quick Start** | `POST /trips/quick-start` | invalidate trips |
| **Formularz połowu** | `GET /fish-species`, `GET /lures`, `GET /groundbaits`, `POST /catches` | fish-species: Infinity, invalidate catches |
| **Zarządzanie sprzętem** | `GET|POST|PATCH|DELETE /{type}` | invalidate on mutation |
| **Pogoda** | `GET /weather/snapshots/{id}`, `POST /weather/manual` | staleTime: Infinity (immutable) |
| **Profil** | `GET /auth/session`, `POST /auth/logout` | no cache |

---

## 7. Obsługa błędów i stanów specjalnych

### 7.1 Mapowanie błędów API na komunikaty

| Kod błędu | HTTP | Komunikat PL | Akcja UI |
|-----------|------|--------------|----------|
| `unauthorized` | 401 | "Sesja wygasła" | Redirect na `/auth/login` |
| `not_found` | 404 | "Nie znaleziono zasobu" | Redirect lub empty state |
| `validation_error` | 400 | Szczegółowy komunikat z `details.field` | Inline error |
| `conflict` | 409 | "Element o tej nazwie już istnieje" | Snackbar |
| `rate_limited` | 429 | "Zbyt wiele prób. Spróbuj później" | Snackbar + retry button |
| `bad_gateway` | 502 | "Serwis pogodowy niedostępny" | Snackbar + retry |
| `internal_error` | 500 | "Wystąpił błąd. Spróbuj ponownie" | Snackbar + retry |

### 7.2 Stany ładowania

- **Skeleton loading** dla wszystkich list i szczegółów
- **Progress bar** dla uploadu zdjęć
- **Disabled state** dla przycisków podczas wysyłania

### 7.3 Tryb offline

- **Service Worker** dla static assets i PWA
- **Local queue** dla pending mutations
- **Optimistic updates** z rollback przy błędzie
- **MD3 Banner** informujący o statusie offline

---

## 8. Wymagania dostępności (a11y)

| Wymaganie | Implementacja |
|-----------|---------------|
| **Kontrast kolorów** | MD3 color contrast ratios (4.5:1 minimum) |
| **Touch targets** | Minimum 48dp (48x48px) |
| **Focus indicators** | MD3 state layer dla focus |
| **Screen reader** | Aria-labels po polsku |
| **Keyboard navigation** | Pełna obsługa Tab/Enter/Escape |
| **Reduced motion** | `prefers-reduced-motion` support |
| **Semantic HTML** | `<nav>`, `<main>`, `<article>`, `<button>` |

---

## 9. Metryki sukcesu UI

Na podstawie PRD, interfejs powinien umożliwiać:

| Metryka | Cel | Jak mierzyć |
|---------|-----|-------------|
| **Czas zapisu połowu** | <90 sekund | Od kliknięcia FAB do potwierdzenia |
| **Poprawność wyświetlania historii** | 100% | Testy wizualne po 7 dniach |
| **Responsywność** | Brak rozjechanych elementów | Testy na 360px i 1920px |

---

## 10. Priorytety implementacji

### Faza 1: Core (MVP)
1. Mini Landing Page + Login
2. Dashboard z listą wypraw
3. Quick Start
4. Szczegóły wyprawy (podstawowe)
5. Formularz połowu
6. Zarządzanie sprzętem (CRUD)

### Faza 2: Weather & Polish
1. WeatherTimeline (auto-fetch)
2. Formularz ręcznej pogody
3. Upload zdjęć z resize client-side + kompresja Sharp server-side
4. Integracja Google Maps

### Faza 3: PWA & Offline
1. Service Worker
2. Offline queue
3. Push notifications (opcjonalnie)

---

## 11. Nierozwiązane kwestie (do ustalenia)

1. **Dark mode** - czy implementować w MVP? (rekomendacja: tak, MD3 ułatwia)
2. **Strategia PWA** - manifest, ikony, splash screens
3. **Odmowa GPS** - fallback na ręczny wybór lokalizacji
4. **Limity zdjęć** - max liczba, cleanup strategy
5. **Ikony** - Material Symbols vs Lucide (rekomendacja: Material Symbols dla spójności MD3)

