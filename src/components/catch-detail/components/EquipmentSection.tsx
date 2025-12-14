/**
 * EquipmentSection - Displays lure and groundbait used for the catch.
 * Shows equipment as chips/badges.
 */
import React from "react";
import { Anchor, Package } from "lucide-react";
import type { EquipmentSectionProps } from "../types";

/**
 * Equipment section showing lure and groundbait.
 */
export function EquipmentSection({ lureName, groundbaitName }: EquipmentSectionProps) {
  const hasEquipment = lureName || groundbaitName;

  return (
    <div className="geist-card p-6">
      <h2 className="text-lg font-medium text-foreground mb-4">Sprzęt</h2>

      {hasEquipment ? (
        <div className="flex flex-wrap gap-2">
          {lureName && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm text-foreground">
              <Anchor className="h-4 w-4" aria-hidden="true" />
              {lureName}
            </span>
          )}
          {groundbaitName && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm text-foreground">
              <Package className="h-4 w-4" aria-hidden="true" />
              {groundbaitName}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Brak informacji o sprzęcie</p>
      )}
    </div>
  );
}
