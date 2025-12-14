/**
 * LogoutConfirmDialog - Confirmation dialog for logout action.
 * Uses Radix UI AlertDialog with Geist styling.
 */
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LogoutConfirmDialogProps } from "./types";

/**
 * Logout confirmation dialog.
 * Shows warning message and handles loading/error states.
 */
export function LogoutConfirmDialog({ isOpen, onOpenChange, onConfirm, isLoading, error }: LogoutConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Overlay */}
        <AlertDialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Content - centered with margin for mobile */}
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100%-2rem)] max-w-md mx-4",
            "bg-card border border-border rounded-lg shadow-lg p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
            Wylogowanie
          </AlertDialogPrimitive.Title>

          <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            Czy na pewno chcesz się wylogować? Zostaniesz przekierowany na stronę główną.
          </AlertDialogPrimitive.Description>

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

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={isLoading}>
                Anuluj
              </Button>
            </AlertDialogPrimitive.Cancel>

            <AlertDialogPrimitive.Action asChild>
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
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
