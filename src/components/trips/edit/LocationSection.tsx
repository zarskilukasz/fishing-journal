/**
 * LocationSection - Form section for location management.
 * Contains GPS location picker and location label input.
 */
import React, { useState, useCallback } from "react";
import { Controller, type ControllerRenderProps } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LocationSectionProps } from "./types";
import type { TripEditFormData } from "@/lib/schemas/trip-edit.schema";

/**
 * Map pin icon
 */
function MapPinIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/**
 * Navigation/GPS icon
 */
function NavigationIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

/**
 * Trash icon for remove button
 */
function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

/**
 * Props for inner location field component
 */
interface LocationFieldProps {
  field: ControllerRenderProps<TripEditFormData, "location">;
  locationError?: string;
}

/**
 * Inner component for location field to properly use hooks
 */
function LocationField({ field, locationError }: LocationFieldProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGetGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError("Twoja przeglądarka nie wspiera geolokalizacji");
      return;
    }

    setIsGettingLocation(true);
    setGpsError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });

      field.onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label: field.value?.label ?? "",
      });
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError("Odmówiono dostępu do lokalizacji");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError("Lokalizacja niedostępna");
            break;
          case error.TIMEOUT:
            setGpsError("Przekroczono czas oczekiwania na lokalizację");
            break;
          default:
            setGpsError("Nie udało się pobrać lokalizacji");
        }
      } else {
        setGpsError("Nie udało się pobrać lokalizacji");
      }
    } finally {
      setIsGettingLocation(false);
    }
  }, [field]);

  const handleClearLocation = useCallback(() => {
    field.onChange(null);
    setGpsError(null);
  }, [field]);

  return (
    <div className="space-y-4">
      {/* Location display / actions */}
      <div className="space-y-3">
        {field.value ? (
          <>
            {/* Coordinates display */}
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Współrzędne</p>
                  <p className="text-sm font-mono">
                    {field.value.lat.toFixed(6)}, {field.value.lng.toFixed(6)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClearLocation}
                  aria-label="Usuń lokalizację"
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>

            {/* Location label */}
            <div className="space-y-2">
              <Label htmlFor="location_label">Nazwa miejsca</Label>
              <Input
                id="location_label"
                type="text"
                value={field.value.label}
                onChange={(e) =>
                  field.onChange({
                    ...field.value,
                    label: e.target.value,
                  })
                }
                placeholder="np. Jezioro Łuknajno, pomost nr 3"
                maxLength={255}
                aria-invalid={!!locationError}
                aria-describedby={locationError ? "location-error" : undefined}
              />
              {locationError && (
                <p id="location-error" className="text-sm text-destructive">
                  {locationError}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* No location set */}
            <div className="bg-secondary rounded-lg p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <MapPinIcon />
              </div>
              <p className="text-sm text-muted-foreground mb-4">Nie ustawiono lokalizacji</p>
              <Button type="button" variant="secondary" onClick={handleGetGPS} disabled={isGettingLocation}>
                <NavigationIcon />
                {isGettingLocation ? "Pobieranie..." : "Użyj mojej lokalizacji"}
              </Button>
            </div>
          </>
        )}

        {/* GPS Error */}
        {gpsError && (
          <p className="text-sm text-destructive" role="alert">
            {gpsError}
          </p>
        )}

        {/* Update location button (when location exists) */}
        {field.value && (
          <Button
            type="button"
            variant="outline"
            onClick={handleGetGPS}
            disabled={isGettingLocation}
            className="w-full"
          >
            <NavigationIcon />
            {isGettingLocation ? "Pobieranie..." : "Zaktualizuj lokalizację"}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Location section with coordinates and label.
 */
export function LocationSection({ control, errors }: LocationSectionProps) {
  // Extract location error message
  const locationError =
    errors.location && typeof errors.location === "object" && "label" in errors.location
      ? (errors.location as { label?: { message?: string } }).label?.message
      : errors.location?.message;

  return (
    <section className="geist-card p-6" aria-labelledby="location-section-title">
      <h3 id="location-section-title" className="text-base font-medium mb-4 flex items-center gap-2">
        <MapPinIcon />
        Lokalizacja
      </h3>

      <Controller
        name="location"
        control={control}
        render={({ field }) => <LocationField field={field} locationError={locationError} />}
      />
    </section>
  );
}

export type { LocationSectionProps };
