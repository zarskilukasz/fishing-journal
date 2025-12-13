import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/db/supabase.browser";

interface LoginCardProps {
  redirectTo?: string;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginCard({ redirectTo = "/app" }: LoginCardProps) {
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email jest wymagany";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Nieprawidłowy format email";
    }

    if (!formData.password) {
      newErrors.password = "Hasło jest wymagane";
    } else if (formData.password.length < 6) {
      newErrors.password = "Hasło musi mieć co najmniej 6 znaków";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrors({ general: "Nieprawidłowy email lub hasło" });
        } else if (error.message.includes("Email not confirmed")) {
          setErrors({ general: "Email nie został potwierdzony. Sprawdź swoją skrzynkę." });
        } else {
          setErrors({ general: "Wystąpił błąd podczas logowania. Spróbuj ponownie." });
        }
        return;
      }

      window.location.href = redirectTo;
    } catch {
      setErrors({ general: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Flat Card - border instead of shadow */}
      <div className="rounded-xl border border-border bg-card p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4">
          {/* Icon container - bold primary color */}
          <a
            href="/"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 transition-colors duration-200 hover:bg-primary/25 active:bg-primary/30"
            aria-label="Powrót do strony głównej"
          >
            <svg
              className="h-7 w-7 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6-3.56 0-7.56-2.53-8.5-6Z" />
              <path d="M18 12v.5" />
              <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
              <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5 .23 6.5C6.58 18.03 7 16 7 13.33" />
              <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" />
              <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />
            </svg>
          </a>
          <h1 className="text-2xl font-normal text-foreground">Zaloguj się</h1>
          <p className="text-sm text-muted-foreground">Witaj z powrotem</p>
        </div>

        {/* Error container */}
        {errors.general && (
          <div className="mb-6 rounded-lg bg-destructive/15 p-4 text-sm font-medium text-destructive" role="alert">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field - Outlined, focus ring without offset */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-medium tracking-wide text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              disabled={isSubmitting}
              className={`w-full rounded-lg border-2 bg-transparent px-4 py-3 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.email ? "border-destructive focus:ring-destructive/20" : "border-border"
              }`}
              placeholder="jan@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs font-medium text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-xs font-medium tracking-wide text-muted-foreground">
              Hasło
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange("password")}
              disabled={isSubmitting}
              className={`w-full rounded-lg border-2 bg-transparent px-4 py-3 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                errors.password ? "border-destructive focus:ring-destructive/20" : "border-border"
              }`}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-xs font-medium text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit button - flat, no shadow */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full rounded-full transition-colors duration-150 active:scale-[0.98]"
          >
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </div>

      {/* Back link */}
      <div className="mt-6 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-primary/8 hover:text-foreground"
        >
          ← Powrót do strony głównej
        </a>
      </div>
    </div>
  );
}
