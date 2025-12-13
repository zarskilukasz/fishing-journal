# Plan implementacji widoku Profil użytkownika

## 1. Przegląd

Widok Profil użytkownika to minimalistyczna strona wyświetlająca podstawowe informacje o zalogowanym użytkowniku oraz umożliwiająca wylogowanie z aplikacji. Jest to prosty widok zgodny z założeniami MVP, zawierający email użytkownika i przycisk wylogowania z dialogiem potwierdzającym.

Główne funkcjonalności:
- Wyświetlanie adresu email zalogowanego użytkownika
- Wylogowanie z aplikacji z potwierdzeniem
- Czyszczenie sesji Supabase Auth
- Przekierowanie na stronę powitalną (Landing Page) po wylogowaniu

## 2. Routing widoku

- **Ścieżka**: `/app/profile`
- **Dostęp**: Tylko zalogowani użytkownicy
- **Ochrona**: Middleware Astro weryfikuje sesję Supabase przed renderowaniem
- **Przekierowanie po wylogowaniu**: `/` (Landing Page)

## 3. Struktura komponentów

```
ProfilePage (/app/profile) - Astro page
└── Layout
    └── AppLayout (nawigacja aplikacji)
        └── ProfileView (React component, client:load)
            ├── ProfileHeader
            │   └── Tytuł "Profil"
            ├── UserInfo
            │   ├── Avatar/Ikona użytkownika
            │   └── Email użytkownika
            ├── LogoutButton
            │   └── Outlined Button "Wyloguj się"
            └── LogoutConfirmDialog
                ├── DialogTitle
                ├── DialogDescription
                ├── CancelButton
                └── ConfirmButton
```

## 4. Szczegóły komponentów

### 4.1 ProfilePage (Astro)

- **Opis komponentu**: Strona Astro renderująca widok profilu. Pobiera dane sesji po stronie serwera i przekazuje je do komponentu React.
- **Główne elementy**:
  - Import Layout i AppLayout
  - Import ProfileView (React)
  - Pobranie sesji z `Astro.locals.supabase`
- **Obsługiwane interakcje**: Brak (statyczny kontener)
- **Obsługiwana walidacja**: Weryfikacja sesji - przekierowanie na `/auth/login` jeśli brak sesji
- **Typy**: `SessionUserDto`
- **Propsy**: Brak (strona)

### 4.2 ProfileView

- **Opis komponentu**: Główny komponent React wyświetlający zawartość profilu użytkownika. Zarządza stanem dialogu wylogowania i wywołuje Supabase Auth do wylogowania.
- **Główne elementy**:
  - `ProfileHeader` - nagłówek sekcji
  - `UserInfo` - informacje o użytkowniku
  - `LogoutButton` - przycisk wylogowania
  - `LogoutConfirmDialog` - dialog potwierdzający
- **Obsługiwane interakcje**:
  - Otwarcie dialogu wylogowania
  - Zamknięcie dialogu
  - Potwierdzenie wylogowania
- **Obsługiwana walidacja**: Brak
- **Typy**:
  - `ProfileViewProps`
  - `SessionUserDto`
- **Propsy**:
  ```typescript
  interface ProfileViewProps {
    user: SessionUserDto;
  }
  ```

### 4.3 ProfileHeader

- **Opis komponentu**: Nagłówek sekcji profilu z tytułem strony. Prosty komponent prezentacyjny zgodny z MD3.
- **Główne elementy**:
  - Element `<h1>` z tekstem "Profil"
  - Opcjonalnie: podtytuł lub breadcrumb
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**: Brak

### 4.4 UserInfo

- **Opis komponentu**: Komponent wyświetlający informacje o użytkowniku w stylu MD3 List Item. Pokazuje avatar (lub placeholder) oraz adres email użytkownika.
- **Główne elementy**:
  - Kontener w stylu MD3 List Item
  - Ikona/Avatar użytkownika (Lucide `User` icon)
  - Tekst z adresem email
- **Obsługiwane interakcje**: Brak (tylko wyświetlanie)
- **Obsługiwana walidacja**: Brak
- **Typy**: `SessionUserDto`
- **Propsy**:
  ```typescript
  interface UserInfoProps {
    email: string;
  }
  ```

### 4.5 LogoutButton

- **Opis komponentu**: Przycisk wylogowania w wariancie Outlined (MD3). Po kliknięciu otwiera dialog potwierdzający wylogowanie.
- **Główne elementy**:
  - Shadcn `Button` z wariantem `outline`
  - Ikona `LogOut` z Lucide React
  - Tekst "Wyloguj się"
