/**
 * EquipmentList - List of equipment items.
 */
import React, { useCallback } from "react";
import { EquipmentItem } from "./EquipmentItem";
import type { EquipmentDto } from "./types";

export interface EquipmentListProps {
  items: EquipmentDto[];
  onEdit: (item: EquipmentDto) => void;
  onDelete: (item: EquipmentDto) => void;
}

/**
 * Equipment list component.
 */
export const EquipmentList = React.memo(function EquipmentList({ items, onEdit, onDelete }: EquipmentListProps) {
  const handleEdit = useCallback((item: EquipmentDto) => () => onEdit(item), [onEdit]);

  const handleDelete = useCallback((item: EquipmentDto) => () => onDelete(item), [onDelete]);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <EquipmentItem key={item.id} item={item} onEdit={handleEdit(item)} onDelete={handleDelete(item)} />
      ))}
    </ul>
  );
});
