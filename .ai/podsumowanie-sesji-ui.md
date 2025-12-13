# Podsumowanie sesji planowania architektury UI - Dziennik Wędkarski MVP

## Decyzje projektowe

1. **Nawigacja główna**: Bottom navigation na mobile (3-4 sekcje: Dashboard/Wyprawy, Sprzęt, Profil), sidebar na desktop. FAB globalnie widoczny na mobile, prominent button na desktop.

2. **Aktywna wyprawa**: Persistent banner/floating card informujący o trwającej wyprawie z szybkim dostępem do dodania połowu, pogody i zamknięcia.

3. **Quick Start**: Bottom sheet na mobile, modal na desktop z 2 checkboxami (GPS, kopiowanie sprzętu).

4. **Timeline pogody**: Horizontal scrollable container z kartami godzinowymi, swipe na mobile, scroll buttons na desktop.

5. **Formularze połowów**: Progressive disclosure - wymagane pola widoczne, opcjonalne w rozwijalnej sekcji. React Hook Form + Zod.

6. **Zarządzanie stanem**: TanStack Query dla stanu serwerowego, React Context dla stanu lokalnego.

7. **Tryb offline**: Optimistic updates, kolejka retry, Service Worker (PWA), toast o statusie synchronizacji.

8. **Zarządzanie sprzętem**: Dedykowana sekcja "Mój sprzęt" z tabs/accordions, inline dodawanie w modalu przy multiselect.

9. **Obsługa błędów**: Mapowanie kodów API na polskie komunikaty, toast dla nieblokujących, inline dla formularzy, redirect na login przy 401.

10. **Dostępność (a11y)**: Shadcn/ui z ARIA, pełna nawigacja klawiaturą, aria-labels po polsku.

11. **Widok szczegółów wyprawy**: Jedna scrollowalna strona z wyraźnie oddzielonymi sekcjami (NIE zakładki).

12. **Upload zdjęć**: Wstępny resize client-side do 2000px (natywne Canvas API/OffscreenCanvas) + finalna kompresja i konwersja do WebP server-side (Sharp). Preview z progress barem.

13. **Integracja Google Maps**: @vis.gl/react-google-maps (oficjalna biblioteka Google), full-screen picker na mobile, modal na desktop, lazy-loading.

14. **Lista wypraw na dashboardzie**: Karty jedna pod drugą z: datą, ikoną pogody, lokalizacją, liczbą połowów. Infinite scroll na mobile, "Load more" na desktop.

15. **Stany ładowania**: Shadcn/ui Skeleton components zamiast spinnerów.

16. **Ręczne wprowadzanie pogody**: Banner z CTA "Dodaj ręcznie" gdy brak danych i wyprawa >24h.

17. **Ostrzeżenie o utracie pogody**: Confirmation dialog przy edycji daty wyprawy z danymi pogodowymi.

18. **Profil użytkownika**: Minimalistyczna sekcja z emailem i przyciskiem wylogowania.

19. **Empty states**: Ilustracje + zachęcające CTA prowadzące przez onboarding.

20. **Walidacja cross-field**: Zod .refine(), datetime picker z min/max na podstawie dat wyprawy.

21. **Mini Landing Page**: Minimalistyczny design - logo, hasło, ilustracja, przycisk "Zaloguj się".

22. **Multiselect sprzętu**: Combobox z chips, 3 sekcje (Wędki, Przynęty, Zanęty), quick-add button.

23. **Formularz połowu <90s**: Smart defaults, dropdowny z wyszukiwaniem, collapsible opcjonalne pola.

24. **Automatyczne pobieranie pogody**: Skeleton z tekstem, retry logic, banner przy błędzie.

25. **Edycja sprzętu**: Swipe-to-reveal na mobile, hover actions na desktop, modal do edycji.

26. **Jednostki metryczne**: Wyświetlanie jako kg/cm, input w g/mm z przeliczeniem.

27. **Responsywność formularzy**: Mobile-first single-column, 2 kolumny na desktop dla powiązanych pól.

28. **Podsumowanie wyprawy**: Stats grid na górze szczegółów (czas, połowy, waga, największa ryba, sprzęt).

29. **Sesja użytkownika**: Supabase Auth Helpers, auto-refresh tokenów, redirect przy wygaśnięciu.

30. **Retry logic**: TanStack Query z exponential backoff, loading state na przyciskach, local queue dla offline.

31. **Design System**: Material Design 3 (Material You) jako bazowy system projektowania.

---

## Dopasowane rekomendacje

1. **Architektura nawigacji**: Bottom navigation (mobile) + sidebar (desktop) z FAB do Quick Start - zgodne z MD3 Navigation patterns.

2. **State management**: TanStack Query jako jedyne źródło prawdy dla danych serwerowych, React Context dla UI state.

3. **Formularze**: React Hook Form + Zod dla spójności z walidacją backendową, progressive disclosure dla UX.

4. **Responsywność**: Mobile-first z Tailwind breakpoints, różne layouty dla mobile/desktop zgodne z MD3 adaptive design.

5. **Dostępność**: Shadcn/ui dostosowane do MD3 z natywnym ARIA, focus management, polskie aria-labels.

