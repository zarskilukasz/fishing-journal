/**
 * Photo upload component for catch form.
 * Supports drag & drop, preview, and progress bar.
 */
import * as React from "react";
import { Camera, X, Loader2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PhotoUploadState } from "./types";

export interface PhotoUploadProps {
  /** Current upload state */
  state: PhotoUploadState;
  /** Handle file selection */
  onFileSelect: (file: File | null) => void;
  /** Handle photo deletion (for existing photos) */
  onDelete?: () => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show label */
  showLabel?: boolean;
}

/**
 * Allowed file types
 */
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp";

/**
 * Photo upload with drag & drop and preview.
 */
export const PhotoUpload = React.memo(function PhotoUpload({
  state,
  onFileSelect,
  onDelete,
  error,
  disabled,
  showLabel = true,
}: PhotoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Handle file input change
  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [onFileSelect]
  );

  // Handle click on dropzone
  const handleClick = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Handle remove
  const handleRemove = React.useCallback(() => {
    onFileSelect(null);
    onDelete?.();
  }, [onFileSelect, onDelete]);

  // Drag handlers
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  // Determine what to show
  const hasPreview = !!state.previewUrl;
  const isProcessing = state.status === "resizing" || state.status === "uploading" || state.status === "deleting";
  const hasError = state.status === "error" || !!error;

  return (
    <div className="space-y-2">
      {showLabel && <Label className={hasError ? "text-destructive" : undefined}>Zdjęcie</Label>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
        className="sr-only"
        aria-label="Wybierz zdjęcie"
      />

      {hasPreview ? (
        // Preview mode
        <div className="relative">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
            <img src={state.previewUrl ?? ""} alt="Podgląd zdjęcia" className="h-full w-full object-cover" />

            {/* Overlay for processing states */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {state.status === "resizing" && "Przetwarzanie..."}
                  {state.status === "uploading" && `Wysyłanie... ${state.progress}%`}
                  {state.status === "deleting" && "Usuwanie..."}
                </p>
                {state.status === "uploading" && (
                  <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remove button */}
          {!isProcessing && (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="absolute right-2 top-2"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Usuń zdjęcie</span>
            </Button>
          )}
        </div>
      ) : (
        // Dropzone mode
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={disabled || isProcessing ? undefined : handleClick}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled && !isProcessing) {
              handleClick();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8",
            "transition-colors duration-200 cursor-pointer",
            isDragging && "border-primary bg-primary/5",
            !isDragging && "border-border hover:border-border-hover hover:bg-secondary/50",
            (disabled || isProcessing) && "cursor-not-allowed opacity-50",
            hasError && "border-destructive"
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <AlertCircle className="h-10 w-10 text-destructive" />
          ) : (
            <Camera className="h-10 w-10 text-muted-foreground" />
          )}

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{isDragging ? "Upuść zdjęcie" : "Dodaj zdjęcie"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Przeciągnij lub kliknij, aby wybrać</p>
            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG lub WebP, max 10MB</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {(state.error || error) && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{state.error || error}</span>
        </div>
      )}
    </div>
  );
});
