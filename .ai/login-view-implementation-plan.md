# Plan implementacji widoku Logowania

## 1. Przegląd

Strona logowania to publiczny widok dostępny dla niezalogowanych użytkowników aplikacji "Dziennik Wędkarski". Głównym celem jest uwierzytelnienie użytkownika za pomocą formularza email/hasło lub opcjonalnie przez social login (OAuth). Widok jest minimalistyczny, zgodny z estetyką Material Design 3, responsywny (od 360px do 1920px) i wyłącznie w języku polskim.

Po udanym logowaniu użytkownik jest przekierowywany do dashboardu (`/app`) lub na stronę, z której przyszedł. Zalogowani użytkownicy próbujący uzyskać dostęp do strony logowania są automatycznie przekierowywani do dashboardu.

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/auth/login` |
| **Plik strony** | `src/pages/auth/login.astro` |
| **Dostęp** | Publiczny (tylko niezalogowani) |
| **Przekierowanie przy sukcesie** | `/app` (lub `redirectTo` z query params) |
| **Przekierowanie zalogowanych** | `/app` |

## 3. Struktura komponentów

```
src/pages/auth/login.astro (LoginPage)
└── src/layouts/AuthLayout.astro
    └── <main>
        └── LoginCard.tsx (React island, client:load)
            ├── Logo (lub link do /)
            ├── LoginFormHeader
            ├── LoginForm
            │   ├── EmailInput (shadcn/ui Input)
            │   ├── PasswordInput (shadcn/ui Input)
            │   ├── ErrorMessage (inline)
            │   └── SubmitButton (shadcn/ui Button)
            ├── FormDivider ("lub")
            ├── SocialLoginButtons
            │   └── SocialLoginButton (dla każdego providera)
            └── RegistrationLink (placeholder)
```

### Diagram hierarchii:

```
LoginPage.astro
│
├─ [Server-side] Sprawdzenie sesji Supabase
│   └─ Jeśli zalogowany → redirect do /app
│
└─ AuthLayout.astro
    │
    └─ LoginCard.tsx (React client:load)
        ├─ Logo/BackLink (nawigacja do /)
        ├─ LoginFormHeader (tytuł formularza)
        ├─ LoginForm (formularz React Hook Form + Zod)
        │   ├─ EmailInput (controlled, walidacja Zod)
        │   ├─ PasswordInput (controlled, walidacja Zod)
        │   ├─ ErrorMessage (błędy walidacji + API)
        │   └─ SubmitButton (z loading state)
        ├─ FormDivider (separator "lub")
        ├─ SocialLoginButtons (OAuth providers)
        └─ RegistrationLink (placeholder - nieaktywny w MVP)
