/**
 * LoadingState - Skeleton loading UI for trip edit view.
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
 * Loading state skeleton mimicking the trip edit form layout.
 */
export function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Ładowanie formularza edycji">
      {/* DateTime Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Location Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-28 mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Equipment Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
