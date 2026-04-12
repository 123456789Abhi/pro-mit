"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error("Operations page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 rounded-full bg-danger/10 p-4">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-text-primary">
        Something went wrong
      </h2>

      <p className="mb-6 max-w-md text-sm text-text-secondary">
        We encountered an error loading the Operations page. This has been
        logged and our team will investigate.
      </p>

      {process.env.NODE_ENV === "development" && (
        <div className="mb-6 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface-1 text-left">
          <div className="border-b border-border bg-surface-2 px-4 py-2">
            <span className="text-xs font-medium text-text-muted">Error Details</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs text-danger">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="btn-touch flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-info/80"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>

        <button
          onClick={() => {
            // Navigate to a safe page
            window.location.href = "/super-admin";
          }}
          className="btn-touch rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