```

## 4. Szczegóły komponentów

### 4.1 LoginPage (`src/pages/auth/login.astro`)

- **Opis:** Strona Astro obsługująca routing `/auth/login`. Odpowiada za sprawdzenie stanu autentykacji i przekierowanie zalogowanych użytkowników. Renderuje layout autentykacji z komponentem React LoginCard.
- **Główne elementy:**
  - Frontmatter z logiką sprawdzania sesji Supabase
  - Pobranie `redirectTo` z query params
  - Import i renderowanie `AuthLayout`
  - Slot z `LoginCard` jako React island
- **Obsługiwane interakcje:** Brak (server-side only)
- **Obsługiwana walidacja:**
  - Sprawdzenie `Astro.locals.supabase.auth.getUser()`
  - Jeśli użytkownik zalogowany → `Astro.redirect('/app')`
- **Typy:** Brak niestandardowych
- **Propsy:** Brak

### 4.2 AuthLayout (`src/layouts/AuthLayout.astro`)

- **Opis:** Dedykowany layout dla stron autentykacji (login, ewentualnie w przyszłości register, reset password). Zawiera podstawowe meta tagi, style globalne i strukturę HTML dostosowaną do formularzy autentykacji.
- **Główne elementy:**
  - `<!DOCTYPE html>`, `<html lang="pl">`
  - `<head>` z meta tagami (viewport, charset, title, description, noindex)
  - `<body>` z centrowanym kontenerem
  - Import `global.css`
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** `AuthLayoutProps`
- **Propsy:**
  - `title?: string` - tytuł strony (domyślnie: "Zaloguj się | Dziennik Wędkarski")

### 4.3 LoginCard (`src/components/auth/LoginCard.tsx`)

- **Opis:** Główny komponent React zawierający całą logikę formularza logowania. Używa React Hook Form do zarządzania stanem formularza i Zod do walidacji.
- **Główne elementy:**
  - `<div>` jako Card container (shadcn/ui Card lub custom)
  - Logo/BackLink do strony głównej
  - `LoginFormHeader` z tytułem
  - `LoginForm` z polami i przyciskiem
  - `FormDivider` separator
  - `SocialLoginButtons` przyciski OAuth
  - `RegistrationLink` placeholder
- **Obsługiwane interakcje:**
  - Submit formularza
  - Kliknięcie social login buttons
  - Nawigacja do strony głównej
- **Obsługiwana walidacja:** Delegowana do LoginForm
- **Typy:** `LoginCardProps`
- **Propsy:**
  - `redirectTo?: string` - URL do przekierowania po sukcesie (domyślnie: `/app`)
  - `supabaseUrl: string` - URL Supabase (z env)
  - `supabaseAnonKey: string` - Klucz publiczny Supabase (z env)

### 4.4 LoginForm (`src/components/auth/LoginForm.tsx`)

- **Opis:** Formularz logowania z polami email i hasło. Wykorzystuje React Hook Form z resolverem Zod. Obsługuje stany ładowania i błędów.
- **Główne elementy:**
  - `<form>` z `onSubmit` handler
  - `EmailInput` - pole email z walidacją
  - `PasswordInput` - pole hasło z walidacją
  - `ErrorMessage` - komunikat błędu API
  - `SubmitButton` - przycisk submit z loading state
- **Obsługiwane interakcje:**
  - `onChange` dla pól formularza
  - `onSubmit` - walidacja + wywołanie Supabase Auth
  - `onBlur` - walidacja pola przy blur
- **Obsługiwana walidacja:**
  - Email: wymagany, format email
  - Hasło: wymagane, minimum 6 znaków
- **Typy:** `LoginFormProps`, `LoginFormData`, `LoginFormErrors`
- **Propsy:**
  - `onSubmit: (data: LoginFormData) => Promise<void>` - callback po submit
  - `isSubmitting: boolean` - stan ładowania
  - `generalError?: string` - błąd ogólny z API

### 4.5 SocialLoginButtons (`src/components/auth/SocialLoginButtons.tsx`)

- **Opis:** Kontener z przyciskami do logowania przez providery OAuth (Google, GitHub itp.). W MVP może być ukryty lub pokazywać tylko dostępne providery.
- **Główne elementy:**
  - `<div>` jako kontener przycisków
  - Pojedyncze przyciski dla każdego providera (Google, GitHub)
  - Ikony providerów
- **Obsługiwane interakcje:**
  - `onClick` dla każdego providera → wywołanie `supabase.auth.signInWithOAuth`
- **Obsługiwana walidacja:** Brak
- **Typy:** `SocialLoginButtonsProps`, `OAuthProvider`
- **Propsy:**
  - `providers?: OAuthProvider[]` - lista dostępnych providerów
  - `onLogin: (provider: OAuthProvider) => Promise<void>` - callback logowania
  - `isLoading?: boolean` - stan ładowania
  - `redirectTo?: string` - URL przekierowania po OAuth

### 4.6 FormDivider (`src/components/auth/FormDivider.tsx`)

- **Opis:** Wizualny separator między formularzem email/hasło a przyciskami social login. Wyświetla tekst "lub" między liniami.
- **Główne elementy:**
  - `<div>` z flexbox
  - Dwie linie (`<hr>` lub `<div>` z border)
  - `<span>` z tekstem "lub"
- **Obsługiwane interakcje:** Brak (dekoracyjny)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `text?: string` - tekst separatora (domyślnie: "lub")
  - `className?: string` - dodatkowe klasy CSS

### 4.7 RegistrationLink (`src/components/auth/RegistrationLink.tsx`)

- **Opis:** Link do strony rejestracji. W MVP jest nieaktywny (placeholder) zgodnie z wymaganiami PRD.
- **Główne elementy:**
  - `<p>` z tekstem "Nie masz konta?"
  - `<span>` lub nieaktywny `<a>` z tekstem "Zarejestruj się"
- **Obsługiwane interakcje:** Brak w MVP (placeholder)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `className?: string` - dodatkowe klasy CSS

## 5. Typy

### 5.1 LoginFormData (DTO formularza)

```typescript
// src/components/auth/types.ts
interface LoginFormData {
  email: string;
  password: string;
}
```

### 5.2 LoginFormErrors

```typescript
// src/components/auth/types.ts
interface LoginFormErrors {
  email?: string;
  password?: string;
}
```

### 5.3 LoginCardProps

```typescript
// src/components/auth/LoginCard.tsx
interface LoginCardProps {
  redirectTo?: string;        // URL przekierowania po sukcesie, domyślnie "/app"
  supabaseUrl: string;        // URL Supabase z env
  supabaseAnonKey: string;    // Klucz publiczny Supabase z env
}
```

### 5.4 LoginFormProps

```typescript
// src/components/auth/LoginForm.tsx
interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isSubmitting: boolean;
  generalError?: string | null;
}
```

### 5.5 SocialLoginButtonsProps

```typescript
// src/components/auth/SocialLoginButtons.tsx
type OAuthProvider = "google" | "github" | "facebook";

