# Plan implementacji widoku App Layout

## 1. Przegląd

App Layout to główny komponent układu dla zalogowanych użytkowników aplikacji Dziennik Wędkarski. Stanowi szkielet nawigacyjny dla wszystkich stron w sekcji `/app/*`, zapewniając:

- **Top App Bar** - nagłówek z tytułem strony, przyciskiem powrotu i menu użytkownika
- **Bottom Navigation** (mobile <600dp) - dolna nawigacja z 3 głównymi sekcjami
- **Navigation Rail** (desktop ≥840dp) - boczna nawigacja z 3 głównymi sekcjami
- **FAB (Floating Action Button)** - przycisk szybkiego dostępu (Standard na mobile, Extended na desktop)
- **Content Area** - główny obszar treści z ograniczoną maksymalną szerokością

Layout jest w pełni responsywny (RWD) i zaprojektowany zgodnie z Material Design 3, zapewniając ergonomiczną obsługę zarówno na urządzeniach mobilnych, jak i komputerach.

## 2. Routing widoku

Layout będzie stosowany dla wszystkich stron w sekcji aplikacji:

| Ścieżka | Opis | Tytuł strony |
|---------|------|--------------|
| `/app` | Dashboard (lista wypraw) | "Wyprawy" |
| `/app/trips/[id]` | Szczegóły wyprawy | "Szczegóły wyprawy" |
| `/app/trips/[id]/edit` | Edycja wyprawy | "Edycja wyprawy" |
| `/app/equipment` | Zarządzanie sprzętem | "Sprzęt" |
| `/app/profile` | Profil użytkownika | "Profil" |

**Struktura plików stron Astro:**
```
src/pages/app/
├── index.astro          → /app (Dashboard)
├── trips/
│   └── [id]/
│       ├── index.astro  → /app/trips/[id]
│       └── edit.astro   → /app/trips/[id]/edit
├── equipment.astro      → /app/equipment
└── profile.astro        → /app/profile
```

## 3. Struktura komponentów

```
AppLayout.astro
├── TopAppBar (React)
│   ├── BackButton (warunkowy)
│   ├── PageTitle
│   └── UserMenu
├── NavigationRail (React, desktop only)
│   └── NavItem (×3)
├── main (Content Area)
│   ├── <slot /> (treść strony)
│   └── FAB (React, warunkowy)
└── BottomNavigation (React, mobile only)
    └── NavItem (×3)
```

### Hierarchia komponentów React:

```
AppLayoutClient.tsx (wrapper React dla interaktywnych elementów)
├── TopAppBar.tsx
│   ├── BackButton.tsx
│   ├── PageTitle.tsx
│   └── UserMenu.tsx
├── NavigationRail.tsx
│   └── NavItem.tsx (×3)
├── ContentContainer.tsx
│   └── FAB.tsx
└── BottomNavigation.tsx
    └── NavItem.tsx (×3)
```

## 4. Szczegóły komponentów

### 4.1 AppLayout.astro

- **Opis:** Główny layout Astro dla sekcji `/app/*`. Sprawdza autentykację użytkownika, przekierowuje niezalogowanych na stronę logowania, i renderuje strukturę nawigacji.
- **Główne elementy:**
  - Wrapper HTML z klasami layoutu
  - Sprawdzenie sesji użytkownika (server-side)
  - Przekazanie danych do komponentu React `AppLayoutClient`
  - `<slot />` dla treści strony
- **Obsługiwane interakcje:** Brak (statyczny wrapper)
- **Obsługiwana walidacja:**
  - Sprawdzenie czy użytkownik jest zalogowany (redirect na `/auth/login` jeśli nie)
- **Typy:**
  - `AppLayoutProps` (title, showBackButton, showFAB, fabLabel)
  - `SessionUserDto` (z types.ts)
- **Propsy:**
  ```typescript
  interface Props {
    title: string;
    showBackButton?: boolean;
    showFAB?: boolean;
    fabLabel?: string;
    fabHref?: string;
  }
  ```

### 4.2 AppLayoutClient.tsx

- **Opis:** Główny komponent React opakowujący wszystkie interaktywne elementy layoutu. Zarządza stanem responsywności i aktywną ścieżką nawigacji.
- **Główne elementy:**
  - `TopAppBar` - nagłówek
  - `NavigationRail` - boczna nawigacja (desktop)
  - `ContentContainer` - wrapper dla treści
  - `BottomNavigation` - dolna nawigacja (mobile)
