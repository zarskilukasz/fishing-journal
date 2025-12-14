/**
 * TripSummaryGrid - Grid of statistics cards.
 * Shows duration, catch count, total weight, and biggest catch.
 */
import React, { useMemo } from "react";
import { Clock, Fish, Scale, Trophy } from "lucide-react";
import { StatCard } from "./StatCard";
import type { TripSummaryGridProps } from "../types";
import type { CatchInTripDto } from "@/types";

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/**
 * Format weight in grams to human-readable string
 */
function formatWeight(grams: number): string {
  if (grams === 0) return "-";
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

/**
 * Calculate summary statistics from trip data
 */
function calculateStats(startedAt: string, endedAt: string | null, status: string, catches: CatchInTripDto[]) {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : status === "active" ? new Date() : null;

  const durationMinutes = end ? Math.floor((end.getTime() - start.getTime()) / 60000) : null;

  const totalWeightG = catches.reduce((sum, c) => sum + (c.weight_g ?? 0), 0);
  const biggestCatch = catches.reduce<number | null>((max, c) => {
    if (c.weight_g === null) return max;
    return max === null ? c.weight_g : Math.max(max, c.weight_g);
  }, null);

  return {
    durationMinutes,
    catchCount: catches.length,
    totalWeightG,
    biggestCatchWeightG: biggestCatch,
  };
}

/**
 * Grid of 4 statistic cards for trip summary.
 */
export function TripSummaryGrid({ startedAt, endedAt, status, catches }: TripSummaryGridProps) {
  const stats = useMemo(
    () => calculateStats(startedAt, endedAt, status, catches),
    [startedAt, endedAt, status, catches]
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard icon={Clock} label="Czas trwania" value={formatDuration(stats.durationMinutes)} />
      <StatCard icon={Fish} label="Połowy" value={stats.catchCount.toString()} />
      <StatCard icon={Scale} label="Łączna waga" value={formatWeight(stats.totalWeightG)} />
      <StatCard
        icon={Trophy}
        label="Największa"
        value={stats.biggestCatchWeightG ? formatWeight(stats.biggestCatchWeightG) : "-"}
      />
    </div>
  );
}
