/**
 * CatchDetailLoading - Skeleton loading UI for catch detail view.
 * Displays placeholder elements while data is being fetched.
 */
import React from "react";

/**
 * Skeleton component for loading animations
 */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} aria-hidden="true" />;
}

/**
 * Loading state skeleton mimicking the catch details layout.
 */
export function CatchDetailLoading() {
  return (
    <div className="space-y-6 pb-24" aria-busy="true" aria-label="Ładowanie szczegółów połowu">
      {/* Info Section Skeleton */}
      <div className="geist-card p-6 space-y-4">
        {/* Species name */}
        <Skeleton className="h-8 w-48" />

        {/* Details row */}
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Equipment Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-6 w-20 mb-4" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </div>

      {/* Photo Section Skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
    </div>
  );
}
