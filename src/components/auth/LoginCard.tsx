import { useState, useCallback } from "react";
import { Fish } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/db/supabase.browser";
import { loginSchema, type LoginFormData, type LoginFormErrors } from "./schemas/login.schema";
import { mapAuthError } from "./utils/auth-error-mapper";

interface LoginCardProps {
  redirectTo?: string;
}

interface FormErrors extends LoginFormErrors {
  general?: string;
}

/**
 * Login card component - Geist style
 * Dark card with subtle border
 */
export function LoginCard({ redirectTo = "/app" }: LoginCardProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback((): boolean => {
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
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
        setErrors({ general: mapAuthError(error) });
        return;
      }

      window.location.href = redirectTo;
    } catch {
      setErrors({ general: mapAuthError(null) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Card with gradient border effect */}
      <div className="gradient-border">
        <div className="bg-card rounded-lg border border-border p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center gap-4">
            {/* Logo */}
            <a
              href="/"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              aria-label="Powrót do strony głównej"
            >
              <Fish className="h-6 w-6" />
            </a>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">Zaloguj się</h1>
              <p className="mt-1 text-sm text-muted-foreground">Witaj z powrotem</p>
            </div>
          </div>

          {/* Error message */}
          {errors.general && (
            <div
              className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
              role="alert"
            >
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange("email")}
                disabled={isSubmitting}
                placeholder="jan@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange("password")}
                disabled={isSubmitting}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Powrót do strony głównej
        </a>
      </div>
    </div>
  );
}
