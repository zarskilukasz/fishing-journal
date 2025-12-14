/**
 * WeatherWarningDialog - Alert dialog for date change warning.
 * Informs user that changing dates may invalidate weather data.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import type { WeatherWarningDialogProps } from "./types";

/**
 * Alert triangle icon
 */
function AlertTriangleIcon() {
  return (
    <svg
      className="h-6 w-6 text-warning"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/**
 * Weather warning dialog component.
 * Shows when user changes trip dates.
 */
export function WeatherWarningDialog({ open, onConfirm, onCancel }: WeatherWarningDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="weather-warning-title"
        aria-describedby="weather-warning-description"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <AlertTriangleIcon />
            </div>
            <div className="flex-1">
              <h2 id="weather-warning-title" className="text-lg font-semibold text-foreground">
                Zmiana dat wyprawy
              </h2>
              <p id="weather-warning-description" className="mt-2 text-sm text-muted-foreground">
                Zmieniłeś daty wyprawy. Automatycznie pobrane dane pogodowe mogą stać się nieaktualne i zostać usunięte.
                Czy na pewno chcesz kontynuować?
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
            <Button type="button" onClick={onConfirm}>
              Kontynuuj
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export type { WeatherWarningDialogProps };
