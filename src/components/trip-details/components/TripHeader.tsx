/**
 * TripHeader - Header section for trip details.
 * Shows dates, status badge, and actions menu.
 */
import React, { useState, useCallback } from "react";
import { MoreVertical, Edit, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import type { TripHeaderProps } from "../types";

/**
 * Format date range for display
 */
function formatDateRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const startStr = start.toLocaleDateString("pl-PL", formatOptions);

  if (!endedAt) {
    return `Od ${startStr}`;
  }

  const end = new Date(endedAt);
  const endStr = end.toLocaleDateString("pl-PL", formatOptions);

  // Check if same day
  if (start.toDateString() === end.toDateString()) {
    return `${start.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}, ${start.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${startStr} - ${endStr}`;
}

/**
 * Trip header with status, dates, and actions menu.
 */
export function TripHeader({ trip, onClose, onDelete, isClosing, isDeleting, canClose }: TripHeaderProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleEditClick = useCallback(() => {
    window.location.href = `/app/trips/${trip.id}/edit`;
  }, [trip.id]);

  const handleCloseConfirm = useCallback(() => {
    onClose();
    setShowCloseDialog(false);
  }, [onClose]);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setShowDeleteDialog(false);
  }, [onDelete]);

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <StatusBadge status={trip.status} />
        <span className="text-sm text-muted-foreground">{formatDateRange(trip.started_at, trip.ended_at)}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Opcje wyprawy">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEditClick}>
            <Edit />
            Edytuj
          </DropdownMenuItem>

          {canClose && (
            <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
              <XCircle />
              Zakończ wyprawę
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Close Trip Dialog */}
      <ConfirmDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        title="Zakończ wyprawę"
        description="Czy na pewno chcesz zamknąć tę wyprawę? Data zakończenia zostanie ustawiona na obecny czas."
        confirmLabel="Zakończ wyprawę"
        onConfirm={handleCloseConfirm}
        isLoading={isClosing}
        variant="default"
      />

      {/* Delete Trip Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Usuń wyprawę"
        description="Czy na pewno chcesz usunąć tę wyprawę? Ta operacja jest nieodwracalna."
        confirmLabel="Usuń"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        variant="destructive"
      />
    </header>
  );
}
