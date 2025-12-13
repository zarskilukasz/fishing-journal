# Plan implementacji widoku Mini Landing Page

## 1. Przegląd

Mini Landing Page to publiczna strona powitalna dla niezalogowanych użytkowników aplikacji "Dziennik Wędkarski". Widok pełni funkcję pierwszego punktu kontaktu z aplikacją, prezentując logo, hasło promocyjne oraz przycisk umożliwiający logowanie. Strona jest minimalistyczna, zgodna z estetyką Material Design 3, responsywna (od 360px do 1920px) i wyłącznie w języku polskim. Zalogowani użytkownicy są automatycznie przekierowywani do dashboardu (`/app`).

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/` |
| **Plik strony** | `src/pages/index.astro` |
| **Dostęp** | Publiczny (tylko niezalogowani) |
| **Przekierowanie** | Zalogowani → `/app` |

## 3. Struktura komponentów

```
src/pages/index.astro (LandingPage)
└── src/layouts/LandingLayout.astro
    └── <main>
        └── HeroSection.astro
            ├── Logo.astro
            ├── Tagline.astro
            ├── LoginButton.tsx (React island)
            └── HeroIllustration.astro
```

### Diagram hierarchii:

```
LandingPage.astro
│
├─ [Server-side] Sprawdzenie sesji Supabase
│   └─ Jeśli zalogowany → redirect do /app
│
└─ LandingLayout.astro
    │
    └─ HeroSection.astro
        ├─ Logo.astro (statyczny)
        ├─ Tagline.astro (statyczny)
        ├─ LoginButton.tsx (interaktywny, React)
        └─ HeroIllustration.astro (statyczny/dekoracyjny)
