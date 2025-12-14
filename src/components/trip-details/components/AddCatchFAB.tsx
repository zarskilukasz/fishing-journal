/**
 * AddCatchFAB - Floating action button for adding a catch.
 */
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddCatchFABProps } from "../types";

/**
 * FAB for adding a new catch to the trip.
 */
export function AddCatchFAB({ tripId, disabled = false }: AddCatchFABProps) {
  return (
    <Button
      asChild
      size="lg"
      className="fixed bottom-20 right-4 z-40 h-14 gap-2 rounded-xl shadow-lg hover:shadow-glow sm:bottom-6 sm:right-6"
      disabled={disabled}
    >
      <a href={`/app/trips/${tripId}/catches/new`}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Dodaj połów</span>
      </a>
    </Button>
  );
}

