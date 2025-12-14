import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/trips";

export interface ErrorBannerProps {
  error: Error;
  onRetry?: () => void;
}

/**
 * Error banner component for displaying API errors.
 */
export const ErrorBanner = React.memo(function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const message = getApiErrorMessage(error);

  return (
    <div className="geist-card border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Wystąpił błąd</p>
          <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
        </div>

        {/* Retry button */}
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Spróbuj ponownie</span>
          </Button>
        )}
      </div>
    </div>
  );
});