```

## 4. Szczegóły komponentów

### 4.1 LandingPage (`src/pages/index.astro`)

- **Opis:** Główna strona Astro obsługująca routing `/`. Odpowiada za sprawdzenie stanu autentykacji i przekierowanie zalogowanych użytkowników.
- **Główne elementy:**
  - Frontmatter z logiką sprawdzania sesji Supabase
  - Import i renderowanie `LandingLayout`
  - Slot z `HeroSection`
- **Obsługiwane interakcje:** Brak (server-side only)
- **Obsługiwana walidacja:**
  - Sprawdzenie `context.locals.supabase.auth.getUser()` 
  - Jeśli użytkownik zalogowany → `Astro.redirect('/app')`
- **Typy:** Brak niestandardowych
- **Propsy:** Brak

### 4.2 LandingLayout (`src/layouts/LandingLayout.astro`)

- **Opis:** Dedykowany layout dla strony landing page. Zawiera podstawowe meta tagi, style globalne i strukturę HTML dostosowaną do strony powitalnej.
- **Główne elementy:**
  - `<!DOCTYPE html>`, `<html lang="pl">`
  - `<head>` z meta tagami (viewport, charset, title, description)
  - `<body>` ze slotem na zawartość
  - Import `global.css`
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** `LandingLayoutProps`
- **Propsy:**
  - `title?: string` - tytuł strony (domyślnie: "Dziennik Wędkarski")
  - `description?: string` - meta description

### 4.3 HeroSection (`src/components/landing/HeroSection.astro`)

- **Opis:** Główna sekcja powitalna zawierająca wszystkie elementy wizualne strony: logo, hasło, przycisk logowania i ilustrację.
- **Główne elementy:**
  - `<section>` jako główny kontener z ARIA landmark `role="main"`
  - Kontener flexbox/grid do centrowania zawartości
  - Komponenty dzieci: `Logo`, `Tagline`, `LoginButton`, `HeroIllustration`
- **Obsługiwane interakcje:** Brak (delegowane do dzieci)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:** Brak

### 4.4 Logo (`src/components/landing/Logo.astro`)

- **Opis:** Komponent wyświetlający logo/nazwę aplikacji. Centrowane, z odpowiednią typografią.
- **Główne elementy:**
  - `<div>` jako kontener
  - Ikona wędkarza lub ryby (Lucide lub SVG)
  - `<h1>` z nazwą "Dziennik Wędkarski"
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `class?: string` - dodatkowe klasy CSS

### 4.5 Tagline (`src/components/landing/Tagline.astro`)

- **Opis:** Hasło promocyjne zachęcające do korzystania z aplikacji.
- **Główne elementy:**
  - `<p>` z tekstem hasła
  - Typografia MD3 headline (large body lub subtitle)
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `text?: string` - tekst hasła (domyślnie: "Twój osobisty asystent wędkarski")
  - `class?: string` - dodatkowe klasy CSS

### 4.6 LoginButton (`src/components/landing/LoginButton.tsx`)

- **Opis:** Interaktywny przycisk React inicjujący proces logowania. Wykorzystuje Supabase Auth.
- **Główne elementy:**
  - Komponent `Button` z shadcn/ui (wariant `default`, rozmiar `lg`)
  - Tekst "Zaloguj się"
  - Opcjonalnie: ikona (LogIn z Lucide)
- **Obsługiwane interakcje:**
  - `onClick` → przekierowanie do strony logowania Supabase lub wywołanie OAuth
- **Obsługiwana walidacja:** Brak
- **Typy:**
  - `LoginButtonProps`
- **Propsy:**
  - `authUrl?: string` - URL do strony logowania (domyślnie: `/auth/login`)
  - `className?: string` - dodatkowe klasy CSS

### 4.7 HeroIllustration (`src/components/landing/HeroIllustration.astro`)

- **Opis:** Dekoracyjna ilustracja w stylu Material Design przedstawiająca motyw wędkarski.
- **Główne elementy:**
  - `<div>` jako kontener z `aria-hidden="true"`
  - Obraz SVG lub `<img>` z lazy loading
  - Opcjonalnie: animacja CSS (fade-in, subtle float)
- **Obsługiwane interakcje:** Brak (dekoracyjny)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `class?: string` - dodatkowe klasy CSS

## 5. Typy

### 5.1 LandingLayoutProps

```typescript
// src/layouts/LandingLayout.astro (frontmatter interface)
interface Props {
  title?: string;       // Tytuł strony, domyślnie "Dziennik Wędkarski"
  description?: string; // Meta description dla SEO
}
```

### 5.2 LoginButtonProps

```typescript
// src/components/landing/LoginButton.tsx
interface LoginButtonProps {
  authUrl?: string;    // URL do strony logowania, domyślnie "/auth/login"
  className?: string;  // Dodatkowe klasy Tailwind CSS
}
```

### 5.3 Typy Supabase Auth (z biblioteki)

```typescript
// Używane z @supabase/supabase-js
import type { User, Session } from "@supabase/supabase-js";

// Sprawdzenie sesji zwraca:
interface AuthResponse {
  data: {
    user: User | null;
  };
  error: Error | null;
}
```

## 6. Zarządzanie stanem

Widok Mini Landing Page jest w większości statyczny i nie wymaga złożonego zarządzania stanem.

### Stan po stronie serwera (Astro)

- **Sesja użytkownika:** Sprawdzana w frontmatter strony `index.astro` za pomocą `context.locals.supabase.auth.getUser()`
- **Logika przekierowania:** Jeśli użytkownik jest zalogowany, następuje `Astro.redirect('/app')`

### Stan po stronie klienta (React)

- **LoginButton:** 
  - Minimalny stan - tylko obsługa kliknięcia
  - Nie wymaga customowego hooka
  - Opcjonalnie: `isLoading` state podczas przekierowania

### Brak potrzeby customowych hooków

Ze względu na prostotę widoku, nie ma potrzeby tworzenia niestandardowych hooków React. Logika autentykacji jest obsługiwana po stronie serwera (Astro middleware + frontmatter).

## 7. Integracja API

### 7.1 Sprawdzenie autentykacji (Server-side)

**Endpoint:** Supabase Auth API (przez middleware)

**Żądanie:**
```typescript
const { data: { user }, error } = await Astro.locals.supabase.auth.getUser();
```

**Odpowiedź:**
```typescript
// Sukces - użytkownik zalogowany
{
  data: { user: User },
  error: null
}