interface SocialLoginButtonsProps {
  providers?: OAuthProvider[];
  onLogin: (provider: OAuthProvider) => Promise<void>;
  isLoading?: boolean;
  redirectTo?: string;
}
```

### 5.6 AuthLayoutProps

```typescript
// src/layouts/AuthLayout.astro (frontmatter interface)
interface Props {
  title?: string; // Tytuł strony, domyślnie "Zaloguj się | Dziennik Wędkarski"
}
```

### 5.7 Schemat walidacji Zod

```typescript
// src/components/auth/schemas/login.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format adresu email"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .min(6, "Hasło musi mieć minimum 6 znaków"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

## 6. Zarządzanie stanem

### Stan po stronie serwera (Astro)

- **Sesja użytkownika:** Sprawdzana w frontmatter strony `login.astro` za pomocą `Astro.locals.supabase.auth.getUser()`
- **Query params:** Parsowanie `redirectTo` z URL do przekazania do komponentu React
- **Logika przekierowania:** Jeśli użytkownik jest zalogowany, następuje `Astro.redirect('/app')`

### Stan po stronie klienta (React)

LoginCard zarządza stanem za pomocą `useState` i React Hook Form:

```typescript
// Stan w LoginCard
const [isSubmitting, setIsSubmitting] = useState(false);
const [generalError, setGeneralError] = useState<string | null>(null);
const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

// React Hook Form
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
    email: "",
    password: "",
  },
});
```

### Customowy hook: useAuth (opcjonalny)

Dla lepszej organizacji kodu można wyodrębnić logikę autentykacji do hooka:

```typescript
// src/components/auth/hooks/useAuth.ts
interface UseAuthOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo?: string;
}

interface UseAuthReturn {
  signInWithEmail: (data: LoginFormData) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  isSubmitting: boolean;
  oauthLoading: OAuthProvider | null;
  error: string | null;
}

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  // Implementacja logiki autentykacji
  // Zwraca metody i stany do użycia w komponencie
}
```

## 7. Integracja API

### 7.0 Architektura autoryzacji - Supabase SDK

Widok logowania używa **Supabase SDK** jako jedynego mechanizmu autoryzacji (bez własnych endpointów API):

**Dlaczego Supabase SDK?**
- Wbudowana obsługa sesji, tokenów JWT i automatyczny refresh
- Bezpieczne zarządzanie cookies przez `@supabase/ssr`
- Obsługa OAuth providers (Google, GitHub, etc.)
- Gotowe metody: `signInWithPassword`, `signInWithOAuth`, `signOut`
- Automatyczna walidacja tokenów

