/**
 * EquipmentSection - Display of trip equipment.
 * Shows rods, lures, and groundbaits as chip groups.
 */
import React from "react";
import { Crosshair, Anchor, Package } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { EquipmentChips } from "./EquipmentChips";
import type { EquipmentSectionProps } from "../types";

/**
 * Equipment section with chip groups for each type.
 */
export function EquipmentSection({ equipment }: EquipmentSectionProps) {
  if (!equipment) {
    return null;
  }

  const hasRods = equipment.rods.length > 0;
  const hasLures = equipment.lures.length > 0;
  const hasGroundbaits = equipment.groundbaits.length > 0;
  const hasAny = hasRods || hasLures || hasGroundbaits;

  if (!hasAny) {
    return null;
  }

  // Map to common format
  const rods = equipment.rods.map((r) => ({ id: r.id, name_snapshot: r.name_snapshot }));
  const lures = equipment.lures.map((l) => ({ id: l.id, name_snapshot: l.name_snapshot }));
  const groundbaits = equipment.groundbaits.map((g) => ({ id: g.id, name_snapshot: g.name_snapshot }));

  return (
    <section className="geist-card p-6" aria-labelledby="equipment-heading">
      <SectionHeader title="Sprzęt" />

      <div className="mt-4 space-y-4">
        {hasRods && <EquipmentChips label="Wędki" items={rods} icon={Crosshair} />}
        {hasLures && <EquipmentChips label="Przynęty" items={lures} icon={Anchor} />}
        {hasGroundbaits && <EquipmentChips label="Zanęty" items={groundbaits} icon={Package} />}
      </div>
    </section>
  );
}
