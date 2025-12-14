/**
 * QuickStartSheet - Sheet/dialog for creating a new trip.
 * Responsive: Drawer on mobile, Dialog on desktop.
 */
import React, { useState, useCallback, useId } from "react";
import { MapPin, Briefcase, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickStartTrip } from "@/components/hooks";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogCloseButton,
} from "@/components/ui/responsive-dialog";
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
  const [useGps, setUseGps] = useState(true);
  const [copyEquipment, setCopyEquipment] = useState(true);

  const gpsCheckboxId = useId();
  const equipmentCheckboxId = useId();

  const handleSuccess = useCallback(
    (response: QuickStartTripResponseDto) => {
      onSuccess(response.trip);
    },
    [onSuccess]
  );

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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Block close during loading
  const handleEscapeKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isLoading) {
        e.preventDefault();
      }
    },
    [isLoading]
  );

  const handlePointerDownOutside = useCallback(
    (e: CustomEvent) => {
      if (isLoading) {
        e.preventDefault();
      }
    },
    [isLoading]
  );

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent onEscapeKeyDown={handleEscapeKeyDown} onPointerDownOutside={handlePointerDownOutside}>
        {/* Header */}
        <ResponsiveDialogHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <ResponsiveDialogTitle>Nowa wyprawa</ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="mt-1">
                Szybko rozpocznij nową wyprawę wędkarską
              </ResponsiveDialogDescription>
            </div>
            <ResponsiveDialogCloseButton disabled={isLoading} />
          </div>
        </ResponsiveDialogHeader>

        {/* Body - Options */}
        <ResponsiveDialogBody className="space-y-4">
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
        </ResponsiveDialogBody>

        {/* Footer */}
        <ResponsiveDialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
