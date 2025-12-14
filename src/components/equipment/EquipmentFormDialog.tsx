/**
 * EquipmentFormDialog - Dialog for creating or editing equipment.
 * Uses AlertDialog from Radix UI (adapted for form use).
 * Responsive: sheet-style on mobile, centered dialog on desktop.
 */
import React, { useId, useCallback } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EquipmentForm } from "./EquipmentForm";
import {
  type EquipmentType,
  type EquipmentDto,
  type EquipmentFormValues,
  EQUIPMENT_TYPE_SINGULAR_LABELS,
  EQUIPMENT_TYPE_NOMINATIVE_LABELS,
} from "./types";

export interface EquipmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentType: EquipmentType;
  editItem: EquipmentDto | null; // null = create mode
  onSubmit: (data: EquipmentFormValues) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

/**
 * Form dialog for equipment CRUD operations.
 */
export function EquipmentFormDialog({
  isOpen,
  onClose,
  equipmentType,
  editItem,
  onSubmit,
  isSubmitting,
  error,
}: EquipmentFormDialogProps) {
  const formId = useId();
  const isEditMode = editItem !== null;

  const title = isEditMode
    ? `Edytuj ${EQUIPMENT_TYPE_SINGULAR_LABELS[equipmentType]}`
    : `Dodaj ${EQUIPMENT_TYPE_SINGULAR_LABELS[equipmentType]}`;

  const submitLabel = isEditMode ? "Zapisz" : "Dodaj";

  const handleSubmit = useCallback(
    async (data: EquipmentFormValues) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Overlay */}
        <AlertDialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Content */}
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed z-50",
            // Mobile: bottom sheet style
            "inset-x-0 bottom-0 sm:inset-auto",
            // Desktop: centered
            "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
            "w-full sm:w-[calc(100%-2rem)] sm:max-w-md",
            // Styling
            "bg-card border border-border rounded-t-2xl sm:rounded-lg shadow-lg",
            // Animations
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Mobile slide up
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            // Desktop zoom
            "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
            "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </AlertDialogPrimitive.Title>

            <Button variant="ghost" size="icon-sm" disabled={isSubmitting} onClick={onClose} aria-label="Zamknij">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6">
            <AlertDialogPrimitive.Description className="sr-only">
              {isEditMode
                ? `Edytuj nazwę ${EQUIPMENT_TYPE_NOMINATIVE_LABELS[equipmentType].toLowerCase()}`
                : `Wprowadź nazwę nowej ${EQUIPMENT_TYPE_NOMINATIVE_LABELS[equipmentType].toLowerCase()}`}
            </AlertDialogPrimitive.Description>

            <EquipmentForm
              key={editItem?.id ?? "new"}
              formId={formId}
              defaultValues={editItem ? { name: editItem.name } : undefined}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              serverError={error}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-4 sm:p-6">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Anuluj
              </Button>
            </AlertDialogPrimitive.Cancel>

            <Button type="submit" form={formId} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Zapisywanie..." : submitLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
