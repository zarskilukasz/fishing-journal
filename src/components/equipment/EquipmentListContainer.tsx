/**
 * EquipmentListContainer - Container managing list display, loading, empty state, and pagination.
 */
import React, { useCallback } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EquipmentList } from "./EquipmentList";
import { EmptyState } from "./EmptyState";
import { useIsMobile } from "@/components/hooks";
import type { EquipmentType, EquipmentDto } from "./types";

export interface EquipmentListContainerProps {
  equipmentType: EquipmentType;
  items: EquipmentDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  searchQuery: string;
  onLoadMore: () => void;
  onEdit: (item: EquipmentDto) => void;
  onDelete: (item: EquipmentDto) => void;
  onAddClick: () => void;
  onRetry: () => void;
}

/**
 * Skeleton loader for equipment items.
 */
function SkeletonList() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-secondary rounded" />
              <div className="h-3 w-1/2 bg-secondary rounded" />
            </div>
            <div className="flex gap-1">
              <div className="h-8 w-8 bg-secondary rounded" />
              <div className="h-8 w-8 bg-secondary rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-medium text-foreground">Błąd</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} variant="secondary" className="mt-4">
        Spróbuj ponownie
      </Button>
    </div>
  );
}

/**
 * Infinite scroll trigger for mobile.
 */
function InfiniteScrollTrigger({ onIntersect, isLoading }: { onIntersect: () => void; isLoading: boolean }) {
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onIntersect();
        }
      },
      { rootMargin: "100px", threshold: 0 }
    );

    const current = triggerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [onIntersect, isLoading]);

  return (
    <div ref={triggerRef} className="flex justify-center py-4" aria-hidden="true">
      {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </div>
  );
}

/**
 * Equipment list container with all states.
 */
export const EquipmentListContainer = React.memo(function EquipmentListContainer({
  equipmentType,
  items,
  isLoading,
  isError,
  error,
  isFetchingNextPage,
  hasNextPage,
  searchQuery,
  onLoadMore,
  onEdit,
  onDelete,
  onAddClick,
  onRetry,
}: EquipmentListContainerProps) {
  const isMobile = useIsMobile();

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Loading state
  if (isLoading) {
    return <SkeletonList />;
  }

  // Error state
  if (isError) {
    return <ErrorState message={error?.message || "Nie udało się załadować listy"} onRetry={onRetry} />;
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyState equipmentType={equipmentType} hasSearchQuery={searchQuery.length > 0} onAddClick={onAddClick} />;
  }

  // List with pagination
  return (
    <div>
      <EquipmentList items={items} onEdit={onEdit} onDelete={onDelete} />

      {/* Pagination */}
      {hasNextPage &&
        (isMobile ? (
          <InfiniteScrollTrigger onIntersect={handleLoadMore} isLoading={isFetchingNextPage} />
        ) : (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={handleLoadMore} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isFetchingNextPage ? "Ładowanie..." : "Załaduj więcej"}
            </Button>
          </div>
        ))}
    </div>
  );
});