- **Obsługiwane interakcje:**
  - Wykrywanie breakpointów (resize)
  - Zmiana aktywnej sekcji nawigacji
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `NavigationSection` (enum/union)
  - `AppLayoutClientProps`
- **Propsy:**
  ```typescript
  interface AppLayoutClientProps {
    title: string;
    currentPath: string;
    showBackButton: boolean;
    showFAB: boolean;
    fabLabel?: string;
    fabHref?: string;
    user: { id: string; email: string };
    children: React.ReactNode;
  }
  ```

### 4.3 TopAppBar.tsx

- **Opis:** Nagłówek aplikacji zgodny z Material Design 3. Wyświetla tytuł strony, opcjonalny przycisk powrotu i menu użytkownika.
- **Główne elementy:**
  - `<header>` z rolą "banner"
  - `BackButton` (warunkowy) - przycisk powrotu
  - `PageTitle` - tytuł strony (h1)
  - `UserMenu` - avatar/menu użytkownika
- **Obsługiwane interakcje:**
  - Kliknięcie BackButton → `window.history.back()` lub nawigacja do `/app`
  - Kliknięcie UserMenu → otwarcie dropdown menu
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `TopAppBarProps`
- **Propsy:**
  ```typescript
  interface TopAppBarProps {
    title: string;
    showBackButton: boolean;
    user: { email: string };
    isMobile: boolean;
  }
  ```

### 4.4 BackButton.tsx

- **Opis:** Przycisk powrotu w nagłówku. Wyświetlany na stronach zagnieżdżonych (poziom 2+).
- **Główne elementy:**
  - `<button>` z ikoną strzałki w lewo (Lucide: `ArrowLeft` lub `ChevronLeft`)
- **Obsługiwane interakcje:**
  - Kliknięcie → nawigacja wstecz
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak specjalnych typów
- **Propsy:**
  ```typescript
  interface BackButtonProps {
    onClick?: () => void;
    ariaLabel?: string;
  }
  ```

### 4.5 PageTitle.tsx

- **Opis:** Tytuł strony wyświetlany w nagłówku.
- **Główne elementy:**
  - `<h1>` z odpowiednią typografią MD3
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  ```typescript
  interface PageTitleProps {
    children: string;
  }
  ```

### 4.6 UserMenu.tsx

- **Opis:** Menu użytkownika w nagłówku. Na desktop wyświetla avatar z dropdownem, na mobile może być ukryte lub uproszczone.
- **Główne elementy:**
  - Avatar użytkownika (inicjały z email)
  - Dropdown menu z opcją wylogowania
  - Shadcn/ui `DropdownMenu`
- **Obsługiwane interakcje:**
  - Kliknięcie avatar → toggle dropdown
  - Kliknięcie "Wyloguj" → wywołanie Supabase signOut
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `UserMenuProps`
- **Propsy:**
  ```typescript
  interface UserMenuProps {
    email: string;
    onLogout: () => void;
  }
  ```

### 4.7 NavigationRail.tsx

- **Opis:** Boczna nawigacja dla wersji desktop (≥840dp). Wyświetla 3 główne sekcje jako pionowy rail zgodny z MD3.
- **Główne elementy:**
  - `<nav>` z rolą "navigation" i aria-label
  - 3 × `NavItem` (Wyprawy, Sprzęt, Profil)
  - Ikony z Lucide React
- **Obsługiwane interakcje:**
  - Kliknięcie NavItem → nawigacja do sekcji
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `NavigationRailProps`
  - `NavItemData`
- **Propsy:**
  ```typescript
  interface NavigationRailProps {
    activeSection: NavigationSection;
    onNavigate: (section: NavigationSection) => void;
  }
  ```

### 4.8 BottomNavigation.tsx

- **Opis:** Dolna nawigacja dla wersji mobile (<600dp). Wyświetla 3 główne sekcje jako horizontal bar zgodny z MD3.
- **Główne elementy:**
  - `<nav>` z rolą "navigation" i aria-label
  - 3 × `NavItem` (Wyprawy, Sprzęt, Profil)
  - Ikony z Lucide React + etykiety tekstowe
