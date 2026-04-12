"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="rounded-full bg-danger-bg p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Failed to load school details
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        {error.message || "An unexpected error occurred while loading the school data."}
      </p>
      <Button
        onClick={reset}
        className="gap-2"
        variant="default"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