**Architektura flow logowania:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Server-side Check (Astro)                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ login.astro frontmatter:                                            │ │
│ │ - supabase.auth.getUser() - sprawdź czy zalogowany                  │ │
│ │ - Jeśli tak → redirect do /app                                      │ │
│ │ - Jeśli nie → renderuj formularz                                    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Client-side Login (React)                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ LoginCard component:                                                │ │
│ │ - createBrowserClient() - tworzy klienta Supabase                   │ │
│ │ - signInWithPassword({email, password}) - logowanie email/hasło     │ │
│ │ - signInWithOAuth({provider}) - logowanie przez OAuth               │ │
│ │                                                                     │ │
│ │ Po sukcesie:                                                        │ │
│ │ - Supabase automatycznie ustawia cookies z tokenami                 │ │
│ │ - window.location.href = redirectTo || '/app'                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Subsequent Requests                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Middleware (src/middleware/index.ts):                               │ │
│ │ - Automatycznie odczytuje tokeny z cookies                          │ │
│ │ - Weryfikuje sesję dla /app/* routes                                │ │
│ │ - Przekazuje supabase client do Astro.locals                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Sprawdzenie autentykacji (Server-side)

**Lokalizacja:** `src/pages/auth/login.astro` (frontmatter)

```typescript
import { createServerClient } from '@supabase/ssr';

// Klient Supabase tworzony przez middleware i dostępny w Astro.locals
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

// Zalogowani użytkownicy są przekierowywani do dashboardu
if (user) {
  return Astro.redirect('/app');
}

// Parsowanie redirectTo z query params
const redirectTo = Astro.url.searchParams.get('redirect') || '/app';
```

### 7.2 Logowanie email/hasło (Client-side)

**Metoda:** Supabase Auth `signInWithPassword`

**Żądanie:**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/db/database.types';

// Tworzenie klienta browser Supabase
const supabase = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Logowanie z email i hasłem
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
});
```

**Odpowiedź sukcesu:**
```typescript
{
  data: {
    user: User,      // Obiekt użytkownika Supabase
    session: Session // Sesja z access_token i refresh_token
  },
  error: null
}
```

**Odpowiedź błędu:**
```typescript
{
  data: { user: null, session: null },
  error: AuthError  // { message: string, status: number }
}
```

**Akcja po sukcesie:**
```typescript
if (data.session) {
  // Supabase automatycznie ustawił cookies z tokenami
  // Przekierowanie do dashboardu lub intendowanej strony
  window.location.href = redirectTo || '/app';
}
```

### 7.3 Logowanie OAuth (Client-side)

**Metoda:** Supabase Auth `signInWithOAuth`

**Żądanie:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // lub 'github', 'facebook', etc.
  options: {
    redirectTo: `${window.location.origin}${redirectTo || '/app'}`,
    // Opcjonalnie: scopes dla dodatkowych uprawnień
    // scopes: 'email profile',
  },
});
```

**Flow OAuth:**
1. Supabase przekierowuje użytkownika do providera (Google/GitHub)
2. Użytkownik autoryzuje aplikację u providera
3. Provider przekierowuje z powrotem do Supabase callback URL
4. Supabase wymienia code na tokeny i ustawia cookies
5. Użytkownik jest przekierowywany do `redirectTo`

**Konfiguracja w Supabase Dashboard:**
- Authentication → Providers → Włącz Google/GitHub
- Skonfiguruj Client ID i Client Secret
- Ustaw Site URL i Redirect URLs

### 7.4 Konfiguracja Supabase SDK

**Zmienne środowiskowe:**
```env
# Publiczne (dostępne w client-side)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Pliki konfiguracyjne:**
- `src/db/supabase.client.ts` - factory functions dla klientów
- `src/middleware/index.ts` - tworzenie server client

## 8. Interakcje użytkownika

| Interakcja | Element | Oczekiwany rezultat |
|------------|---------|---------------------|
| Wejście na `/auth/login` (niezalogowany) | - | Wyświetlenie formularza logowania |
| Wejście na `/auth/login` (zalogowany) | - | Automatyczne przekierowanie do `/app` |
| Wpisanie emaila | EmailInput | Aktualizacja stanu formularza, walidacja on blur |
| Wpisanie hasła | PasswordInput | Aktualizacja stanu formularza, walidacja on blur |
| Submit z pustymi polami | SubmitButton | Wyświetlenie błędów walidacji przy polach |
| Submit z nieprawidłowym emailem | SubmitButton | Wyświetlenie "Nieprawidłowy format adresu email" |
| Submit z za krótkim hasłem | SubmitButton | Wyświetlenie "Hasło musi mieć minimum 6 znaków" |
| Submit z poprawnymi danymi (błędne credentiale) | SubmitButton | Wyświetlenie "Nieprawidłowy email lub hasło" |
| Submit z poprawnymi danymi (sukces) | SubmitButton | Przekierowanie do `/app` lub `redirectTo` |
| Kliknięcie "Zaloguj przez Google" | SocialLoginButton | Przekierowanie do Google OAuth |
| Kliknięcie logo/linku do strony głównej | Logo/BackLink | Przekierowanie do `/` |
| Nawigacja klawiaturą | Wszystkie interaktywne elementy | Focus widoczny, Tab działa poprawnie |
| Kliknięcie "Zarejestruj się" | RegistrationLink | Brak akcji (placeholder w MVP) |

## 9. Warunki i walidacja

### 9.1 Warunki dostępu do strony

| Warunek | Komponent | Wpływ na interfejs |
|---------|-----------|-------------------|
| Użytkownik niezalogowany | LoginPage | Strona jest renderowana normalnie |
| Użytkownik zalogowany | LoginPage | Przekierowanie 302 do `/app` przed renderowaniem |

### 9.2 Walidacja formularza (Zod)

| Pole | Warunek | Komunikat błędu |
|------|---------|-----------------|
| email | Wymagane | "Email jest wymagany" |
| email | Format email | "Nieprawidłowy format adresu email" |
| password | Wymagane | "Hasło jest wymagane" |
| password | Min 6 znaków | "Hasło musi mieć minimum 6 znaków" |

### 9.3 Walidacja w komponencie LoginForm

```typescript
// Użycie React Hook Form z Zod
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  mode: "onBlur", // walidacja przy blur
  reValidateMode: "onChange", // rewalidacja przy zmianie
});
```

### 9.4 Warunki dostępności

| Warunek | Komponent | Implementacja |
|---------|-----------|---------------|
| Kontrast kolorów | Wszystkie teksty | WCAG AA (minimum 4.5:1) |
| Focus widoczny | Wszystkie inputy, przyciski | `focus-visible:ring-[3px]` (shadcn/ui) |
| Język strony | AuthLayout | `<html lang="pl">` |
| Labels dla inputów | EmailInput, PasswordInput | `<label>` lub `aria-label` |
| Błędy powiązane z polami | ErrorMessage | `aria-describedby` |
| Formularz accessible | LoginForm | `role="form"`, proper labels |

## 10. Obsługa błędów

### 10.1 Mapowanie błędów Supabase Auth

| Kod błędu Supabase | Komunikat PL | Akcja UI |
|-------------------|--------------|----------|
| `invalid_credentials` | "Nieprawidłowy email lub hasło" | Wyświetlenie w generalError |
| `email_not_confirmed` | "Email nie został potwierdzony" | Wyświetlenie w generalError |
| `too_many_requests` | "Zbyt wiele prób. Spróbuj za chwilę" | Wyświetlenie w generalError |
| `user_not_found` | "Nieprawidłowy email lub hasło" | Wyświetlenie w generalError (nie ujawniaj) |
| `network_error` | "Błąd połączenia. Sprawdź internet" | Wyświetlenie w generalError |
| `unknown` | "Wystąpił nieoczekiwany błąd" | Wyświetlenie w generalError |

### 10.2 Implementacja mapowania błędów

```typescript
// src/components/auth/utils/auth-error-mapper.ts
import type { AuthError } from "@supabase/supabase-js";

export function mapAuthError(error: AuthError | null): string {
  if (!error) return "Wystąpił nieoczekiwany błąd";
  
  switch (error.message) {
    case "Invalid login credentials":
      return "Nieprawidłowy email lub hasło";
    case "Email not confirmed":
      return "Email nie został potwierdzony";
    case "Too many requests":
      return "Zbyt wiele prób. Spróbuj za chwilę";
    default:
      if (error.message.includes("network")) {
        return "Błąd połączenia. Sprawdź internet";
      }
      return "Wystąpił nieoczekiwany błąd";
  }
}
```

### 10.3 Obsługa błędu OAuth

**Scenariusz:** Użytkownik anuluje logowanie OAuth lub provider zwraca błąd.

**Obsługa:**
- Supabase automatycznie przekierowuje z powrotem z parametrem `error`
- Parsowanie URL i wyświetlenie komunikatu błędu

```typescript
// W useEffect przy mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  
  if (error) {
    setGeneralError(errorDescription || "Logowanie zostało anulowane");
    // Wyczyść URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

### 10.4 Obsługa braku JavaScript

```astro
<!-- W AuthLayout.astro -->
<noscript>
  <div class="p-4 bg-destructive/10 text-destructive rounded-md">
    Ta strona wymaga włączonego JavaScript do prawidłowego działania.
  </div>
</noscript>
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów i plików

```bash
mkdir -p src/pages/auth
mkdir -p src/layouts
mkdir -p src/components/auth
mkdir -p src/components/auth/schemas
mkdir -p src/components/auth/utils
```

Pliki do utworzenia:
- `src/pages/auth/login.astro`
- `src/layouts/AuthLayout.astro`
- `src/components/auth/LoginCard.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SocialLoginButtons.tsx`
- `src/components/auth/FormDivider.tsx`
- `src/components/auth/RegistrationLink.tsx`
- `src/components/auth/schemas/login.schema.ts`
- `src/components/auth/utils/auth-error-mapper.ts`
- `src/components/auth/types.ts`

### Krok 2: Instalacja dodatkowych zależności

Sprawdzić, czy są zainstalowane (powinny być):
- `zod` - już w package.json
- Brak potrzeby instalacji `react-hook-form` - używamy natywnego stanu React dla prostoty MVP

Alternatywnie, jeśli React Hook Form jest preferowany:
```bash
pnpm add react-hook-form @hookform/resolvers
```

### Krok 3: Dodanie komponentów shadcn/ui

```bash
# Input component
npx shadcn@latest add input

# Label component
npx shadcn@latest add label

# Card component (opcjonalnie)
npx shadcn@latest add card
```

### Krok 4: Utworzenie AuthLayout

Plik: `src/layouts/AuthLayout.astro`

- Bazować na istniejącym `Layout.astro`
- Zmienić `lang="en"` na `lang="pl"`
- Dodać centrowanie zawartości (flexbox center)
- Ustawić tło i padding odpowiednie dla formularzy
- Dodać meta tag `noindex` (strony auth nie powinny być indeksowane)

### Krok 5: Utworzenie schemy walidacji

Plik: `src/components/auth/schemas/login.schema.ts`

- Zdefiniować schemat Zod dla formularza logowania
- Eksportować typ `LoginFormData` wygenerowany ze schematu

### Krok 6: Utworzenie mappera błędów

Plik: `src/components/auth/utils/auth-error-mapper.ts`

- Zaimplementować funkcję mapującą błędy Supabase na komunikaty polskie
- Obsłużyć wszystkie znane przypadki błędów

### Krok 7: Utworzenie komponentów pomocniczych

**7.1 FormDivider** (`src/components/auth/FormDivider.tsx`)
- Prosty separator z tekstem "lub"
- Stylizacja Tailwind

**7.2 RegistrationLink** (`src/components/auth/RegistrationLink.tsx`)
- Tekst "Nie masz konta? Zarejestruj się"
- Nieaktywny w MVP (cursor-not-allowed, opacity)

### Krok 8: Utworzenie LoginForm

Plik: `src/components/auth/LoginForm.tsx`

- Formularz z polami email i password
- Walidacja Zod przy submit
- Inline error messages
- Loading state na przycisku
- Obsługa generalError z props

### Krok 9: Utworzenie SocialLoginButtons

Plik: `src/components/auth/SocialLoginButtons.tsx`

- Przyciski dla Google i GitHub (opcjonalne w MVP)
- Ikony providerów (Lucide lub custom SVG)
- Loading state przy kliknięciu
- Wywołanie callback onLogin

### Krok 10: Utworzenie LoginCard

Plik: `src/components/auth/LoginCard.tsx`

- Główny komponent integrujący wszystkie części
- Logika Supabase Auth (createClient)
- Obsługa submit formularza
- Obsługa OAuth login
- Przekierowanie po sukcesie

### Krok 11: Utworzenie strony login.astro

Plik: `src/pages/auth/login.astro`

- Sprawdzenie autentykacji w frontmatter
- Przekierowanie zalogowanych do /app
- Parsowanie redirectTo z query params
- Przekazanie props do LoginCard
- Renderowanie w AuthLayout

### Krok 12: Stylizacja i dopracowanie

- Dostosowanie kolorystyki do reszty aplikacji
- Responsywne rozmiary formularza
- Animacje wejścia (opcjonalnie)
- Testy na różnych rozdzielczościach (360px, 768px, 1024px, 1920px)

### Krok 13: Testy dostępności

- Walidacja WCAG za pomocą axe DevTools
- Test nawigacji klawiaturą (Tab, Enter, Escape)
- Test z czytnikiem ekranu
- Sprawdzenie kontrastów kolorów
- Sprawdzenie aria-labels i aria-describedby

### Krok 14: Integracja z Landing Page

- Upewnienie się, że LoginButton na Landing Page kieruje na `/auth/login`
- Sprawdzenie działania przekierowania po zalogowaniu
- Testy end-to-end flow logowania

