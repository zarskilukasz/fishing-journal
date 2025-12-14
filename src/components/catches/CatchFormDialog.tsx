/**
 * CatchFormDialog - Modal dialog for adding/editing catches.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogCloseButton,
  useResponsiveDialogContext,
} from "@/components/ui/responsive-dialog";
import { CatchForm } from "./CatchForm";
import { useCatchForm } from "@/components/hooks/useCatchForm";
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
 * Inner content that uses ResponsiveDialogContext
 */
function CatchFormDialogContent({
  tripId,
  tripStartedAt,
  tripEndedAt,
  existingCatch,
  onClose,
  onSuccess,
}: Omit<CatchFormDialogProps, "isOpen">) {
  const { isMobile } = useResponsiveDialogContext();
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

  // Block close during submission
  const handleEscapeKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (form.isSubmitting) {
        e.preventDefault();
      }
    },
    [form.isSubmitting]
  );

  const handlePointerDownOutside = React.useCallback(
    (e: CustomEvent) => {
      if (form.isSubmitting) {
        e.preventDefault();
      }
    },
    [form.isSubmitting]
  );

  return (
    <ResponsiveDialogContent
      className={isMobile ? "h-[95vh]" : "max-w-lg"}
      onEscapeKeyDown={handleEscapeKeyDown}
      onPointerDownOutside={handlePointerDownOutside}
    >
      {/* Header */}
      <ResponsiveDialogHeader>
        <div className="flex items-center justify-between w-full">
          <ResponsiveDialogTitle>{isEditMode ? "Edytuj połów" : "Dodaj połów"}</ResponsiveDialogTitle>
          <ResponsiveDialogCloseButton disabled={form.isSubmitting} />
        </div>
      </ResponsiveDialogHeader>

      {/* Body */}
      <ResponsiveDialogBody className="flex-1">
        <CatchForm form={form} tripStartedAt={tripStartedAt} tripEndedAt={tripEndedAt} onCancel={handleClose} />
      </ResponsiveDialogBody>
    </ResponsiveDialogContent>
  );
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
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <CatchFormDialogContent
        tripId={tripId}
        tripStartedAt={tripStartedAt}
        tripEndedAt={tripEndedAt}
        existingCatch={existingCatch}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </ResponsiveDialog>
  );
}
