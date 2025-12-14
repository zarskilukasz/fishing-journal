import React from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  onCreateTrip: () => void;
}

/**
 * Empty state component displayed when user has no trips.
 * Features gradient border effect and encouraging CTA.
 */
export const EmptyState = React.memo(function EmptyState({ onCreateTrip }: EmptyStateProps) {
  return (
    <div className="gradient-border">
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Calendar className="h-8 w-8" aria-hidden="true" />
        </div>

        {/* Title */}
        <h3 className="mt-4 text-base font-medium text-foreground">Brak wypraw</h3>

        {/* Description */}
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nie masz jeszcze żadnych zapisanych wypraw. Rozpocznij swoją pierwszą wyprawę wędkarską.
        </p>

        {/* CTA Button - matches QuickStartFAB dimensions */}
        <Button onClick={onCreateTrip} className="mt-6 rounded-lg" size="default">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nowa wyprawa
        </Button>
      </div>
    </div>
  );
});
