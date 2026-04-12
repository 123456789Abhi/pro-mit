import { Loader2 } from "lucide-react";

/**
 * Loading skeleton for the Content Pipeline page.
 * Shown while the server component fetches initial data.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-surface-2" />
        <div className="h-4 w-72 rounded bg-surface-2" />
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="flex gap-1 border-b border-border pb-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-10 w-28 rounded-md bg-surface-2" />
        ))}
      </div>

      {/* Content Skeleton - Library Tab */}
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-24 rounded-lg border border-border bg-surface-1 p-4">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="mt-3 h-8 w-16 rounded bg-surface-2" />
          </div>
          <div className="h-24 rounded-lg border border-border bg-surface-1 p-4">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="mt-3 h-8 w-16 rounded bg-surface-2" />
          </div>
          <div className="h-24 rounded-lg border border-border bg-surface-1 p-4">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="mt-3 h-8 w-16 rounded bg-surface-2" />
          </div>
          <div className="h-24 rounded-lg border border-border bg-surface-1 p-4">
            <div className="h-4 w-24 rounded bg-surface-2" />
            <div className="mt-3 h-8 w-16 rounded bg-surface-2" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-1 p-4">
          <div className="h-10 w-32 rounded-md bg-surface-2" />
          <div className="h-10 w-36 rounded-md bg-surface-2" />
          <div className="h-10 w-28 rounded-md bg-surface-2" />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="border-b border-border bg-surface-1 p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div key={i} className="h-4 w-16 rounded bg-surface-2" />
              ))}
            </div>
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 flex-1 rounded bg-surface-2" />
                <div className="h-4 w-16 rounded bg-surface-2" />
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-4 w-12 rounded bg-surface-2" />
                <div className="h-4 w-12 rounded bg-surface-2" />
                <div className="h-4 w-12 rounded bg-surface-2" />
                <div className="h-4 w-24 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Centered Loader */}
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    </div>
  );
}
