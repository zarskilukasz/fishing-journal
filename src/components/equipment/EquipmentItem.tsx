/**
 * EquipmentItem - Single equipment list item with actions.
 * Shows edit/delete buttons on hover (desktop) or always visible (mobile).
 */
import React, { useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EquipmentDto } from "./types";

export interface EquipmentItemProps {
  item: EquipmentDto;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Format date to Polish locale string.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Single equipment list item with hover actions.
 */
export const EquipmentItem = React.memo(function EquipmentItem({ item, onEdit, onDelete }: EquipmentItemProps) {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit();
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete]
  );

  return (
    <li className={cn("group geist-card-glow", "flex items-center justify-between gap-4", "cursor-default")}>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
        <p className="text-xs text-muted-foreground">Dodano: {formatDate(item.created_at)}</p>
      </div>

      {/* Actions - visible on hover (desktop) or always (mobile) */}
      <div
        className={cn(
          "flex items-center gap-1",
          // Mobile: always visible
          "opacity-100",
          // Desktop: show on hover
          "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          "transition-opacity duration-200"
        )}
      >
        <Button variant="ghost" size="icon-sm" onClick={handleEdit} aria-label={`Edytuj ${item.name}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Usuń ${item.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
});
