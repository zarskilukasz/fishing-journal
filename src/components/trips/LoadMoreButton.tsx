import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

/**
 * Button for loading more trips (desktop pagination).
 */
export const LoadMoreButton = React.memo(function LoadMoreButton({
  onClick,
  isLoading,
  disabled = false,
}: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center py-4">
      <Button variant="secondary" onClick={onClick} disabled={disabled || isLoading} className="min-w-[160px]">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Ładowanie...</span>
          </>
        ) : (
          <span>Załaduj więcej</span>
        )}
      </Button>
    </div>
  );
});