// Brak sesji - użytkownik niezalogowany
{
  data: { user: null },
  error: null
}
```

**Akcja:**
- `user !== null` → `return Astro.redirect('/app')`
- `user === null` → renderowanie strony landing

### 7.2 Inicjacja logowania (Client-side)

**Metoda:** Przekierowanie do strony logowania

**Opcja A - Dedykowana strona logowania:**
```typescript
// LoginButton.tsx
const handleLogin = () => {
  window.location.href = '/auth/login';
};
```

**Opcja B - OAuth bezpośredni (np. Google):**
```typescript
// Wymaga dodatkowej konfiguracji i komponentu auth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/app`
  }
});
```

## 8. Interakcje użytkownika

| Interakcja | Element | Oczekiwany rezultat |
|------------|---------|---------------------|
| Wejście na stronę `/` (niezalogowany) | - | Wyświetlenie strony landing z logo, hasłem i przyciskiem |
| Wejście na stronę `/` (zalogowany) | - | Automatyczne przekierowanie do `/app` |
| Kliknięcie "Zaloguj się" | LoginButton | Przekierowanie do strony logowania `/auth/login` |
| Nawigacja klawiaturą | LoginButton | Focus widoczny (ring), aktywacja przez Enter/Space |
| Zmiana rozmiaru okna | Cała strona | Responsywne dostosowanie layoutu |

## 9. Warunki i walidacja

### 9.1 Warunki dostępu do strony

| Warunek | Komponent | Wpływ na interfejs |
|---------|-----------|-------------------|
| Użytkownik niezalogowany | LandingPage | Strona jest renderowana normalnie |
| Użytkownik zalogowany | LandingPage | Przekierowanie 302 do `/app` przed renderowaniem |

### 9.2 Walidacja sesji

```typescript
// src/pages/index.astro (frontmatter)
---
const { data: { user } } = await Astro.locals.supabase.auth.getUser();

if (user) {
  return Astro.redirect('/app');
}
---
```

### 9.3 Warunki dostępności

| Warunek | Komponent | Implementacja |
|---------|-----------|---------------|
| Kontrast kolorów | Wszystkie teksty | WCAG AA (minimum 4.5:1) |
| Focus widoczny | LoginButton | `focus-visible:ring-[3px]` (shadcn/ui) |
| Język strony | LandingLayout | `<html lang="pl">` |
| Landmark regions | HeroSection | `<main>` lub `role="main"` |
| Ukrycie dekoracji | HeroIllustration | `aria-hidden="true"` |

## 10. Obsługa błędów

### 10.1 Błąd sprawdzania sesji

**Scenariusz:** Supabase zwraca błąd podczas sprawdzania autentykacji.

**Obsługa:**
```typescript
const { data: { user }, error } = await Astro.locals.supabase.auth.getUser();

if (error) {
  console.error('Auth check failed:', error.message);
  // Graceful degradation - renderuj stronę landing
  // Użytkownik może spróbować się zalogować
}
```

### 10.2 Błąd przekierowania do logowania

**Scenariusz:** Strona `/auth/login` nie istnieje lub jest niedostępna.

**Obsługa:**
- Implementacja strony `/auth/login` jako część tego zadania lub osobnego
- Fallback: wyświetlenie komunikatu błędu w konsoli

### 10.3 Błąd ładowania zasobów

**Scenariusz:** Obrazy lub ilustracje nie ładują się.

**Obsługa:**
```astro
<!-- HeroIllustration.astro -->
<img 
  src="/images/fishing-illustration.svg" 
  alt=""
  aria-hidden="true"
  loading="lazy"
  onerror="this.style.display='none'"
