/**
 * TripActionsContext - Context for sharing trip actions across components.
 * Provides access to tripId, available actions, and action handlers.
 */
import { createContext, useContext } from "react";
import type { TripActions } from "../types";

interface TripActionsContextValue {
  tripId: string;
  actions: TripActions;
  closeTrip: () => Promise<void>;
  deleteTrip: () => Promise<void>;
  isClosing: boolean;
  isDeleting: boolean;
}

const TripActionsContext = createContext<TripActionsContextValue | null>(null);

/**
 * Hook to access trip actions from context.
 * Must be used within TripActionsProvider.
 */
export function useTripActions(): TripActionsContextValue {
  const context = useContext(TripActionsContext);
  if (!context) {
    throw new Error("useTripActions must be used within TripActionsProvider");
  }
  return context;
}

export const TripActionsProvider = TripActionsContext.Provider;
