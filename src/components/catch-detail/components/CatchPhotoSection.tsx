/**
 * CatchPhotoSection - Displays catch photo or placeholder.
 * Shows large photo with aspect ratio 4:3 or fish icon placeholder.
 */
import React from "react";
import { Fish } from "lucide-react";
import type { CatchPhotoSectionProps } from "../types";

/**
 * Photo section component with image or placeholder.
 */
export function CatchPhotoSection({ photoUrl, speciesName }: CatchPhotoSectionProps) {
  if (photoUrl) {
    return (
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary">
        <img
          src={photoUrl}
          alt={`Zdjęcie połowu: ${speciesName}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Placeholder when no photo
  return (
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
      <div className="text-center">
        <Fish className="h-16 w-16 text-muted-foreground mx-auto" aria-hidden="true" />
        <p className="mt-2 text-sm text-muted-foreground">Brak zdjęcia</p>
      </div>
    </div>
  );
}
