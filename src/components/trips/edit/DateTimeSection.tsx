/**
 * DateTimeSection - Form section for date/time fields.
 * Contains start and end datetime pickers.
 */
import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDateTimeForInput, parseDateTimeFromInput } from "./utils";
import type { DateTimeSectionProps } from "./types";

/**
 * Calendar icon for datetime inputs
 */
function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * DateTime section with start and end date pickers.
 */
export function DateTimeSection({ control, errors, onDateChange }: DateTimeSectionProps) {
  return (
    <section className="geist-card p-6" aria-labelledby="datetime-section-title">
      <h3 id="datetime-section-title" className="text-base font-medium mb-4 flex items-center gap-2">
        <CalendarIcon />
        Data i czas
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Start Date/Time */}
        <Controller
          name="started_at"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="started_at">
                Data rozpoczęcia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="started_at"
                type="datetime-local"
                value={formatDateTimeForInput(field.value)}
                onChange={(e) => {
                  const date = parseDateTimeFromInput(e.target.value);
                  if (date) {
                    field.onChange(date);
                    onDateChange?.("started_at");
                  }
                }}
                aria-invalid={!!errors.started_at}
                aria-describedby={errors.started_at ? "started_at-error" : undefined}
              />
              {errors.started_at && (
                <p id="started_at-error" className="text-sm text-destructive">
                  {errors.started_at.message}
                </p>
              )}
            </div>
          )}
        />

        {/* End Date/Time */}
        <Controller
          name="ended_at"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="ended_at">Data zakończenia</Label>
              <div className="flex gap-2">
                <Input
                  id="ended_at"
                  type="datetime-local"
                  value={formatDateTimeForInput(field.value)}
                  onChange={(e) => {
                    const date = parseDateTimeFromInput(e.target.value);
                    field.onChange(date);
                    onDateChange?.("ended_at");
                  }}
                  aria-invalid={!!errors.ended_at}
                  aria-describedby={errors.ended_at ? "ended_at-error" : undefined}
                  className="flex-1"
                />
                {field.value && (
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange(null);
                      onDateChange?.("ended_at");
                    }}
                    className="h-10 w-10 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    aria-label="Wyczyść datę zakończenia"
                  >
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
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              {errors.ended_at && (
                <p id="ended_at-error" className="text-sm text-destructive">
                  {errors.ended_at.message}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </section>
  );
}

export type { DateTimeSectionProps };
