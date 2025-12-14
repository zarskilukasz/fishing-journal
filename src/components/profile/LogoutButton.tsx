/**
 * LogoutButton - Outlined button for initiating logout.
 * Opens confirmation dialog when clicked.
 */
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LogoutButtonProps } from "./types";

/**
 * Logout button component.
 * Uses outline variant with logout icon.
 */
export function LogoutButton({ onClick, disabled = false }: LogoutButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled} className="w-full sm:w-auto">
      <LogOut className="w-4 h-4" aria-hidden="true" />
      Wyloguj się
    </Button>
  );
}
