/**
 * EquipmentTabs - Tab bar for switching between equipment categories.
 * Uses MD3-style tabs with icons.
 */
import React, { useCallback } from "react";
import { Waves, Sparkles, Cookie } from "lucide-react";
import { cn } from "@/lib/utils";
import { type EquipmentType, EQUIPMENT_TYPE_LABELS } from "./types";

export interface EquipmentTabsProps {
  activeTab: EquipmentType;
  onTabChange: (tab: EquipmentType) => void;
  counts?: Partial<Record<EquipmentType, number>>;
}

/** Tab configuration */
const TABS: { type: EquipmentType; icon: typeof Waves }[] = [
  { type: "rods", icon: Waves },
  { type: "lures", icon: Sparkles },
  { type: "groundbaits", icon: Cookie },
];

/**
 * Tab button component.
 */
function TabButton({
  type,
  icon: Icon,
  isActive,
  count,
  onClick,
}: {
  type: EquipmentType;
  icon: typeof Waves;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${type}`}
      id={`tab-${type}`}
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-3",
        "text-sm font-medium transition-all duration-200",
        "border-b-2 -mb-px",
        isActive
          ? "text-primary border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{EQUIPMENT_TYPE_LABELS[type]}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.5 text-xs rounded-full",
            isActive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Equipment tabs component for category switching.
 */
export const EquipmentTabs = React.memo(function EquipmentTabs({ activeTab, onTabChange, counts }: EquipmentTabsProps) {
  const handleTabClick = useCallback(
    (type: EquipmentType) => () => {
      if (type !== activeTab) {
        onTabChange(type);
      }
    },
    [activeTab, onTabChange]
  );

  return (
    <div role="tablist" aria-label="Kategorie sprzętu" className="flex border-b border-border">
      {TABS.map(({ type, icon }) => (
        <TabButton
          key={type}
          type={type}
          icon={icon}
          isActive={activeTab === type}
          count={counts?.[type]}
          onClick={handleTabClick(type)}
        />
      ))}
    </div>
  );
});
