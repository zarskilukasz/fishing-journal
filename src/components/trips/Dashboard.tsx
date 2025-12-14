import React, { useState, useCallback } from "react";
import { QueryProvider } from "@/components/providers";
import { TripListSection } from "./TripListSection";
import { QuickStartSheet } from "./QuickStartSheet";
import { QuickStartFAB } from "./QuickStartFAB";
import type { TripDto } from "@/types";

/**
 * Main Dashboard component - wraps trip list with query provider.
 * This is the entry point for the dashboard React island.
 */
export function Dashboard() {
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  const handleOpenQuickStart = useCallback(() => {
    setIsQuickStartOpen(true);
  }, []);

  const handleCloseQuickStart = useCallback(() => {
    setIsQuickStartOpen(false);
  }, []);

  const handleTripCreated = useCallback((trip: TripDto) => {
    setIsQuickStartOpen(false);
    // Navigate to the new trip
    window.location.href = `/app/trips/${trip.id}`;
  }, []);

  return (
    <QueryProvider>
      <div className="space-y-6">
        {/* Welcome section */}
        <WelcomeCard onStartTrip={handleOpenQuickStart} />

        {/* Trip list section */}
        <TripListSection onTripCreated={handleTripCreated} />
      </div>

      {/* FAB for quick start */}
      <QuickStartFAB onClick={handleOpenQuickStart} />

      {/* QuickStart modal */}
      <QuickStartSheet isOpen={isQuickStartOpen} onClose={handleCloseQuickStart} onSuccess={handleTripCreated} />
    </QueryProvider>
  );
}

interface WelcomeCardProps {
  onStartTrip: () => void;
}

/**
 * Welcome card shown at the top of dashboard.
 */
function WelcomeCard({ onStartTrip }: WelcomeCardProps) {
  return (
    <div className="geist-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
          <FishIcon />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Witaj w Dzienniku!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tutaj znajdziesz wszystkie swoje wyprawy wędkarskie. Kliknij przycisk poniżej lub FAB, aby rozpocząć nową.
          </p>
          <button
            onClick={onStartTrip}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Rozpocznij wyprawę →
          </button>
        </div>
      </div>
    </div>
  );
}

function FishIcon() {
  return (
    <svg
      className="h-6 w-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6-3.56 0-7.56-2.53-8.5-6Z" />
      <path d="M18 12v.5" />
      <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
      <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5 .23 6.5C6.58 18.03 7 16 7 13.33" />
      <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" />
      <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />
    </svg>
  );
}
