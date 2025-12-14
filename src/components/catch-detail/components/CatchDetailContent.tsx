/**
 * CatchDetailContent - Main content layout for catch details.
 * Composes header, photo, info, and equipment sections.
 */
import { CatchDetailHeader } from "./CatchDetailHeader";
import { CatchPhotoSection } from "./CatchPhotoSection";
import { CatchInfoSection } from "./CatchInfoSection";
import { EquipmentSection } from "./EquipmentSection";
import type { CatchDetailContentProps } from "../types";

/**
 * Content component composing all sections.
 */
export function CatchDetailContent({ catch: catchData, onEdit, onDelete, isDeleting }: CatchDetailContentProps) {
  return (
    <div className="space-y-6 pb-24">
      <CatchDetailHeader
        speciesName={catchData.speciesName}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />

      <CatchInfoSection
        speciesName={catchData.speciesName}
        caughtAt={catchData.caughtAt}
        caughtAtFormatted={catchData.caughtAtFormatted}
        weightG={catchData.weightG}
        weightFormatted={catchData.weightFormatted}
        lengthMm={catchData.lengthMm}
        lengthFormatted={catchData.lengthFormatted}
      />

      <EquipmentSection lureName={catchData.lureName} groundbaitName={catchData.groundbaitName} />

      <CatchPhotoSection photoUrl={catchData.photoUrl} speciesName={catchData.speciesName} />
    </div>
  );
}
