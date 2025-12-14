/**
 * TripDetailsLoading - Skeleton loading UI for trip details view.
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
 * Loading state skeleton mimicking the trip details layout.
 */
export function TripDetailsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Ładowanie szczegółów wyprawy">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      {/* Summary Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="geist-card p-4">
            <Skeleton className="h-5 w-5 mb-2" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Location Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-28 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Weather Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-24">
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Catches Section Skeleton */}
      <div className="geist-card p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-8" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Section Skeleton */}
      <div className="geist-card p-6">
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-16 mb-2" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
