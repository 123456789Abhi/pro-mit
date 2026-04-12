"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log server-side errors only
    if (error?.message) {
      console.error("[Auth Error]", error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 mb-6">
          <svg
            className="w-6 h-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-heading font-semibold text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {error?.message ?? "An unexpected error occurred during authentication."}
        </p>
        <Button onClick={reset} className="w-full">
          Try again
        </Button>
        <p className="text-sm text-text-muted mt-4">
          <a href="/auth/login" className="text-brand hover:text-brand/80 transition-colors">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
