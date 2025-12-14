/**
 * CatchesSection - List of catches during the trip.
 */
import React from "react";
import { Fish } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { CatchCard } from "./CatchCard";
import type { CatchesSectionProps } from "../types";

/**
 * Section displaying list of catches or empty state.
 */
export function CatchesSection({ catches, tripId: _tripId }: CatchesSectionProps) {
  const isEmpty = catches.length === 0;

  return (
    <section className="geist-card p-6" aria-labelledby="catches-heading">
      <SectionHeader title="Połowy" count={catches.length} />

      {isEmpty ? (
        <div className="mt-4 rounded-lg bg-secondary/50 border border-border p-6 text-center">
          <Fish className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Brak połowów</p>
          <p className="text-xs text-muted-foreground mt-1">Nie zarejestrowano jeszcze żadnych połowów.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {catches.map((catchItem) => (
            <CatchCard key={catchItem.id} catch={catchItem} />
          ))}
        </div>
      )}
    </section>
  );
}
