/**
 * EquipmentSection - Form section for equipment selection.
 * Contains multiselect components for rods, lures, and groundbaits.
 */
import React from "react";
import { Controller } from "react-hook-form";
import { EquipmentMultiSelect } from "./EquipmentMultiSelect";
import type { EquipmentSectionProps } from "./types";
import type { RodDto, LureDto, GroundbaitDto } from "@/types";

/**
 * Wrench/settings icon for equipment section
 */
function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Equipment section with multiselect for rods, lures, and groundbaits.
 */
export function EquipmentSection({
  control,
  availableRods,
  availableLures,
  availableGroundbaits,
}: EquipmentSectionProps) {
  // Filter out deleted equipment
  const activeRods = availableRods.filter((r) => !r.deleted_at);
  const activeLures = availableLures.filter((l) => !l.deleted_at);
  const activeGroundbaits = availableGroundbaits.filter((g) => !g.deleted_at);

  return (
    <section className="geist-card p-6" aria-labelledby="equipment-section-title">
      <h3 id="equipment-section-title" className="text-base font-medium mb-4 flex items-center gap-2">
        <SettingsIcon />
        Sprzęt
      </h3>

      <div className="space-y-4">
        {/* Rods */}
        <Controller
          name="selectedRodIds"
          control={control}
          render={({ field }) => (
            <EquipmentMultiSelect
              label="Wędki"
              placeholder="Wybierz wędki..."
              items={activeRods}
              selectedIds={field.value}
              onChange={field.onChange}
              getItemId={(rod: RodDto) => rod.id}
              getItemName={(rod: RodDto) => rod.name}
            />
          )}
        />

        {/* Lures */}
        <Controller
          name="selectedLureIds"
          control={control}
          render={({ field }) => (
            <EquipmentMultiSelect
              label="Przynęty"
              placeholder="Wybierz przynęty..."
              items={activeLures}
              selectedIds={field.value}
              onChange={field.onChange}
              getItemId={(lure: LureDto) => lure.id}
              getItemName={(lure: LureDto) => lure.name}
            />
          )}
        />

        {/* Groundbaits */}
        <Controller
          name="selectedGroundbaitIds"
          control={control}
          render={({ field }) => (
            <EquipmentMultiSelect
              label="Zanęty"
              placeholder="Wybierz zanęty..."
              items={activeGroundbaits}
              selectedIds={field.value}
              onChange={field.onChange}
              getItemId={(groundbait: GroundbaitDto) => groundbait.id}
              getItemName={(groundbait: GroundbaitDto) => groundbait.name}
            />
          )}
        />

        {/* Empty state hint */}
        {activeRods.length === 0 && activeLures.length === 0 && activeGroundbaits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nie masz jeszcze żadnego sprzętu.{" "}
            <a href="/app/equipment" className="text-primary hover:underline">
              Dodaj sprzęt
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

export type { EquipmentSectionProps };