6. **Integracja API**: Lazy loading relacji przez parametr `include`, cache invalidation po mutacjach, optimistic updates.

7. **Offline-first mindset**: Service Worker, local queue, snapshoty nazw sprzętu self-contained.

8. **Obsługa błędów**: Mapowanie kodów błędów na polskie komunikaty, MD3 Snackbar/Toast, inline validation.

9. **Wydajność**: Skeleton screens, lazy-loaded komponenty (mapy), cursor-based pagination z infinite scroll.

10. **Material Design 3**: Dynamic color theming, tonal surfaces, updated elevation system, MD3 typography scale.

---

## Podsumowanie architektury UI

### Główne wymagania architektury UI

Aplikacja "Dziennik Wędkarski" to PWA z pełną responsywnością (RWD) dla mobile i desktop. Stack frontendowy to **Astro 5 + React 19 + Tailwind 4 + Shadcn/ui** z **Material Design 3** jako bazowym systemem projektowania. Język interfejsu: **polski**, jednostki: **metryczne (kg, cm)**.

---

## Material Design 3 - Wytyczne implementacji

### Kolorystyka (Color System)

| Token | Opis |
|-------|------|
| **Primary** | Domyślny dla MD 3 |
| **Secondary** | Domyślny dla MD 3  |
| **Tertiary** | Accent color dla wyróżnień |
| **Surface colors** | Tonal surfaces z MD3 (surface, surface-variant, surface-container) |
| **Dynamic color** | Opcjonalnie dla PWA z obsługą Material You |

### Typografia (MD3 Type Scale)

| Styl | Zastosowanie |
|------|--------------|
| **Display** | Dla dużych liczb (statystyki wyprawy) |
| **Headline** | Tytuły sekcji |
| **Title** | Nazwy wypraw, nagłówki kart |
| **Body** | Treść główna |
| **Label** | Etykiety formularzy, przyciski |

**Font**: Roboto lub system font stack dla wydajności

### Kształty (Shape System)

| Rozmiar | Wartość | Zastosowanie |
|---------|---------|--------------|
| Extra Small | 4dp | Chips, small buttons |
| Small | 8dp | Cards, text fields |
| Medium | 12dp | FAB, dialogs |
| Large | 16dp | Bottom sheets |
| Extra Large | 28dp | Full-screen dialogs |

### Elevation (Tonal Elevation)

- MD3 używa tonal surfaces zamiast cieni
- Level 0-5 z odpowiednimi surface tints
- Cienie tylko dla floating elements (FAB, dialogs)

### Komponenty MD3

- **Navigation Bar** (bottom) z 3-5 destinations
- **Navigation Rail** (desktop sidebar)
- **FAB** (Floating Action Button) - Extended FAB dla Quick Start
- **Cards** - Filled cards dla listy wypraw
- **Chips** - Filter chips, input chips dla sprzętu
- **Dialogs** - Full-screen na mobile, standard na desktop
- **Bottom Sheets** - Modal bottom sheets
- **Text Fields** - Filled lub outlined style
- **Snackbar** - Dla toastów i powiadomień

---

## Kluczowe widoki i ekrany

### 1. Mini Landing Page (niezalogowani)

- MD3 Surface z primary color accent
- Logo centrowane, headline typography
- Filled button "Zaloguj się" (primary)
- Ilustracja w stylu Material illustrations

### 2. Dashboard (ekran główny)

- **Navigation Bar** (bottom) z ikonami MD3
- **Top App Bar** z tytułem i avatar użytkownika
- Lista wypraw jako **MD3 Filled Cards** jedna pod drugą
- Każda karta: data (label), ikona pogody (MD3 icon), lokalizacja, badge z liczbą połowów
- **Extended FAB** "Nowa wyprawa" (bottom-right)
- **Banner** (MD3 component) dla aktywnej wyprawy

### 3. Szczegóły wyprawy

- **Top App Bar** z back navigation i menu
- Jedna scrollowalna strona z sekcjami:
  - **Podsumowanie**: MD3 Cards ze statystykami
  - **Połowy**: List items z MD3 styling
  - **Sprzęt**: Chips w sekcjach
  - **Pogoda**: Horizontal scroll z MD3 cards
- **FAB** "Dodaj połów" (sticky)

### 4. Formularz połowu

- **Full-screen dialog** na mobile
- **Standard dialog** na desktop
- MD3 Text Fields (filled style)
- Chips dla wyboru gatunku/sprzętu
- Collapsible section z MD3 expansion
- **Filled button** "Zapisz"

### 5. Zarządzanie sprzętem

- **Navigation Tabs** (MD3 Tabs) dla kategorii
- **List items** z trailing icons (edit, delete)
- **Swipe actions** zgodne z MD3 guidelines
- **Dialog** do edycji/dodawania

### 6. Profil użytkownika

- **Settings list** z MD3 list items
- **Outlined button** "Wyloguj" z confirmation dialog

---

## Przepływy użytkownika

### Quick Start Flow

