/**
 * ProfileView - Main profile page component.
 * Displays user information and provides logout functionality.
 */
import { useState, useCallback } from "react";
import { useLogout } from "./useLogout";
import { ProfileHeader } from "./ProfileHeader";
import { UserInfo } from "./UserInfo";
import { LogoutButton } from "./LogoutButton";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import type { ProfileViewProps } from "./types";

/**
 * Main profile view component.
 * Manages logout dialog state and orchestrates child components.
 */
export function ProfileView({ user }: ProfileViewProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { isLoading, error, logout, clearError } = useLogout();

  const handleLogoutClick = useCallback(() => {
    clearError();
    setIsLogoutDialogOpen(true);
  }, [clearError]);

  const handleLogoutConfirm = useCallback(async () => {
    await logout();
  }, [logout]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      // Don't allow closing during logout
      if (!isLoading) {
        setIsLogoutDialogOpen(open);
        if (!open) {
          clearError();
        }
      }
    },
    [isLoading, clearError]
  );

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
          <LogoutButton onClick={handleLogoutClick} disabled={isLoading} />
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
