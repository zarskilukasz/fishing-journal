/**
 * TripForm - Main form component for editing trip data.
 * Uses react-hook-form with Zod validation.
 */
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { tripEditFormSchema, type TripEditFormData } from "@/lib/schemas/trip-edit.schema";
import { DateTimeSection } from "./DateTimeSection";
import { LocationSection } from "./LocationSection";
import { EquipmentSection } from "./EquipmentSection";
import { WeatherWarningDialog } from "./WeatherWarningDialog";
import type { TripFormProps } from "./types";

/**
 * Loader icon for submit button
 */
function LoaderIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * Main trip edit form component.
 */
export function TripForm({
  initialData,
  availableEquipment,
  onSubmit,
  onCancel,
  isSubmitting,
  showWeatherWarning,
  onWeatherWarningConfirm,
  onWeatherWarningCancel,
}: TripFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TripEditFormData>({
    resolver: zodResolver(tripEditFormSchema),
    defaultValues: initialData,
    mode: "onBlur",
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
        {/* Date/Time Section */}
        <DateTimeSection control={control} errors={errors} />

        {/* Location Section */}
        <LocationSection control={control} errors={errors} />

        {/* Equipment Section */}
        <EquipmentSection
          control={control}
          availableRods={availableEquipment.rods}
          availableLures={availableEquipment.lures}
          availableGroundbaits={availableEquipment.groundbaits}
        />

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <LoaderIcon />
                Zapisywanie...
              </>
            ) : (
              "Zapisz zmiany"
            )}
          </Button>
        </div>
      </form>

      {/* Weather Warning Dialog */}
      <WeatherWarningDialog
        open={showWeatherWarning}
        onConfirm={onWeatherWarningConfirm}
        onCancel={onWeatherWarningCancel}
      />
    </>
  );
}

export type { TripFormProps };
