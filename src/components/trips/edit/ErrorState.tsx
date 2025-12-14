/**
 * ErrorState - Error display with retry option.
 * Shows error message and allows user to retry the operation.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import type { ErrorStateProps } from "./types";

/**
 * Alert circle icon for error state
 */
function AlertCircleIcon() {
  return (
    <svg
      className="h-12 w-12 text-destructive"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Refresh icon for retry button
 */
function RefreshIcon() {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

/**
 * Error state component with retry functionality.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="gradient-border" role="alert" aria-live="assertive">
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircleIcon />
        </div>

        <h3 className="mt-4 text-base font-medium text-foreground">Wystąpił błąd</h3>

        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{message}</p>

        <Button onClick={onRetry} variant="secondary" className="mt-6">
          <RefreshIcon />
          Spróbuj ponownie
        </Button>
      </div>
    </div>
  );
}

export type { ErrorStateProps };
