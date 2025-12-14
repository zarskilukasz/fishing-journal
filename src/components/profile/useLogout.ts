/**
 * Custom hook for handling user logout.
 * Manages logout state, Supabase auth communication, and redirect.
 */
import { useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { UseLogoutReturn } from "./types";

/**
 * Hook for managing logout flow.
 *
 * @returns Logout state and actions
 *
 * @example
 * ```tsx
 * const { isLoading, error, logout, clearError } = useLogout();
 *
 * const handleConfirm = async () => {
 *   await logout();
 * };
 * ```
 */
export function useLogout(): UseLogoutReturn {
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

      // Redirect to landing page after successful logout
      window.location.href = "/";
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił błąd podczas wylogowywania";
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
