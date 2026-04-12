export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 skeleton rounded-lg" />
          <div className="h-5 w-48 skeleton rounded" />
        </div>
        <div className="h-8 w-24 skeleton rounded-full" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-32 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>

        {/* Tab Content Skeleton */}
        <div className="rounded-lg border border-border bg-surface-1 p-6 space-y-6">
          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-24 skeleton rounded-lg" />
            <div className="h-24 skeleton rounded-lg" />
            <div className="h-24 skeleton rounded-lg" />
            <div className="h-24 skeleton rounded-lg" />
          </div>

          {/* Main Content Area */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 skeleton rounded-lg" />
              <div className="h-40 skeleton rounded-lg" />
            </div>
            <div className="space-y-4">
              <div className="h-40 skeleton rounded-lg" />
              <div className="h-40 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