- **Obsługiwane interakcje:**
  - Kliknięcie NavItem → nawigacja do sekcji
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `BottomNavigationProps`
- **Propsy:**
  ```typescript
  interface BottomNavigationProps {
    activeSection: NavigationSection;
    onNavigate: (section: NavigationSection) => void;
  }
  ```

### 4.9 NavItem.tsx

- **Opis:** Pojedynczy element nawigacji. Używany zarówno w NavigationRail, jak i BottomNavigation.
- **Główne elementy:**
  - `<a>` lub `<button>` z ikoną i etykietą
  - Stan aktywny (selected) z MD3 state layer
- **Obsługiwane interakcje:**
  - Kliknięcie → nawigacja do sekcji
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `NavItemProps`
- **Propsy:**
  ```typescript
  interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    href: string;
    isActive: boolean;
    variant: 'rail' | 'bottom';
  }
  ```

### 4.10 FAB.tsx

- **Opis:** Floating Action Button dla szybkiego dostępu do głównej akcji (np. "Nowa wyprawa"). Standard FAB na mobile, Extended FAB na desktop.
- **Główne elementy:**
  - `<a>` lub `<button>` z ikoną `Plus` (Lucide)
  - Etykieta tekstowa (tylko desktop/extended)
  - Pozycja fixed, bottom-right
- **Obsługiwane interakcje:**
  - Kliknięcie → nawigacja do akcji (np. Quick Start modal)
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `FABProps`
- **Propsy:**
  ```typescript
  interface FABProps {
    label: string;
    href?: string;
    onClick?: () => void;
    isExtended: boolean;
  }
  ```

### 4.11 ContentContainer.tsx

- **Opis:** Wrapper dla głównej treści strony. Zapewnia maksymalną szerokość (840dp) i odpowiednie marginesy/paddingi.
- **Główne elementy:**
  - `<main>` z rolą "main"
  - Klasy Tailwind dla max-width i responsywnych paddingów
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  ```typescript
  interface ContentContainerProps {
    children: React.ReactNode;
    className?: string;
  }
  ```

## 5. Typy

### 5.1 NavigationSection (union type)

```typescript
type NavigationSection = 'trips' | 'equipment' | 'profile';
```

### 5.2 NavItemData (typ pomocniczy)

```typescript
interface NavItemData {
  section: NavigationSection;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}
```

### 5.3 NavigationConfig (stała konfiguracyjna)

```typescript
const NAVIGATION_ITEMS: NavItemData[] = [
  {
    section: 'trips',
    label: 'Wyprawy',
    href: '/app',
    icon: Home,
  },
  {
    section: 'equipment',
    label: 'Sprzęt',
    href: '/app/equipment',
    icon: Package,
  },
  {
    section: 'profile',
    label: 'Profil',
    href: '/app/profile',
    icon: User,
  },
];
```

### 5.4 BreakpointConfig

```typescript
const BREAKPOINTS = {
  mobile: 600,  // <600dp - Bottom Navigation
  tablet: 840,  // 600-839dp - opcjonalnie
  desktop: 840, // ≥840dp - Navigation Rail
} as const;
```

### 5.5 AppLayoutProps (dla komponentu Astro)

```typescript
interface AppLayoutProps {
  title: string;
  showBackButton?: boolean;
  showFAB?: boolean;
  fabLabel?: string;
  fabHref?: string;
}
```

### 5.6 UserSessionData (uproszczony typ sesji)

```typescript
interface UserSessionData {
  id: string;
  email: string;
}
```

## 6. Zarządzanie stanem

### 6.1 Hook useBreakpoint

Custom hook do wykrywania aktualnego breakpointu (mobile vs desktop).

```typescript
function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < BREAKPOINTS.mobile);
      setIsDesktop(width >= BREAKPOINTS.desktop);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return { isMobile, isDesktop };
}
```

### 6.2 Hook useActiveSection

Hook do określania aktywnej sekcji nawigacji na podstawie aktualnej ścieżki URL.

```typescript
function useActiveSection(currentPath: string): NavigationSection {
  if (currentPath.startsWith('/app/equipment')) return 'equipment';
  if (currentPath.startsWith('/app/profile')) return 'profile';
  return 'trips'; // domyślnie /app i /app/trips/*
}
```

