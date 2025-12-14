/**
 * WeatherRefreshButton - Button to trigger weather refresh from external API.
 * Supports two variants: icon-only and full button with text.
 */
import React from "react";
import { RefreshCw, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeatherRefreshButtonProps {
  /** Click handler to trigger refresh */
  onClick: () => void;
  /** Whether refresh is currently in progress */
  isLoading: boolean;
  /** Whether button is disabled (e.g., no location) */
  disabled?: boolean;
  /** Button variant: icon-only or full with text */
  variant?: "icon" | "full";
}

/**
 * Button to trigger weather refresh from API
 */
export function WeatherRefreshButton({
  onClick,
  isLoading,
  disabled = false,
  variant = "icon",
}: WeatherRefreshButtonProps) {
  if (variant === "full") {
    return (
      <Button onClick={onClick} disabled={disabled || isLoading} size="sm" variant="secondary" className="gap-2">
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            Pobieranie...
          </>
        ) : (
          <>
            <CloudDownload className="h-4 w-4" aria-hidden="true" />
            Pobierz pogodę
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      aria-label={isLoading ? "Pobieranie pogody..." : "Odśwież pogodę"}
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
    </Button>
  );
}
