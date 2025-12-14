/**
 * EquipmentChips - Group of chips for equipment items.
 */
import React from "react";
import type { EquipmentChipsProps } from "../types";

/**
 * Equipment chip group with label and icon.
 */
export function EquipmentChips({ label, items, icon: Icon }: EquipmentChipsProps) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
          >
            {item.name_snapshot}
          </span>
        ))}
      </div>
    </div>
  );
}