- **Obsługiwane interakcje**:
  - `onClick` → otwiera dialog `LogoutConfirmDialog`
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych
- **Propsy**:
  ```typescript
  interface LogoutButtonProps {
    onClick: () => void;
    disabled?: boolean;
  }
  ```

### 4.6 LogoutConfirmDialog

- **Opis komponentu**: Dialog potwierdzający wylogowanie użytkownika. Zawiera ostrzeżenie i dwa przyciski: anuluj i potwierdź. Wyświetla stan ładowania podczas wylogowywania.
- **Główne elementy**:
  - Shadcn `AlertDialog` lub `Dialog`
  - `DialogHeader` z tytułem "Wylogowanie"
  - `DialogDescription` z tekstem "Czy na pewno chcesz się wylogować?"
  - Przycisk "Anuluj" (Ghost/Text variant)
  - Przycisk "Wyloguj" (Destructive variant)
  - Loader podczas stanu ładowania
- **Obsługiwane interakcje**:
  - `onOpenChange` → kontrola widoczności dialogu
  - `onConfirm` → wywołanie funkcji wylogowania
  - `onCancel` → zamknięcie dialogu
- **Obsługiwana walidacja**: Brak
- **Typy**:
  - `LogoutConfirmDialogProps`
- **Propsy**:
  ```typescript
  interface LogoutConfirmDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isLoading: boolean;
  }
  ```

## 5. Typy

### 5.1 Typy z `src/types.ts` (istniejące)

```typescript
// Użytkownik sesji
interface SessionUserDto {
  id: UUID;
  email: string;
}

// Odpowiedź sesji auth (jeśli potrzebna)
interface AuthSessionResponseDto {
  user: SessionUserDto;
}

// Typ błędu API
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetails;
  };
}
```

### 5.2 Nowe typy ViewModel (do utworzenia)

```typescript
// Plik: src/components/profile/types.ts

/**
 * Propsy komponentu ProfileView
 */
interface ProfileViewProps {
  /** Dane zalogowanego użytkownika */
  user: SessionUserDto;
}

/**
 * Propsy komponentu UserInfo
 */
interface UserInfoProps {
  /** Adres email użytkownika */
  email: string;
}

/**
 * Propsy komponentu LogoutButton
 */
interface LogoutButtonProps {
  /** Handler kliknięcia */
  onClick: () => void;
  /** Czy przycisk jest wyłączony */
  disabled?: boolean;
}

/**
 * Propsy komponentu LogoutConfirmDialog
 */
interface LogoutConfirmDialogProps {
  /** Czy dialog jest otwarty */
  isOpen: boolean;
  /** Handler zmiany stanu otwarcia */
  onOpenChange: (open: boolean) => void;
  /** Handler potwierdzenia wylogowania */
  onConfirm: () => void;
  /** Czy trwa wylogowywanie */
  isLoading: boolean;
}

/**
 * Stan hooka useLogout
 */
interface UseLogoutState {
  /** Czy trwa wylogowywanie */
  isLoading: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;
}

/**
 * Akcje hooka useLogout
 */
interface UseLogoutActions {
  /** Wykonaj wylogowanie */
  logout: () => Promise<boolean>;
  /** Wyczyść błąd */
  clearError: () => void;
}

/**
 * Zwracany typ hooka useLogout
 */
type UseLogoutReturn = UseLogoutState & UseLogoutActions;
```

## 6. Zarządzanie stanem

### 6.1 Stan w komponencie ProfileView

ProfileView zarządza stanem dialogu wylogowania:

```typescript
const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
```

### 6.2 Custom Hook: `useLogout`

Hook `useLogout` zarządza logiką wylogowania użytkownika, w tym:
- Komunikacją z Supabase Auth
- Stanem ładowania
- Obsługą błędów
- Przekierowaniem po wylogowaniu

**Plik**: `src/components/profile/useLogout.ts`

```typescript
import { useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      // Przekierowanie na Landing Page
      window.location.href = "/";
      return true;
    } catch (err) {
      const message = err instanceof Error 
        ? err.message 
        : "Wystąpił błąd podczas wylogowywania";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    logout,
    clearError,
  };
}
```

### 6.3 Przekazywanie danych użytkownika

Dane użytkownika są pobierane po stronie serwera w komponencie Astro i przekazywane do React jako propsy:

