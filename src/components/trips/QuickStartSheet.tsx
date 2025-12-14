import React, { useState, useCallback, useId } from "react";
import { X, MapPin, Briefcase, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickStartTrip } from "@/components/hooks";
import { useIsDesktop } from "@/components/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { TripDto, QuickStartTripResponseDto } from "@/types";

export interface QuickStartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (trip: TripDto) => void;
}

/**
 * Quick start sheet/dialog for creating a new trip.
 * Shows as bottom sheet on mobile, dialog on desktop.
 */
export function QuickStartSheet({ isOpen, onClose, onSuccess }: QuickStartSheetProps) {
  const isDesktop = useIsDesktop();
  const [useGps, setUseGps] = useState(true);
  const [copyEquipment, setCopyEquipment] = useState(true);

  const titleId = useId();
  const descId = useId();
  const gpsCheckboxId = useId();
  const equipmentCheckboxId = useId();

  const handleSuccess = useCallback(
    (response: QuickStartTripResponseDto) => {
      onSuccess(response.trip);
    },
    [onSuccess]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleError = useCallback((_error: Error, _message: string) => {
    // TODO: Show toast/snackbar with error message
  }, []);

  const { quickStart, isLoading, reset } = useQuickStartTrip({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleSubmit = useCallback(() => {
    quickStart({ useGps, copyEquipment });
  }, [quickStart, useGps, copyEquipment]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      reset();
      onClose();
    }
  }, [isLoading, reset, onClose]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        handleClose();
      }
    },
    [isLoading, handleClose]
  );

  if (!isOpen) return null;

  const content = (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            Nowa wyprawa
          </h2>
          <p id={descId} className="text-sm text-muted-foreground mt-1">
            Szybko rozpocznij nową wyprawę wędkarską
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleClose} disabled={isLoading} aria-label="Zamknij">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Options */}
      <div className="space-y-4">
        {/* GPS option */}
        <label
          htmlFor={gpsCheckboxId}
          className={cn(
            "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
            useGps ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-card-hover"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              useGps ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Użyj mojej lokalizacji GPS</p>
            <p className="text-xs text-muted-foreground mt-0.5">Zapisz miejsce rozpoczęcia wyprawy</p>
          </div>
          <input
            type="checkbox"
            id={gpsCheckboxId}
            checked={useGps}
            onChange={(e) => setUseGps(e.target.checked)}
            className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
          />
        </label>

        {/* Copy equipment option */}
        <label
          htmlFor={equipmentCheckboxId}
          className={cn(
            "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
            copyEquipment ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-card-hover"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              copyEquipment ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Kopiuj sprzęt z ostatniej wyprawy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Użyj tych samych wędek, przynęt i zanęt</p>
          </div>
          <input
            type="checkbox"
            id={equipmentCheckboxId}
            checked={copyEquipment}
            onChange={(e) => setCopyEquipment(e.target.checked)}
            className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={handleClose} disabled={isLoading} className="flex-1">
          Anuluj
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Tworzenie...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Rozpocznij</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Desktop: Dialog
  if (isDesktop) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
        {/* Dialog - eslint-disable for keyboard event on dialog is standard pattern */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {content}
        </div>
      </>
    );
  }

  // Mobile: Bottom Sheet
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      {/* Sheet - eslint-disable for keyboard event on dialog is standard pattern */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-lg safe-area-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {content}
      </div>
    </>
  );
}
