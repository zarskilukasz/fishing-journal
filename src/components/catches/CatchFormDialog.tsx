/**
 * CatchFormDialog - Modal dialog for adding/editing catches.
 * Full screen on mobile, centered modal on desktop.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CatchForm } from "./CatchForm";
import { useCatchForm } from "@/components/hooks/useCatchForm";
import { useIsMobile } from "@/components/hooks/useMediaQuery";
import type { CatchDto } from "@/types";

export interface CatchFormDialogProps {
  /** Trip ID to add catch to */
  tripId: string;
  /** Trip start datetime (ISO string) */
  tripStartedAt: string;
  /** Trip end datetime (ISO string) or null if active */
  tripEndedAt: string | null;
  /** Existing catch data for edit mode */
  existingCatch?: CatchDto;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when catch is successfully created/updated */
  onSuccess: (createdCatch: CatchDto) => void;
}

/**
 * Modal dialog for catch form.
 */
export function CatchFormDialog({
  tripId,
  tripStartedAt,
  tripEndedAt,
  existingCatch,
  isOpen,
  onClose,
  onSuccess,
}: CatchFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditMode = !!existingCatch;

  // Handle successful submission
  const handleSuccess = React.useCallback(
    (catchData: CatchDto) => {
      onSuccess(catchData);
      onClose();
    },
    [onSuccess, onClose]
  );

  // Initialize form hook
  const form = useCatchForm({
    tripId,
    tripStartedAt,
    tripEndedAt,
    existingCatch,
    onSuccess: handleSuccess,
  });

  // Handle close (reset form)
  const handleClose = React.useCallback(() => {
    if (!form.isSubmitting) {
      form.resetForm();
      onClose();
    }
  }, [form, onClose]);

  // Handle escape key
  const handleEscapeKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (form.isSubmitting) {
        e.preventDefault();
      }
    },
    [form.isSubmitting]
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Content */}
        <DialogPrimitive.Content
          onEscapeKeyDown={handleEscapeKeyDown}
          className={cn(
            "fixed z-50 bg-card text-foreground shadow-lg",
            "focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            // Mobile: full screen
            isMobile && [
              "inset-0",
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
              "duration-300",
            ],
            // Desktop: centered modal
            !isMobile && [
              "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
              "w-full max-w-lg rounded-lg border border-border",
              "max-h-[90vh] overflow-hidden",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "duration-200",
            ]
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between border-b border-border px-4 py-3",
              isMobile && "sticky top-0 bg-card z-10"
            )}
          >
            <DialogPrimitive.Title className="text-lg font-semibold">
              {isEditMode ? "Edytuj połów" : "Dodaj połów"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Cancel asChild>
              <Button variant="ghost" size="icon-sm" disabled={form.isSubmitting} aria-label="Zamknij">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Cancel>
          </div>

          {/* Body */}
          <div
            className={cn("p-4", isMobile && "overflow-y-auto", !isMobile && "max-h-[calc(90vh-60px)] overflow-y-auto")}
          >
            <CatchForm form={form} tripStartedAt={tripStartedAt} tripEndedAt={tripEndedAt} onCancel={handleClose} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
