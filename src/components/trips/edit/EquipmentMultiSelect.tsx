/**
 * EquipmentMultiSelect - Multi-select component with search and chips.
 * Used for selecting multiple equipment items (rods, lures, groundbaits).
 */
import React, { useState, useCallback, useMemo, useId } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EquipmentMultiSelectProps, EquipmentItem } from "./types";

/**
 * Chevron down icon
 */
function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * X icon for removing items
 */
function XIcon() {
  return (
    <svg
      className="h-3 w-3"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Check icon for selected items
 */
function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Multi-select component for equipment with search and chips display.
 */
export function EquipmentMultiSelect<T extends EquipmentItem>({
  label,
  placeholder,
  items,
  selectedIds,
  onChange,
  disabled = false,
  getItemId,
  getItemName,
}: EquipmentMultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownId = useId();
  const labelId = useId();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => getItemName(item).toLowerCase().includes(query));
  }, [items, searchQuery, getItemName]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  // Toggle item selection
  const toggleItem = useCallback(
    (item: T) => {
      const itemId = getItemId(item);
      if (selectedIds.includes(itemId)) {
        onChange(selectedIds.filter((id) => id !== itemId));
      } else {
        onChange([...selectedIds, itemId]);
      }
    },
    [selectedIds, onChange, getItemId]
  );

  // Remove item from selection
  const removeItem = useCallback(
    (itemId: string) => {
      onChange(selectedIds.filter((id) => id !== itemId));
    },
    [selectedIds, onChange]
  );

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <div className="space-y-2">
      <Label id={labelId}>{label}</Label>

      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label={`Wybrane ${label.toLowerCase()}`}>
          {selectedItems.map((item) => (
            <span
              key={getItemId(item)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
              role="listitem"
            >
              {getItemName(item)}
              <button
                type="button"
                onClick={() => removeItem(getItemId(item))}
                className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                aria-label={`Usuń ${getItemName(item)}`}
                disabled={disabled}
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger and menu */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal bg-[#ffffff]"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={labelId}
          aria-controls={dropdownId}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronDownIcon />
        </Button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={handleClickOutside} aria-hidden="true" />

            {/* Menu */}
            <div
              id={dropdownId}
              role="listbox"
              aria-labelledby={labelId}
              aria-multiselectable="true"
              className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-auto"
            >
              {/* Search input */}
              <div className="p-2 border-b border-border sticky top-0 bg-card">
                <Input
                  type="text"
                  placeholder="Szukaj..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>

              {/* Items list */}
              <div className="p-1">
                {filteredItems.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {items.length === 0 ? "Brak dostępnych elementów" : "Brak wyników"}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const itemId = getItemId(item);
                    const isSelected = selectedIds.includes(itemId);

                    return (
                      <button
                        key={itemId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => toggleItem(item)}
                        className={`
                          w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left
                          transition-colors
                          ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"}
                        `}
                      >
                        <span
                          className={`
                            flex h-4 w-4 items-center justify-center rounded border
                            ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"}
                          `}
                        >
                          {isSelected && <CheckIcon />}
                        </span>
                        {getItemName(item)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export type { EquipmentMultiSelectProps };
