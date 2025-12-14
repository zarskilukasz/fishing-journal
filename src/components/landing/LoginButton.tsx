import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  authUrl?: string;
  className?: string;
}

/**
 * Login button for landing page - Geist style
 * Primary button with glow effect on hover
 */
export function LoginButton({ authUrl = "/auth/login", className }: LoginButtonProps) {
  const handleClick = () => {
    window.location.href = authUrl;
  };

  return (
    <Button size="lg" onClick={handleClick} className={className}>
      Zaloguj się
    </Button>
  );
}