```astro
---
// src/pages/app/profile.astro
import Layout from "@/layouts/Layout.astro";
import { ProfileView } from "@/components/profile/ProfileView";

const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect("/auth/login");
}

const sessionUser = {
  id: user.id,
  email: user.email ?? "",
};
---

<Layout title="Profil - Dziennik Wędkarski">
  <ProfileView client:load user={sessionUser} />
</Layout>
```

## 7. Integracja API

### 7.1 Architektura autoryzacji - Supabase SDK

Widok Profil używa **Supabase SDK** do autoryzacji zgodnie z ujednoliconą architekturą auth w aplikacji:

**Dlaczego Supabase SDK (nie własne endpointy API)?**
- Supabase Auth zapewnia wbudowaną obsługę sesji, tokenów i refresh tokenów
- Cookies z tokenami są automatycznie zarządzane przez `@supabase/ssr`
- Middleware Astro automatycznie weryfikuje sesję i udostępnia klienta w `Astro.locals.supabase`
- Nie ma potrzeby implementacji własnych endpointów auth - Supabase SDK obsługuje wszystko

**Architektura:**
```
┌─────────────────────────────────────────────────────────────┐
│ Server-side (Astro)                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Middleware: src/middleware/index.ts                     │ │
│ │ - Tworzy Supabase client z cookies                      │ │
│ │ - Weryfikuje sesję: supabase.auth.getUser()             │ │
│ │ - Przekazuje do Astro.locals.supabase                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Page: src/pages/app/profile.astro                       │ │
│ │ - Pobiera user: Astro.locals.supabase.auth.getUser()    │ │
│ │ - Przekazuje dane do React component                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Client-side (React)                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ProfileView: useLogout hook                             │ │
│ │ - Tworzy browser client: createBrowserClient()          │ │
│ │ - Wylogowanie: supabase.auth.signOut()                  │ │
│ │ - Przekierowanie po wylogowaniu: window.location = '/'  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Pobieranie danych sesji (Server-side)

Dane użytkownika są pobierane po stronie serwera w komponencie Astro za pomocą Supabase Auth:

```typescript
// W pliku .astro
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/db/database.types';

// Klient Supabase jest tworzony przez middleware i dostępny w Astro.locals
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect('/auth/login?redirect=/app/profile');
}
```

**Typ odpowiedzi Supabase Auth**:
```typescript
interface User {
  id: string;
  email?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  created_at: string;
  // ... inne pola Supabase User
}
```

### 7.3 Wylogowanie (Client-side)

Wylogowanie wykonywane jest po stronie klienta za pomocą Supabase Auth SDK:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/db/database.types';

// Tworzenie klienta browser Supabase
const supabase = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Wylogowanie - automatycznie czyści cookies sesji
const { error } = await supabase.auth.signOut();

if (!error) {
  // Przekierowanie na stronę główną po wylogowaniu
  window.location.href = '/';
}
```

**Metoda**: `supabase.auth.signOut()`

**Co robi signOut()?**
- Usuwa access_token i refresh_token z cookies
- Invaliduje sesję po stronie Supabase Auth
- Automatycznie obsługuje cleanup storage (localStorage jeśli używany)

**Typ odpowiedzi**:
```typescript
interface AuthResponse {
  error: AuthError | null;
}
```

### 7.4 Konfiguracja Supabase SDK

**Pliki konfiguracyjne:**
- `src/db/supabase.client.ts` - factory functions dla klientów Supabase
- `src/middleware/index.ts` - tworzenie server client z cookies

**Zmienne środowiskowe:**
```env
# Publiczne (dostępne w client-side)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Prywatne (tylko server-side, opcjonalne dla admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJyyy...
```

### 7.5 Middleware autoryzacji

Middleware Astro automatycznie weryfikuje sesję dla ścieżek `/app/*`:

```typescript
// src/middleware/index.ts
import { createServerClient } from '@supabase/ssr';
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Tworzenie Supabase client z cookies
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => context.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Weryfikacja sesji dla chronionych ścieżek
  if (context.url.pathname.startsWith('/app')) {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return context.redirect('/auth/login');
    }
  }

  // Udostępnienie klienta dla stron Astro
  context.locals.supabase = supabase;
  
  return next();
});
```

