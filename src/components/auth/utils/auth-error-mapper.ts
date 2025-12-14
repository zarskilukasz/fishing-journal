import type { AuthError } from "@supabase/supabase-js";

/**
 * Mapuje błędy Supabase Auth na komunikaty w języku polskim.
 * Zapewnia przyjazne dla użytkownika komunikaty błędów.
 */
export function mapAuthError(error: AuthError | null): string {
  if (!error) {
    return "Wystąpił nieoczekiwany błąd";
  }

  const message = error.message.toLowerCase();

  // Błędne dane logowania
  if (message.includes("invalid login credentials") || message.includes("invalid_credentials")) {
    return "Nieprawidłowy email lub hasło";
  }

  // Email nie potwierdzony
  if (message.includes("email not confirmed")) {
    return "Email nie został potwierdzony. Sprawdź swoją skrzynkę";
  }

  // Zbyt wiele prób
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Zbyt wiele prób. Spróbuj za chwilę";
  }

  // Użytkownik nie znaleziony (nie ujawniaj tej informacji)
  if (message.includes("user not found")) {
    return "Nieprawidłowy email lub hasło";
  }

  // Błąd sieci
  if (message.includes("network") || message.includes("fetch")) {
    return "Błąd połączenia. Sprawdź internet";
  }

  // Konto zablokowane
  if (message.includes("disabled") || message.includes("banned")) {
    return "Konto zostało zablokowane. Skontaktuj się z obsługą";
  }

  // Sesja wygasła
  if (message.includes("session") && message.includes("expired")) {
    return "Sesja wygasła. Zaloguj się ponownie";
  }

  // Domyślny komunikat
  return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie";
}

/**
 * Mapuje błędy OAuth na komunikaty w języku polskim.
 */
export function mapOAuthError(errorCode: string | null, errorDescription: string | null): string {
  if (!errorCode) {
    return "Logowanie zostało anulowane";
  }

  const code = errorCode.toLowerCase();

  if (code === "access_denied") {
    return "Dostęp został odrzucony. Spróbuj ponownie";
  }

  if (code === "temporarily_unavailable") {
    return "Usługa tymczasowo niedostępna. Spróbuj za chwilę";
  }

  if (errorDescription) {
    return errorDescription;
  }

  return "Logowanie zostało anulowane";
}
