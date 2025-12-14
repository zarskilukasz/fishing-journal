/**
 * Barrel exports for custom hooks.
 */
export { useBreakpoint } from "./useBreakpoint";
export { useActiveSection } from "./useActiveSection";
export { useTheme } from "./useTheme";
export { useMediaQuery, useIsMobile, useIsDesktop, MEDIA_QUERIES } from "./useMediaQuery";
export { useTripList, tripQueryKeys, type UseTripListOptions, type UseTripListReturn } from "./useTripList";
export { useQuickStartTrip, type UseQuickStartTripOptions, type UseQuickStartTripReturn } from "./useQuickStartTrip";

// Catch form hooks
export { useCatchSelectData, catchSelectQueryKeys, type UseCatchSelectDataReturn } from "./useCatchSelectData";
export { useCatchForm, type UseCatchFormOptions, type UseCatchFormReturn } from "./useCatchForm";
export { usePhotoUpload, type UsePhotoUploadReturn } from "./usePhotoUpload";

// Equipment hooks
export { useDebounce } from "./useDebounce";
export {
  useEquipmentList,
  equipmentQueryKeys,
  type UseEquipmentListOptions,
  type UseEquipmentListReturn,
} from "./useEquipmentList";
export {
  useEquipmentMutations,
  type UseEquipmentMutationsOptions,
  type UseEquipmentMutationsReturn,
} from "./useEquipmentMutations";
