/**
 * EquipmentToolbar - Toolbar with search input and add button.
 */
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "./SearchInput";
import { EQUIPMENT_TYPE_SINGULAR_LABELS, type EquipmentType } from "./types";

export interface EquipmentToolbarProps {
  equipmentType: EquipmentType;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
  isLoading?: boolean;
}

/**
 * Toolbar component with search and add functionality.
 */
export const EquipmentToolbar = React.memo(function EquipmentToolbar({
  equipmentType,
  searchQuery,
  onSearchChange,
  onAddClick,
  isLoading = false,
}: EquipmentToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <SearchInput value={searchQuery} onChange={onSearchChange} placeholder="Szukaj..." className="flex-1" />

      <Button onClick={onAddClick} disabled={isLoading}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Dodaj {EQUIPMENT_TYPE_SINGULAR_LABELS[equipmentType]}</span>
        <span className="sm:hidden">Dodaj</span>
      </Button>
    </div>
  );
});
