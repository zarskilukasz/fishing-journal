/**
 * Types for Equipment management view (/app/equipment)
 */
import type { RodDto, LureDto, GroundbaitDto } from "@/types";

/** Equipment category type */
export type EquipmentType = "rods" | "lures" | "groundbaits";

/** Union type for all equipment DTOs */
export type EquipmentDto = RodDto | LureDto | GroundbaitDto;

/** Mapping of equipment type to Polish label (plural) */
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  rods: "Wędki",
  lures: "Przynęty",
  groundbaits: "Zanęty",
};

/** Mapping of equipment type to Polish label (singular, accusative) */
export const EQUIPMENT_TYPE_SINGULAR_LABELS: Record<EquipmentType, string> = {
  rods: "wędkę",
  lures: "przynętę",
  groundbaits: "zanętę",
};

/** Mapping of equipment type to Polish label (singular, nominative) */
export const EQUIPMENT_TYPE_NOMINATIVE_LABELS: Record<EquipmentType, string> = {
  rods: "Wędka",
  lures: "Przynęta",
  groundbaits: "Zanęta",
};

/** Empty state messages per equipment type */
export const EMPTY_STATE_MESSAGES: Record<EquipmentType, { title: string; description: string }> = {
  rods: {
    title: "Brak wędek",
    description: "Nie masz jeszcze żadnych wędek. Dodaj pierwszą wędkę, aby móc ją przypisać do wypraw.",
  },
  lures: {
    title: "Brak przynęt",
    description: "Nie masz jeszcze żadnych przynęt. Dodaj pierwszą przynętę, aby móc ją przypisać do połowów.",
  },
  groundbaits: {
    title: "Brak zanęt",
    description: "Nie masz jeszcze żadnych zanęt. Dodaj pierwszą zanętę, aby móc ją przypisać do połowów.",
  },
};

/** Search empty state messages */
export const SEARCH_EMPTY_STATE_MESSAGES: Record<EquipmentType, string> = {
  rods: "Nie znaleziono wędek pasujących do wyszukiwania.",
  lures: "Nie znaleziono przynęt pasujących do wyszukiwania.",
  groundbaits: "Nie znaleziono zanęt pasujących do wyszukiwania.",
};

/** Equipment form values */
export interface EquipmentFormValues {
  name: string;
}

/** Query parameters for equipment list */
export interface EquipmentListQueryParams {
  q?: string;
  include_deleted?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "name" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}

/** State for equipment list (from hook) */
export interface EquipmentListState {
  items: EquipmentDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

/** Form dialog state */
export interface FormDialogState {
  isOpen: boolean;
  editItem: EquipmentDto | null; // null = create mode
}

/** Delete dialog state */
export interface DeleteDialogState {
  isOpen: boolean;
  item: EquipmentDto | null;
}

/** Equipment view state */
export interface EquipmentViewState {
  activeTab: EquipmentType;
  searchQuery: string;
  formDialog: FormDialogState;
  deleteDialog: DeleteDialogState;
}