## 8. Interakcje użytkownika

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| Wejście na `/app/profile` | Wyświetlenie strony profilu z emailem użytkownika |
| Kliknięcie "Wyloguj się" | Otwarcie dialogu potwierdzającego |
| Kliknięcie "Anuluj" w dialogu | Zamknięcie dialogu, powrót do widoku profilu |
| Kliknięcie "Wyloguj" w dialogu | Wyświetlenie loadera, wywołanie signOut, przekierowanie na `/` |
| Naciśnięcie Escape w dialogu | Zamknięcie dialogu |
| Kliknięcie poza dialog | Zamknięcie dialogu |

## 9. Warunki i walidacja

### 9.1 Walidacja dostępu do strony

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| Użytkownik niezalogowany | ProfilePage (Astro) | Przekierowanie na `/auth/login` |
| Brak danych sesji | ProfilePage (Astro) | Przekierowanie na `/auth/login` |
| Sesja wygasła | ProfileView | Przekierowanie na `/auth/login` przy próbie wylogowania |

### 9.2 Walidacja formularza

Brak walidacji formularza - widok nie zawiera formularzy do wypełnienia.

### 9.3 Walidacja po stronie serwera (Supabase Auth)

| Warunek | Zachowanie |
|---------|------------|
| Brak tokenu sesji | `getUser()` zwraca error |
| Token wygasł | `getUser()` zwraca error |
| Token nieprawidłowy | `getUser()` zwraca error |

## 10. Obsługa błędów

### 10.1 Błędy autoryzacji

| Scenariusz | Obsługa |
|------------|---------|
| Brak sesji przy ładowaniu strony | Przekierowanie na `/auth/login` (server-side) |
| Sesja wygasła podczas przeglądania | Przekierowanie na `/auth/login` przy próbie wylogowania |
| Błąd Supabase Auth | Wyświetlenie komunikatu błędu w dialogu |

### 10.2 Błędy wylogowania

| Scenariusz | Obsługa |
|------------|---------|
| Błąd sieciowy przy wylogowaniu | Wyświetlenie komunikatu "Wystąpił błąd podczas wylogowywania. Spróbuj ponownie." |
| Timeout żądania | Wyświetlenie komunikatu błędu z możliwością ponowienia |
| Nieoczekiwany błąd Supabase | Wyświetlenie ogólnego komunikatu błędu |

### 10.3 Wyświetlanie błędów

Błędy wyświetlane są w dialogu wylogowania jako alert:

```tsx
{error && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### 10.4 Fallback przy błędzie pobierania sesji

Jeśli pobranie sesji po stronie serwera się nie powiedzie, użytkownik zostaje przekierowany na stronę logowania z zachowaniem intencji powrotu.

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

```
src/
├── components/
│   └── profile/
│       ├── index.ts                    # Eksporty publiczne
│       ├── types.ts                    # Typy ViewModel
│       ├── useLogout.ts                # Custom hook wylogowania
│       ├── ProfileView.tsx             # Główny komponent widoku
│       ├── ProfileHeader.tsx           # Nagłówek strony
│       ├── UserInfo.tsx                # Informacje o użytkowniku
│       ├── LogoutButton.tsx            # Przycisk wylogowania
│       └── LogoutConfirmDialog.tsx     # Dialog potwierdzający
└── pages/
    └── app/
        └── profile.astro               # Strona Astro
```

### Krok 2: Dodanie komponentów Shadcn UI

Upewnij się, że wymagane komponenty Shadcn są zainstalowane:

```bash
npx shadcn@latest add alert-dialog
npx shadcn@latest add alert
npx shadcn@latest add avatar
```

### Krok 3: Implementacja typów

Utworzenie pliku `src/components/profile/types.ts` z definicjami typów ViewModel opisanymi w sekcji 5.2.

### Krok 4: Implementacja custom hooka useLogout

Utworzenie pliku `src/components/profile/useLogout.ts` z logiką wylogowania:

```typescript
// src/components/profile/useLogout.ts
import { useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      window.location.href = "/";
      return true;
    } catch (err) {
      const message = err instanceof Error 
        ? err.message 
        : "Wystąpił błąd podczas wylogowywania";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    logout,
    clearError,
  };
}
```

### Krok 5: Implementacja komponentu UserInfo

```tsx
// src/components/profile/UserInfo.tsx
import { User } from "lucide-react";
import type { UserInfoProps } from "./types";

export function UserInfo({ email }: UserInfoProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
        <User className="w-6 h-6 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">Email</span>
        <span className="font-medium">{email}</span>
      </div>
    </div>
  );
}
```

### Krok 6: Implementacja komponentu LogoutButton

```tsx
// src/components/profile/LogoutButton.tsx
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LogoutButtonProps } from "./types";

