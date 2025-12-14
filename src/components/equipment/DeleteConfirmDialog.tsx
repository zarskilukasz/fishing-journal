/**
 * DeleteConfirmDialog - Confirmation dialog for deleting equipment.
 * Uses Radix UI AlertDialog with Geist styling.
 */
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EquipmentDto } from "./types";

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  item: EquipmentDto | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

/**
 * Delete confirmation dialog with soft-delete information.
 */
export function DeleteConfirmDialog({ isOpen, item, onCancel, onConfirm, isDeleting }: DeleteConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
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
            "w-[calc(100%-2rem)] max-w-md",
            "bg-card border border-border rounded-lg shadow-lg p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Warning icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>

          <AlertDialogPrimitive.Title className="mt-4 text-center text-lg font-semibold text-foreground">
            Usuń &ldquo;{item?.name}&rdquo;?
          </AlertDialogPrimitive.Title>

          <AlertDialogPrimitive.Description className="mt-2 text-center text-sm text-muted-foreground">
            Element zostanie ukryty, ale zachowany w historycznych wyprawach.
          </AlertDialogPrimitive.Description>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={isDeleting}>
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
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isDeleting ? "Usuwanie..." : "Usuń"}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
