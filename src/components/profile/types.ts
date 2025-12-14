/**
 * Types for profile view components.
 */
import type { UserSessionData } from "@/components/layout/navigation.types";

// ---------------------------------------------------------------------------
// Component Props Types
// ---------------------------------------------------------------------------

/**
 * Props for the main ProfileView component (React island)
 */
export interface ProfileViewProps {
  /** Logged-in user data from Astro server */
  user: UserSessionData;
}

/**
 * Props for UserInfo component
 */
export interface UserInfoProps {
  /** User email address */
  email: string;
}

/**
 * Props for LogoutButton component
 */
export interface LogoutButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Props for LogoutConfirmDialog component
 */
export interface LogoutConfirmDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Handler for open state changes */
  onOpenChange: (open: boolean) => void;
  /** Handler for logout confirmation */
  onConfirm: () => void;
  /** Whether logout is in progress */
  isLoading: boolean;
  /** Error message (if any) */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Hook Types
// ---------------------------------------------------------------------------

/**
 * State managed by useLogout hook
 */
export interface UseLogoutState {
  /** Whether logout is in progress */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
}

/**
 * Actions provided by useLogout hook
 */
export interface UseLogoutActions {
  /** Execute logout */
  logout: () => Promise<boolean>;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Return type of useLogout hook
 */
export type UseLogoutReturn = UseLogoutState & UseLogoutActions;
