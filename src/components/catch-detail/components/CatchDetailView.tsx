/**
 * CatchDetailView - Main container for catch details functionality.
 * React island that manages loading, error states, and content rendering.
 */
import React, { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers";
import { useCatchDetail } from "../hooks/useCatchDetail";
import { CatchDetailLoading } from "./CatchDetailLoading";
import { CatchDetailError } from "./CatchDetailError";
import { CatchDetailContent } from "./CatchDetailContent";
import { CatchFormDialog } from "@/components/catches/CatchFormDialog";
import type { CatchDetailViewProps } from "../types";
import type { CatchDto } from "@/types";

/**
 * Inner component that uses the hook (must be inside QueryProvider)
 */
function CatchDetailViewInner({ catchId }: CatchDetailViewProps) {
  const queryClient = useQueryClient();
  const { state, actions } = useCatchDetail(catchId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Handle edit dialog open
  const handleEdit = useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  // Handle successful edit
  const handleEditSuccess = useCallback(
    async (updatedCatch: CatchDto) => {
      // Invalidate catch query to refresh data
      await queryClient.invalidateQueries({ queryKey: ["catch", "detail", catchId] });
      await actions.refresh();
    },
    [queryClient, catchId, actions]
  );

  // Loading state
  if (state.isLoading) {
    return <CatchDetailLoading />;
  }

  // Error state
  if (state.error) {
    return <CatchDetailError error={state.error} onRetry={actions.refresh} />;
  }

  // No catch found (shouldn't happen if API returns 404 correctly)
  if (!state.catch) {
    return (
      <CatchDetailError
        error={{ code: "not_found", message: "Połów nie został znaleziony" }}
        onRetry={actions.refresh}
      />
    );
  }

  // Build CatchDto for edit form
  const catchDto: CatchDto = {
    id: state.catch.id,
    trip_id: state.catch.tripId,
    species_id: state.catch.speciesId,
    lure_id: state.catch.lureId,
    groundbait_id: state.catch.groundbaitId,
    caught_at: state.catch.caughtAt,
    weight_g: state.catch.weightG,
    length_mm: state.catch.lengthMm,
    photo_path: state.catch.photoPath,
    lure_name_snapshot: state.catch.lureName,
    groundbait_name_snapshot: state.catch.groundbaitName,
    created_at: "", // Not needed for edit form
    updated_at: "", // Not needed for edit form
  };

  return (
    <>
      <CatchDetailContent
        catch={state.catch}
        onEdit={handleEdit}
        onDelete={actions.deleteCatch}
        isDeleting={state.isDeleting}
      />

      {/* Edit Dialog - only render when open to avoid usePhotoUpload infinite loop */}
      {isEditDialogOpen && state.catch.tripStartedAt && (
        <CatchFormDialog
          tripId={state.catch.tripId}
          tripStartedAt={state.catch.tripStartedAt}
          tripEndedAt={state.catch.tripEndedAt}
          existingCatch={catchDto}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

/**
 * Main CatchDetailView component - wraps content with QueryProvider
 */
export function CatchDetailView({ catchId }: CatchDetailViewProps) {
  return (
    <QueryProvider>
      <CatchDetailViewInner catchId={catchId} />
    </QueryProvider>
  );
}

export type { CatchDetailViewProps };
