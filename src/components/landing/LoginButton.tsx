import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  authUrl?: string;
  className?: string;
}

export function LoginButton({ authUrl = "/auth/login", className }: LoginButtonProps) {
  const handleClick = () => {
    window.location.href = authUrl;
  };

  // Flat Filled Button - no shadow, vibrant color
  return (
    <Button
      size="lg"
      onClick={handleClick}
      className={`rounded-full px-8 transition-colors duration-150 active:scale-[0.98] ${className ?? ""}`}
    >
      Zaloguj się
    </Button>
  );
}
