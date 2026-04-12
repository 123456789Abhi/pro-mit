export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-96 animate-pulse rounded bg-surface-2" />
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 animate-pulse rounded-lg bg-surface-2"
            />
          ))}
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-surface-2" />
                <div className="h-6 w-12 rounded bg-surface-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-4">
        <div className="h-10 w-full max-w-xs animate-pulse rounded-lg bg-surface-2" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-surface-2" />
      </div>

      {/* Alert List Skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface-1 p-4 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-5 w-64 rounded bg-surface-2" />
                  <div className="h-5 w-20 rounded-full bg-surface-2" />
                </div>
                <div className="h-4 w-full rounded bg-surface-2" />
                <div className="h-3 w-48 rounded bg-surface-2" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-lg bg-surface-2" />
                <div className="h-8 w-8 rounded-lg bg-surface-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton (for other tabs) */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="bg-surface-2">
          <div className="flex gap-4 border-b border-border p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-20 animate-pulse rounded bg-surface-3" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border bg-surface-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 flex-1 animate-pulse rounded bg-surface-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
