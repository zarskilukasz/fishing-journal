/**
 * Profile components public exports.
 */

// Main view component
export { ProfileView } from "./ProfileView";

// Sub-components
export { ProfileHeader } from "./ProfileHeader";
export { UserInfo } from "./UserInfo";
export { LogoutButton } from "./LogoutButton";
export { LogoutConfirmDialog } from "./LogoutConfirmDialog";

// Hook
export { useLogout } from "./useLogout";

// Types
export type * from "./types";
