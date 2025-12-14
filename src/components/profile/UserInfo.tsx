/**
 * UserInfo - Displays user information in MD3 List Item style.
 * Shows user avatar/icon and email address.
 */
import { User } from "lucide-react";
import type { UserInfoProps } from "./types";

/**
 * User information display component.
 * Shows avatar placeholder and email in a card-like container.
 */
export function UserInfo({ email }: UserInfoProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:bg-card-hover hover:border-border-hover transition-all duration-200">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
        <User className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">Email</span>
        <p className="text-sm font-medium truncate">{email}</p>
      </div>
    </div>
  );
}