/>
```

### 10.4 Brak JavaScript

**Scenariusz:** Użytkownik ma wyłączony JavaScript.

**Obsługa:**
```astro
<!-- Fallback dla LoginButton -->
<noscript>
  <a href="/auth/login" class="...button-styles...">
    Zaloguj się
  </a>
</noscript>
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów

```bash
mkdir -p src/components/landing
mkdir -p src/pages/auth
mkdir -p public/images
```

### Krok 2: Utworzenie LandingLayout

Plik: `src/layouts/LandingLayout.astro`

- Skopiować bazę z `Layout.astro`
- Zmienić `lang="en"` na `lang="pl"`
- Dodać odpowiednie meta tagi dla SEO
- Ustawić domyślny tytuł na "Dziennik Wędkarski"

### Krok 3: Utworzenie komponentów statycznych

**3.1 Logo.astro** (`src/components/landing/Logo.astro`)
- Dodać ikonę wędkarską (Fish z Lucide lub custom SVG)
- Stylizacja nagłówka H1
- Responsywne rozmiary (text-4xl do text-6xl)

**3.2 Tagline.astro** (`src/components/landing/Tagline.astro`)
- Tekst: "Twój osobisty asystent wędkarski"
- Subtelna typografia (text-lg do text-xl, muted foreground)

**3.3 HeroIllustration.astro** (`src/components/landing/HeroIllustration.astro`)
- Placeholder lub prosta ilustracja SVG
- `aria-hidden="true"`
- Animacja CSS (opcjonalnie)

### Krok 4: Utworzenie LoginButton (React)

Plik: `src/components/landing/LoginButton.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface LoginButtonProps {
  authUrl?: string;
  className?: string;
}

export function LoginButton({ 
  authUrl = "/auth/login", 
  className 
}: LoginButtonProps) {
  const handleClick = () => {
    window.location.href = authUrl;
  };

  return (
    <Button 
      size="lg" 
      onClick={handleClick}
      className={className}
    >
      <LogIn className="mr-2 h-5 w-5" />
      Zaloguj się
    </Button>
  );
}
```

### Krok 5: Utworzenie HeroSection

Plik: `src/components/landing/HeroSection.astro`

- Zaimportować wszystkie komponenty dzieci
- Utworzyć responsywny layout (flexbox/grid)
- Centrowanie zawartości (min-h-screen, flex items-center)

### Krok 6: Aktualizacja strony głównej

Plik: `src/pages/index.astro`

```astro
---
import LandingLayout from "@/layouts/LandingLayout.astro";
import HeroSection from "@/components/landing/HeroSection.astro";

// Sprawdzenie autentykacji
const { data: { user } } = await Astro.locals.supabase.auth.getUser();

if (user) {
  return Astro.redirect('/app');
}
---

<LandingLayout>
  <HeroSection />
</LandingLayout>
```

### Krok 7: Utworzenie strony logowania (placeholder)

Plik: `src/pages/auth/login.astro`

- Prosta strona z formularzem logowania
- Integracja z Supabase Auth UI lub custom form
- (Szczegóły w osobnym planie implementacji)

### Krok 8: Stylizacja i dopracowanie

- Dostosowanie kolorystyki do motywu wędkarskiego
- Dodanie gradientów i cieni zgodnych z MD3
- Implementacja animacji wejścia (fade-in, slide-up)
- Testy responsywności (360px, 768px, 1024px, 1920px)

### Krok 9: Testy dostępności

- Walidacja WCAG za pomocą axe DevTools
- Test nawigacji klawiaturą
- Test z czytnikiem ekranu (VoiceOver/NVDA)
- Sprawdzenie kontrastów kolorów

### Krok 10: Optymalizacja wydajności

- Optymalizacja obrazów (WebP/AVIF)
- Preload critical fonts
- Analiza Lighthouse
- Lazy loading dla ilustracji

