/**
 * DeleteConfirmDialog - Confirmation dialog for deleting equipment.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import { AlertTriangle, Loader2 } from "lucide-react";
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
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader className="flex-col items-center pt-6">
          {/* Warning icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="text-center">
          <ResponsiveDialogTitle className="text-lg">Usuń &ldquo;{item?.name}&rdquo;?</ResponsiveDialogTitle>

          <ResponsiveDialogDescription className="mt-2">
            Element zostanie ukryty, ale zachowany w historycznych wyprawach.
          </ResponsiveDialogDescription>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Anuluj
            </Button>
          </ResponsiveDialogClose>

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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
