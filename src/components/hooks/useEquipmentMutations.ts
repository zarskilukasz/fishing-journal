/**
 * Custom hook for equipment CRUD mutations.
 * Provides create, update, and delete operations with cache invalidation.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEquipment, updateEquipment, deleteEquipment, EquipmentApiError } from "@/lib/api/equipment";
import type { EquipmentType, EquipmentDto } from "@/components/equipment/types";
import type { CreateEquipmentCommand, UpdateEquipmentCommand } from "@/types";

/**
 * Options for useEquipmentMutations hook
 */
export interface UseEquipmentMutationsOptions {
  type: EquipmentType;
  onCreateSuccess?: (item: EquipmentDto) => void;
  onUpdateSuccess?: (item: EquipmentDto) => void;
  onDeleteSuccess?: () => void;
  onError?: (error: EquipmentApiError) => void;
}

/**
 * Return type for useEquipmentMutations hook
 */
export interface UseEquipmentMutationsReturn {
  /** Create mutation */
  create: {
    mutate: (data: CreateEquipmentCommand) => void;
    mutateAsync: (data: CreateEquipmentCommand) => Promise<EquipmentDto>;
    isPending: boolean;
    error: EquipmentApiError | null;
    reset: () => void;
  };
  /** Update mutation */
  update: {
    mutate: (params: { id: string; data: UpdateEquipmentCommand }) => void;
    mutateAsync: (params: { id: string; data: UpdateEquipmentCommand }) => Promise<EquipmentDto>;
    isPending: boolean;
    error: EquipmentApiError | null;
    reset: () => void;
  };
  /** Delete mutation */
  delete: {
    mutate: (id: string) => void;
    mutateAsync: (id: string) => Promise<void>;
    isPending: boolean;
    error: EquipmentApiError | null;
    reset: () => void;
  };
}

/**
 * Hook for equipment CRUD mutations with cache invalidation.
 */
export function useEquipmentMutations(options: UseEquipmentMutationsOptions): UseEquipmentMutationsReturn {
  const { type, onCreateSuccess, onUpdateSuccess, onDeleteSuccess, onError } = options;
  const queryClient = useQueryClient();

  /**
   * Invalidate all equipment lists for the current type
   */
  const invalidateEquipmentList = () => {
    queryClient.invalidateQueries({
      queryKey: ["equipment", type],
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateEquipmentCommand) => createEquipment(type, data),
    onSuccess: (item) => {
      invalidateEquipmentList();
      onCreateSuccess?.(item);
    },
    onError: (error: EquipmentApiError) => {
      onError?.(error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentCommand }) => updateEquipment(type, id, data),
    onSuccess: (item) => {
      invalidateEquipmentList();
      onUpdateSuccess?.(item);
    },
    onError: (error: EquipmentApiError) => {
      onError?.(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEquipment(type, id),
    onSuccess: () => {
      invalidateEquipmentList();
      onDeleteSuccess?.();
    },
    onError: (error: EquipmentApiError) => {
      onError?.(error);
    },
  });

  return {
    create: {
      mutate: createMutation.mutate,
      mutateAsync: createMutation.mutateAsync,
      isPending: createMutation.isPending,
      error: createMutation.error as EquipmentApiError | null,
      reset: createMutation.reset,
    },
    update: {
      mutate: updateMutation.mutate,
      mutateAsync: updateMutation.mutateAsync,
      isPending: updateMutation.isPending,
      error: updateMutation.error as EquipmentApiError | null,
      reset: updateMutation.reset,
    },
    delete: {
      mutate: deleteMutation.mutate,
      mutateAsync: deleteMutation.mutateAsync,
      isPending: deleteMutation.isPending,
      error: deleteMutation.error as EquipmentApiError | null,
      reset: deleteMutation.reset,
    },
  };
}
