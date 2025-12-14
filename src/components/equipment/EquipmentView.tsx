/**
 * EquipmentView - Main container for equipment management view.
 * Manages tabs, dialogs, and coordinates child components.
 */
import React, { useState, useCallback, useMemo } from "react";
import { QueryProvider } from "@/components/providers";
import { EquipmentTabs } from "./EquipmentTabs";
import { EquipmentToolbar } from "./EquipmentToolbar";
import { EquipmentListContainer } from "./EquipmentListContainer";
import { EquipmentFormDialog } from "./EquipmentFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useDebounce, useEquipmentList, useEquipmentMutations } from "@/components/hooks";
import type { EquipmentApiError } from "@/lib/api/equipment";
import type { EquipmentType, EquipmentDto, EquipmentFormValues, FormDialogState, DeleteDialogState } from "./types";

export interface EquipmentViewProps {
  initialTab?: EquipmentType;
}

/**
 * Parse error for form display.
 */
function parseFormError(error: EquipmentApiError | null): string | null {
  if (!error) return null;

  if (error.code === "conflict") {
    return "Element o tej nazwie już istnieje";
  }

  if (error.code === "validation_error") {
    return error.message;
  }

  return "Wystąpił błąd. Spróbuj ponownie";
}

/**
 * Main equipment view component.
 * Wraps content in QueryProvider for TanStack Query support.
 */
export function EquipmentView({ initialTab = "rods" }: EquipmentViewProps) {
  return (
    <QueryProvider>
      <EquipmentViewContent initialTab={initialTab} />
    </QueryProvider>
  );
}

/**
 * Internal component with the actual equipment view logic.
 */
function EquipmentViewContent({ initialTab = "rods" }: EquipmentViewProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<EquipmentType>(initialTab);

  // Search state with debounce
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Form dialog state
  const [formDialog, setFormDialog] = useState<FormDialogState>({
    isOpen: false,
    editItem: null,
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    item: null,
  });

  // List query
  const listQuery = useEquipmentList({
    type: activeTab,
    searchQuery: debouncedSearchQuery,
    limit: 20,
  });

  // Mutations
  const mutations = useEquipmentMutations({
    type: activeTab,
    onCreateSuccess: () => {
      closeFormDialog();
    },
    onUpdateSuccess: () => {
      closeFormDialog();
    },
    onDeleteSuccess: () => {
      closeDeleteDialog();
    },
  });

  // Tab change handler - reset search when changing tabs
  const handleTabChange = useCallback((tab: EquipmentType) => {
    setActiveTab(tab);
    setSearchQuery("");
  }, []);

  // Form dialog handlers
  const openFormDialogForCreate = useCallback(() => {
    mutations.create.reset();
    mutations.update.reset();
    setFormDialog({ isOpen: true, editItem: null });
  }, [mutations.create, mutations.update]);

  const openFormDialogForEdit = useCallback(
    (item: EquipmentDto) => {
      mutations.create.reset();
      mutations.update.reset();
      setFormDialog({ isOpen: true, editItem: item });
    },
    [mutations.create, mutations.update]
  );

  const closeFormDialog = useCallback(() => {
    setFormDialog({ isOpen: false, editItem: null });
  }, []);

  // Delete dialog handlers
  const openDeleteDialog = useCallback(
    (item: EquipmentDto) => {
      mutations.delete.reset();
      setDeleteDialog({ isOpen: true, item });
    },
    [mutations.delete]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false, item: null });
  }, []);

  // Form submit handler
  const handleFormSubmit = useCallback(
    async (data: EquipmentFormValues) => {
      if (formDialog.editItem) {
        await mutations.update.mutateAsync({
          id: formDialog.editItem.id,
          data: { name: data.name },
        });
      } else {
        await mutations.create.mutateAsync({ name: data.name });
      }
    },
    [formDialog.editItem, mutations.create, mutations.update]
  );

  // Delete confirm handler
  const handleDeleteConfirm = useCallback(() => {
    if (deleteDialog.item) {
      mutations.delete.mutate(deleteDialog.item.id);
    }
  }, [deleteDialog.item, mutations.delete]);

  // Form error
  const formError = useMemo(() => {
    const error = formDialog.editItem ? mutations.update.error : mutations.create.error;
    return parseFormError(error);
  }, [formDialog.editItem, mutations.create.error, mutations.update.error]);

  // Is form submitting
  const isFormSubmitting = formDialog.editItem ? mutations.update.isPending : mutations.create.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <EquipmentTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Toolbar */}
      <EquipmentToolbar
        equipmentType={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={openFormDialogForCreate}
        isLoading={listQuery.isLoading}
      />

      {/* List */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        <EquipmentListContainer
          equipmentType={activeTab}
          items={listQuery.items}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error}
          isFetchingNextPage={listQuery.isFetchingNextPage}
          hasNextPage={listQuery.hasNextPage}
          searchQuery={debouncedSearchQuery}
          onLoadMore={listQuery.fetchNextPage}
          onEdit={openFormDialogForEdit}
          onDelete={openDeleteDialog}
          onAddClick={openFormDialogForCreate}
          onRetry={listQuery.refetch}
        />
      </div>

      {/* Form Dialog */}
      <EquipmentFormDialog
        isOpen={formDialog.isOpen}
        onClose={closeFormDialog}
        equipmentType={activeTab}
        editItem={formDialog.editItem}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
        error={formError}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        item={deleteDialog.item}
        onCancel={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        isDeleting={mutations.delete.isPending}
      />
    </div>
  );
}
