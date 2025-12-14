/**
 * EquipmentFormDialog - Dialog for creating or editing equipment.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import React, { useId, useCallback } from "react";
import { Loader2 } from "lucide-react";
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
  ResponsiveDialogCloseButton,
} from "@/components/ui/responsive-dialog";
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

  // Block close during submission
  const handleEscapeKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isSubmitting) {
        e.preventDefault();
      }
    },
    [isSubmitting]
  );

  const handlePointerDownOutside = useCallback(
    (e: CustomEvent) => {
      if (isSubmitting) {
        e.preventDefault();
      }
    },
    [isSubmitting]
  );

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent onEscapeKeyDown={handleEscapeKeyDown} onPointerDownOutside={handlePointerDownOutside}>
        {/* Header */}
        <ResponsiveDialogHeader>
          <div className="flex items-center justify-between w-full">
            <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
            <ResponsiveDialogCloseButton disabled={isSubmitting} />
          </div>
          <ResponsiveDialogDescription className="sr-only">
            {isEditMode
              ? `Edytuj nazwę ${EQUIPMENT_TYPE_NOMINATIVE_LABELS[equipmentType].toLowerCase()}`
              : `Wprowadź nazwę nowej ${EQUIPMENT_TYPE_NOMINATIVE_LABELS[equipmentType].toLowerCase()}`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Body */}
        <ResponsiveDialogBody>
          <EquipmentForm
            key={editItem?.id ?? "new"}
            formId={formId}
            defaultValues={editItem ? { name: editItem.name } : undefined}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            serverError={error}
          />
        </ResponsiveDialogBody>

        {/* Footer */}
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Anuluj
            </Button>
          </ResponsiveDialogClose>

          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Zapisywanie..." : submitLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
