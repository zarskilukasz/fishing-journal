/**
 * CatchDetailError - Error display for catch detail view.
 * Shows error message with options to retry or go back.
 */
import React from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatchDetailErrorProps } from "../types";

/**
 * Error state component with retry and navigation functionality.
 */
export function CatchDetailError({ error, onRetry }: CatchDetailErrorProps) {
  const isNotFound = error.code === "not_found";

  return (
    <div className="gradient-border" role="alert" aria-live="assertive">
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {isNotFound ? "Połów nie został znaleziony" : "Wystąpił błąd"}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{error.message}</p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" asChild>
            <a href="/app">
              <ArrowLeft className="h-4 w-4" />
              Wróć do wypraw
            </a>
          </Button>

          {onRetry && !isNotFound && (
            <Button onClick={onRetry} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
