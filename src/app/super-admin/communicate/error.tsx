"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CommunicateErrorProps {
  error: Error;
  reset: () => void;
}

export default function CommunicateError({ error, reset }: CommunicateErrorProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-bg border border-danger/30">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>

            {/* Error Title */}
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Failed to load Communicate
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {error.message || "An unexpected error occurred"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={reset} className="w-full">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/super-admin";
                  }
                }}
                className="w-full"
              >
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>

            {/* Debug info (dev only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 rounded-lg bg-surface-2 text-left">
                <p className="text-xs font-mono text-danger break-all">
                  {error.stack}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