### 6.3 Stan w AppLayoutClient

```typescript
// Główny stan komponentu
const { isMobile, isDesktop } = useBreakpoint();
const activeSection = useActiveSection(currentPath);

// Stan dla UserMenu
const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
```

### 6.4 Brak globalnego state management

Layout nie wymaga globalnego zarządzania stanem (Redux, Zustand). Wszystkie stany są lokalne i przekazywane przez props. Dane użytkownika są pobierane server-side w komponencie Astro.

## 7. Integracja API

### 7.1 Autentykacja (server-side w Astro)

Layout wymaga sprawdzenia sesji użytkownika przed renderowaniem:

```typescript
// W AppLayout.astro
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect('/auth/login');
}

const userSession: UserSessionData = {
  id: user.id,
  email: user.email ?? '',
};
```

### 7.2 Wylogowanie

Akcja wylogowania wywoływana z `UserMenu`:

```typescript
const handleLogout = async () => {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (response.ok) {
    window.location.href = '/';
  }
};
```

Alternatywnie można użyć bezpośrednio Supabase client-side:

```typescript
// Client-side logout (wymaga supabase client)
const { error } = await supabase.auth.signOut();
if (!error) {
  window.location.href = '/';
}
```

### 7.3 Typy żądań i odpowiedzi

| Endpoint | Metoda | Request | Response |
|----------|--------|---------|----------|
| Supabase `auth.getUser()` | - | - | `{ data: { user: User }, error }` |
| Supabase `auth.signOut()` | - | - | `{ error }` |
| `/api/v1/auth/logout` (jeśli custom) | POST | - | `200 OK` |

## 8. Interakcje użytkownika

### 8.1 Nawigacja główna

| Akcja | Komponent | Rezultat |
|-------|-----------|----------|
| Kliknięcie "Wyprawy" | NavItem | Nawigacja do `/app` |
| Kliknięcie "Sprzęt" | NavItem | Nawigacja do `/app/equipment` |
| Kliknięcie "Profil" | NavItem | Nawigacja do `/app/profile` |

### 8.2 Top App Bar

| Akcja | Komponent | Rezultat |
|-------|-----------|----------|
| Kliknięcie BackButton | BackButton | `history.back()` lub nawigacja do `/app` |
| Kliknięcie Avatar | UserMenu | Otwarcie dropdown menu |
| Kliknięcie "Wyloguj" | UserMenu | Wylogowanie i redirect do `/` |

### 8.3 FAB

| Akcja | Komponent | Rezultat |
|-------|-----------|----------|
| Kliknięcie FAB | FAB | Nawigacja do `fabHref` lub wywołanie `onClick` |

### 8.4 Responsywność

| Zdarzenie | Rezultat |
|-----------|----------|
| Resize okna <600dp | Wyświetlenie BottomNavigation, ukrycie NavigationRail |
| Resize okna ≥840dp | Wyświetlenie NavigationRail, ukrycie BottomNavigation |
| Resize okna (FAB) | Zmiana z Standard FAB na Extended FAB |

## 9. Warunki i walidacja

### 9.1 Walidacja autentykacji

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| Brak sesji użytkownika | AppLayout.astro | Redirect na `/auth/login` |
| Sesja wygasła | AppLayout.astro | Redirect na `/auth/login` |
| Błąd Supabase | AppLayout.astro | Redirect na `/auth/login` |

### 9.2 Warunki wyświetlania elementów

| Warunek | Element | Wpływ na UI |
|---------|---------|-------------|
| `showBackButton === true` | BackButton | Wyświetlenie przycisku |
| `showFAB === true` | FAB | Wyświetlenie FAB |
| `isMobile === true` | BottomNavigation | Wyświetlenie dolnej nawigacji |
| `isDesktop === true` | NavigationRail | Wyświetlenie bocznej nawigacji |
| `isDesktop === true` | Extended FAB | FAB z etykietą tekstową |

### 9.3 Warunki aktywności nawigacji

| Ścieżka | Aktywna sekcja |
|---------|----------------|
| `/app` | trips |
| `/app/trips/*` | trips |
| `/app/equipment` | equipment |
| `/app/equipment?tab=*` | equipment |
| `/app/profile` | profile |

## 10. Obsługa błędów

### 10.1 Błędy autentykacji

