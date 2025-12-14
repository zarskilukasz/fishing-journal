/**
 * EmptyState - Component displayed when equipment list is empty.
 * Shows different messages for empty list vs. no search results.
 */
import React from "react";
import { Waves, Sparkles, Cookie, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type EquipmentType, EMPTY_STATE_MESSAGES, SEARCH_EMPTY_STATE_MESSAGES } from "./types";

export interface EmptyStateProps {
  equipmentType: EquipmentType;
  hasSearchQuery: boolean;
  onAddClick: () => void;
}

/** Icons for each equipment type */
const EQUIPMENT_ICONS: Record<EquipmentType, typeof Waves> = {
  rods: Waves,
  lures: Sparkles,
  groundbaits: Cookie,
};

/**
 * Empty state component with gradient border effect.
 */
export const EmptyState = React.memo(function EmptyState({
  equipmentType,
  hasSearchQuery,
  onAddClick,
}: EmptyStateProps) {
  const Icon = hasSearchQuery ? Search : EQUIPMENT_ICONS[equipmentType];
  const messages = EMPTY_STATE_MESSAGES[equipmentType];

  return (
    <div className="gradient-border">
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>

        {/* Title */}
        <h3 className="mt-4 text-base font-medium text-foreground">
          {hasSearchQuery ? "Brak wyników" : messages.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          {hasSearchQuery ? SEARCH_EMPTY_STATE_MESSAGES[equipmentType] : messages.description}
        </p>

        {/* CTA Button - only show when not searching */}
        {!hasSearchQuery && (
          <Button onClick={onAddClick} className="mt-6 rounded-lg" size="default">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Dodaj pierwszy element
          </Button>
        )}
      </div>
    </div>
  );
});