1. Tap **Extended FAB** → **Modal Bottom Sheet** (mobile) / Dialog (desktop)
2. MD3 Checkboxes: "Użyj GPS", "Kopiuj sprzęt"
3. **Filled button** "Rozpocznij" → redirect do aktywnej wyprawy
4. **Snackbar** "Wyprawa rozpoczęta"

### Dodawanie połowu

1. Tap **FAB** w widoku wyprawy
2. **Full-screen dialog** z formularzem
3. MD3 Text Fields + Chips
4. **Filled button** "Zapisz" → optimistic update
5. **Snackbar** "Połów zapisany"

### Zamykanie wyprawy

1. **Banner** aktywnej wyprawy → "Zamknij"
2. **Date/Time picker** (MD3 style)
3. **Confirmation dialog** → status = closed
4. **Snackbar** "Wyprawa zakończona"

---

## Strategia integracji z API i zarządzania stanem

### State Management

| Warstwa | Technologia | Zastosowanie |
|---------|-------------|--------------|
| Stan serwerowy | TanStack Query | Trips, catches, equipment, fish-species, weather |
| Stan UI | React Context | Theme, aktywna wyprawa, modals |
| Persistencja | localStorage | Preferencje użytkownika |

### Cache Strategy

- Aggressive caching dla read-only danych
- Invalidation po mutacjach
- Optimistic updates z rollback

### API Integration

- Lazy loading relacji przez `include`
- Cursor-based pagination
- Retry: 3 próby, exponential backoff
- Error mapping → polskie komunikaty w Snackbar

### Offline Support

- Service Worker dla static assets
- Local queue dla pending mutations
- MD3 Banner dla statusu offline

---

## Responsywność (MD3 Adaptive Design)

| Element | Mobile (<600dp) | Desktop (≥840dp) |
|---------|-----------------|------------------|
| Nawigacja | Navigation Bar (bottom) | Navigation Rail (left) |
| Quick Start | Modal Bottom Sheet | Standard Dialog |
| Lista wypraw | Filled Cards, full-width | Filled Cards, max-width 600dp |
| Formularze | Full-screen Dialog | Standard Dialog (560dp) |
| Szczegóły wyprawy | Single column | Two-column layout |
| FAB | Standard FAB | Extended FAB |

---

## Dostępność (a11y)

- MD3 color contrast ratios (4.5:1 minimum)
- Focus indicators (MD3 state layer)
- Touch targets minimum 48dp
- Screen reader labels po polsku
- Reduced motion support
- High contrast mode support

---

## Bezpieczeństwo

- Supabase Auth z auto-refresh tokenów
- Redirect na login przy 401
- RLS na poziomie API
- Brak wrażliwych danych w localStorage

---

## Komponenty do implementacji

### Shadcn/ui + MD3 Customization

Dostosowanie Shadcn/ui do Material Design 3:

```css
/* Przykład MD3 tokens w Tailwind */
:root {
  --md-sys-color-primary: #1976d2;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-surface: #fefefe;
  --md-sys-color-surface-variant: #e7e0ec;
  /* ... */
}
```

### Custom komponenty

| Komponent | Opis |
|-----------|------|
| `WeatherTimeline` | MD3 horizontal scroll cards |
| `TripCard` | MD3 Filled Card |
| `CatchForm` | MD3 Dialog z Text Fields |
| `EquipmentChips` | MD3 Input Chips |
| `ActiveTripBanner` | MD3 Banner |
| `MapPicker` | Google Maps + MD3 controls |
| `NavigationBar` | MD3 Bottom Navigation |
| `NavigationRail` | MD3 Side Navigation |

---

## Nierozwiązane kwestie

1. **Szczegóły integracji AccuWeather API**: Nie określono dokładnego flow pobierania danych pogodowych - czy przez backend proxy czy bezpośrednio z frontendu. 
   - *Rekomendacja*: przez backend dla bezpieczeństwa klucza API.

2. **Strategia PWA**: Nie ustalono szczegółów manifestu, ikon, splash screens zgodnych z MD3.

3. **Lokalizacja GPS permissions**: Nie określono jak obsłużyć odmowę dostępu do GPS.
   - *Rekomendacja*: fallback na ręczny wybór lokalizacji z MD3 dialog.

4. **Limity storage dla zdjęć**: Nie ustalono maksymalnej liczby zdjęć ani strategii cleanup w Supabase Storage.

5. **Animacje i motion**: MD3 ma szczegółowe wytyczne motion - wymaga określenia które transitions i animations zaimplementować (easing, duration tokens).

6. **Dark mode**: MD3 ma pełne wsparcie dla dark theme - czy implementować w MVP?
   - *Rekomendacja*: tak, MD3 ułatwia to znacząco.

7. **Dynamic Color**: Czy implementować pełny Material You z dynamic color extraction?
   - *Rekomendacja*: nie w MVP, użyć statycznej palety.

8. **Testy użyteczności**: Cel <90s na wpis wymaga walidacji z rzeczywistymi użytkownikami.

9. **Ikony**: Wybór zestawu ikon - Material Symbols (recommended dla MD3) vs Lucide (obecny w Shadcn/ui).
   - *Rekomendacja*: Material Symbols dla spójności z MD3.

