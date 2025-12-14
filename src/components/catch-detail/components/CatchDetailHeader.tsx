/**
 * CatchDetailHeader - Header with species name and action menu.
 * Provides edit and delete actions via dropdown menu.
 */
import React, { useState, useCallback } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/trip-details/components/ConfirmDialog";
import type { CatchDetailHeaderProps } from "../types";

/**
 * Header component with species name and actions dropdown.
 */
export function CatchDetailHeader({ speciesName, onEdit, onDelete, isDeleting }: CatchDetailHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setShowDeleteDialog(false);
  }, [onDelete]);

  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold text-foreground truncate">{speciesName}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Opcje połowu">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4" />
            Edytuj
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Catch Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Usuń połów"
        description="Czy na pewno chcesz usunąć ten połów? Ta operacja jest nieodwracalna."
        confirmLabel="Usuń"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        variant="destructive"
      />
    </header>
  );
}
