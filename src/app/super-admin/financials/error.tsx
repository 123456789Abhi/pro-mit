"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Financials page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
      <Card className="max-w-md border-danger/50">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-danger-bg rounded-full">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Something went wrong
          </h2>

          <p className="text-text-secondary mb-4">
            We couldn&apos;t load the Financials page. Please try again.
          </p>

          {error.digest && (
            <p className="text-xs text-text-muted mb-4">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => window.location.href = "/super-admin"}>
              Go Back
            </Button>
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-text-muted">
        If this problem persists, please contact support.
      </p>
    </div>
  );
}
