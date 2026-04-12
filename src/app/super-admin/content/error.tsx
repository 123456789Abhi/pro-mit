"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

/**
 * Error boundary for the Content Pipeline page.
 * Displays when server components or server actions throw.
 */
export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
      {/* Error Icon */}
      <div className="rounded-full bg-danger-bg p-4">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>

      {/* Error Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-primary">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-text-secondary">
          {error.message || "Failed to load the Content Pipeline page."}
        </p>
        {process.env.NODE_ENV === "development" && error.stack && (
          <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-surface-2 p-4 text-left text-xs text-danger">
            {error.stack}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/super-admin"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-1 px-4 text-sm font-medium text-text-primary hover:bg-surface-2"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Help Text */}
      <p className="text-xs text-text-muted">
        If this problem persists, please contact support.
      </p>
    </div>
  );
}
