import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export interface InfiniteScrollTriggerProps {
  onIntersect: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * Invisible element that triggers pagination when scrolled into view.
 * Uses IntersectionObserver for efficient scroll detection.
 */
export const InfiniteScrollTrigger = React.memo(function InfiniteScrollTrigger({
  onIntersect,
  disabled = false,
  isLoading = false,
}: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !disabled) {
          onIntersect();
        }
      },
      {
        root: null,
        rootMargin: "100px", // Trigger 100px before element is visible
        threshold: 0,
      }
    );

    const currentRef = triggerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onIntersect, disabled]);

  return (
    <div ref={triggerRef} className="flex justify-center py-4" aria-hidden="true">
      {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
});