| Scenariusz | Obsługa |
|------------|---------|
| Sesja wygasła | Server-side redirect na `/auth/login` |
| Błąd Supabase | Server-side redirect na `/auth/login` z logowaniem błędu |
| Nieprawidłowy token | Automatyczne odświeżenie przez Supabase SSR lub redirect |

### 10.2 Błędy wylogowania

| Scenariusz | Obsługa |
|------------|---------|
| Błąd sieci | Wyświetlenie toast z komunikatem "Błąd wylogowania. Spróbuj ponownie." |
| Błąd Supabase | Wyświetlenie toast z komunikatem błędu, możliwość ponowienia |

### 10.3 Błędy nawigacji

| Scenariusz | Obsługa |
|------------|---------|
| Nieistniejąca strona | Astro 404 page |
| Błąd JavaScript | Error boundary z komunikatem i opcją odświeżenia |

### 10.4 Graceful degradation

- Jeśli JavaScript nie zadziała, nawigacja powinna działać jako zwykłe linki `<a>`
- Układ powinien być używalny bez FAB (fallback na zwykłe linki w nawigacji)

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury folderów

1. Utwórz folder `src/pages/app/` dla stron sekcji aplikacji
2. Utwórz folder `src/components/layout/` dla komponentów layoutu
3. Utwórz folder `src/components/hooks/` dla custom hooków

### Krok 2: Instalacja brakujących komponentów Shadcn/ui

```bash
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
```

### Krok 3: Implementacja custom hooków

1. Utwórz `src/components/hooks/useBreakpoint.ts`
2. Utwórz `src/components/hooks/useActiveSection.ts`

### Krok 4: Implementacja typów i stałych

1. Utwórz `src/components/layout/navigation.types.ts` z typami nawigacji
2. Zdefiniuj `NAVIGATION_ITEMS` i `BREAKPOINTS`

### Krok 5: Implementacja bazowych komponentów nawigacji

1. Implementuj `NavItem.tsx` - pojedynczy element nawigacji
2. Implementuj `BackButton.tsx` - przycisk powrotu
3. Implementuj `PageTitle.tsx` - tytuł strony

### Krok 6: Implementacja komponentów nawigacyjnych

1. Implementuj `BottomNavigation.tsx` (mobile)
2. Implementuj `NavigationRail.tsx` (desktop)
3. Implementuj `TopAppBar.tsx`
4. Implementuj `UserMenu.tsx`

### Krok 7: Implementacja FAB

1. Implementuj `FAB.tsx` z wariantami Standard/Extended

### Krok 8: Implementacja ContentContainer

1. Implementuj `ContentContainer.tsx` z max-width i paddingami

### Krok 9: Implementacja głównego komponentu React

1. Implementuj `AppLayoutClient.tsx` łączący wszystkie komponenty

### Krok 10: Implementacja layoutu Astro

1. Utwórz `src/layouts/AppLayout.astro`
2. Dodaj sprawdzenie autentykacji server-side
3. Zintegruj `AppLayoutClient.tsx`

### Krok 11: Utworzenie stron placeholder

1. Utwórz `src/pages/app/index.astro` (Dashboard)
2. Utwórz `src/pages/app/equipment.astro`
3. Utwórz `src/pages/app/profile.astro`
4. Utwórz `src/pages/app/trips/[id]/index.astro`

### Krok 12: Stylowanie zgodne z MD3

1. Dodaj zmienne CSS dla MD3 (state layers, elevation)
2. Skonfiguruj kolory dla nawigacji aktywnej/nieaktywnej
3. Dodaj animacje przejść (transitions)

### Krok 13: Testowanie responsywności

1. Przetestuj na 360px (mobile)
2. Przetestuj na 840px (tablet/desktop boundary)
3. Przetestuj na 1920px (desktop)

### Krok 14: Testowanie dostępności

1. Sprawdź nawigację klawiaturą (Tab, Enter, Escape)
2. Sprawdź aria-labels po polsku
3. Sprawdź kontrast kolorów (4.5:1)
4. Sprawdź touch targets (48dp minimum)

### Krok 15: Optymalizacja wydajności

1. Zastosuj `React.memo()` dla NavItem
2. Zastosuj `useCallback` dla event handlerów
3. Rozważ lazy loading dla UserMenu dropdown

