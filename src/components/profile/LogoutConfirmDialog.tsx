/**
 * LogoutConfirmDialog - Confirmation dialog for logout action.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
} from "@/components/ui/responsive-dialog";
import type { LogoutConfirmDialogProps } from "./types";

/**
 * Logout confirmation dialog.
 * Shows warning message and handles loading/error states.
 */
export function LogoutConfirmDialog({ isOpen, onOpenChange, onConfirm, isLoading, error }: LogoutConfirmDialogProps) {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Wylogowanie</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <ResponsiveDialogDescription>
            Czy na pewno chcesz się wylogować? Zostaniesz przekierowany na stronę główną.
          </ResponsiveDialogDescription>

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
            >
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Anuluj
            </Button>
          </ResponsiveDialogClose>

          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading ? "Wylogowywanie..." : "Wyloguj"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