export function LogoutButton({ onClick, disabled }: LogoutButtonProps) {
  return (
    <Button 
      variant="outline" 
      onClick={onClick} 
      disabled={disabled}
      className="w-full sm:w-auto"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Wyloguj się
    </Button>
  );
}
```

### Krok 7: Implementacja komponentu LogoutConfirmDialog

```tsx
// src/components/profile/LogoutConfirmDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import type { LogoutConfirmDialogProps } from "./types";

interface ExtendedLogoutConfirmDialogProps extends LogoutConfirmDialogProps {
  error?: string | null;
}

export function LogoutConfirmDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  isLoading,
  error 
}: ExtendedLogoutConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Wylogowanie</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz się wylogować? Zostaniesz przekierowany na stronę główną.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wylogowywanie...
              </>
            ) : (
              "Wyloguj"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Krok 8: Implementacja komponentu ProfileHeader

```tsx
// src/components/profile/ProfileHeader.tsx

export function ProfileHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
      <p className="text-muted-foreground">
        Zarządzaj swoim kontem
      </p>
    </div>
  );
}
```

### Krok 9: Implementacja głównego komponentu ProfileView

```tsx
// src/components/profile/ProfileView.tsx
import { useState } from "react";
import type { SessionUserDto } from "@/types";
import { useLogout } from "./useLogout";
import { ProfileHeader } from "./ProfileHeader";
import { UserInfo } from "./UserInfo";
import { LogoutButton } from "./LogoutButton";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import type { ProfileViewProps } from "./types";

export function ProfileView({ user }: ProfileViewProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { isLoading, error, logout, clearError } = useLogout();

  const handleLogoutClick = () => {
    clearError();
    setIsLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    await logout();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!isLoading) {
      setIsLogoutDialogOpen(open);
      if (!open) {
        clearError();
      }
    }
  };

  return (
    <main className="container max-w-2xl mx-auto px-4 py-8">
      <ProfileHeader />
      
      <div className="space-y-6">
        <section aria-labelledby="user-info-heading">
          <h2 id="user-info-heading" className="sr-only">
            Informacje o użytkowniku
          </h2>
          <UserInfo email={user.email} />
        </section>

        <section aria-labelledby="account-actions-heading">
          <h2 id="account-actions-heading" className="sr-only">
            Akcje konta
          </h2>
          <LogoutButton 
            onClick={handleLogoutClick} 
            disabled={isLoading}
          />
        </section>
      </div>

      <LogoutConfirmDialog
        isOpen={isLogoutDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}
```

### Krok 10: Utworzenie strony Astro

```astro
---
// src/pages/app/profile.astro
import Layout from "@/layouts/Layout.astro";
import { ProfileView } from "@/components/profile/ProfileView";

export const prerender = false;

const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return Astro.redirect("/auth/login?redirect=/app/profile");
}

const sessionUser = {
  id: user.id,
  email: user.email ?? "",
};
---

<Layout title="Profil - Dziennik Wędkarski">
  <ProfileView client:load user={sessionUser} />
</Layout>
```

### Krok 11: Utworzenie pliku eksportów

```typescript
// src/components/profile/index.ts
export { ProfileView } from "./ProfileView";
export { ProfileHeader } from "./ProfileHeader";
export { UserInfo } from "./UserInfo";
export { LogoutButton } from "./LogoutButton";
export { LogoutConfirmDialog } from "./LogoutConfirmDialog";
export { useLogout } from "./useLogout";
export type * from "./types";
```

### Krok 12: Stylowanie i dostępność

- Dodanie odpowiednich klas Tailwind dla stylowania MD3
- Ustawienie `aria-label` dla wszystkich interaktywnych elementów
- Użycie semantycznego HTML (`<main>`, `<section>`, `<h1>`, `<h2>`)
- Ukryte nagłówki sekcji dla screen readerów (`sr-only`)
- Zapewnienie poprawnej nawigacji klawiaturowej (Tab, Enter, Escape)
- Ustawienie `focus-visible` dla widoczności focusu

### Krok 13: Testowanie

- Testy manualne na różnych rozdzielczościach (360px, 768px, 1920px)
- Test wylogowania z potwierdzeniem i bez
- Test obsługi błędów przy wylogowaniu
- Test przekierowania na stronę główną po wylogowaniu
- Testy dostępności (screen reader, keyboard navigation)
- Test przekierowania niezalogowanego użytkownika

