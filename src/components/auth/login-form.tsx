"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { login } from "@/lib/supabase/auth-actions";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Authentication failed. Please try again.",
  account_not_found: "Account not found. Please contact support.",
  account_deactivated: "Your account has been deactivated.",
  invalid_role: "Invalid account role. Please contact support.",
};

function getErrorMessage(searchParams: URLSearchParams): string | null {
  const error = searchParams.get("error");
  if (!error) {return null;}
  return ERROR_MESSAGES[error] ?? "Authentication failed. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Show error from redirect params (only once)
  useEffect(() => {
    const errorMsg = getErrorMessage(searchParams);
    if (errorMsg) {
      toast.error(errorMsg);
      // Clean URL without re-rendering
      router.replace("/auth/login");
    }

    // Capture redirectTo from URL params
    const rt = searchParams.get("redirectTo");
    if (rt) {setRedirectTo(rt);}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await login(formData);

      if (result.success) {
        toast.success("Welcome back!");
        // Use a regular redirect instead of window.location.href to a hardcoded path.
        // The middleware will intercept the navigation and redirect to the
        // correct role-based dashboard based on the user's role from public.users.
        const destination = redirectTo ?? "/";
        router.push(destination as any);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo & Branding */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-4">
          <GraduationCap className="w-7 h-7 text-brand" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-text-primary">
          Lernen
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Sign in to your admin panel
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <a
                href="/auth/reset-password"
                className="text-sm text-brand hover:text-brand/80 transition-colors"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isPending}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-text-muted mt-6">
        Powered by{" "}
        <span className="font-medium text-text-secondary">Lernen EdTech</span>
      </p>
    </div>
  );
}
