/**
 * WeatherWarningDialog - Alert dialog for date change warning.
 * Informs user that changing dates may invalidate weather data.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
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
  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onCancel();
      }
    },
    [onCancel]
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader className="flex-col items-start gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
            <AlertTriangleIcon />
          </div>
          <div className="flex-1">
            <ResponsiveDialogTitle>Zmiana dat wyprawy</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="mt-2">
              Zmieniłeś daty wyprawy. Automatycznie pobrane dane pogodowe mogą stać się nieaktualne i zostać usunięte.
              Czy na pewno chcesz kontynuować?
            </ResponsiveDialogDescription>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
          <Button type="button" onClick={onConfirm}>
            Kontynuuj
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export type { WeatherWarningDialogProps };
